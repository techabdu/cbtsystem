<?php

namespace Tests\Unit;

use App\Models\Exam;
use App\Models\ExamFeedback;
use App\Models\User;
use App\Services\Exam\ExamService;
use App\Services\Notification\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tests the ExamService workflow methods (pre-exam and post-exam pipelines).
 * ExamWorkflowService has been deleted — ExamService is the single canonical service.
 */
class ExamWorkflowServiceTest extends TestCase
{
    use RefreshDatabase;

    private ExamService $service;

    protected function setUp(): void
    {
        parent::setUp();

        // NotificationService is injected; resolve from container so real implementation
        // handles notifications without side-effects (try/catch in ExamService protects us).
        $this->service = app(ExamService::class);
    }

    private function makeUser(array $attrs = []): User
    {
        return User::factory()->create(['role' => 'lecturer', ...$attrs]);
    }

    private function makeExamWithQuestion(array $attrs = []): Exam
    {
        $exam = Exam::factory()->create($attrs);

        // ExamService.submitForReview requires at least 1 question
        $question = \App\Models\Question::factory()->create();
        \App\Models\ExamQuestion::create([
            'exam_id'     => $exam->id,
            'question_id' => $question->id,
            'question_order' => 1,
            'points'      => 2.00,
        ]);

        return $exam->fresh();
    }

    /* ------------------------------------------------------------------ */
    /*  submitForReview — draft → pending_review                           */
    /* ------------------------------------------------------------------ */

    public function test_submit_for_hod_review_transitions_draft_to_pending_review(): void
    {
        $exam = $this->makeExamWithQuestion(['status' => 'draft']);
        $user = $this->makeUser();

        $result = $this->service->submitForReview($exam, $user);

        $this->assertEquals('pending_review', $result->status);
    }

    public function test_submit_for_hod_review_throws_if_not_draft(): void
    {
        $exam = Exam::factory()->create(['status' => 'pending_review']);
        $user = $this->makeUser();

        $this->expectException(\RuntimeException::class);
        $this->service->submitForReview($exam, $user);
    }

    /* ------------------------------------------------------------------ */
    /*  verifyExam — pending_review → verified (HOD approves)             */
    /* ------------------------------------------------------------------ */

    public function test_verify_exam_transitions_pending_review_to_verified(): void
    {
        $exam = Exam::factory()->create(['status' => 'pending_review']);
        $user = $this->makeUser(['is_hod' => true]);

        $result = $this->service->verifyExam($exam, $user);

        $this->assertEquals('verified', $result->status);
    }

    public function test_verify_exam_throws_if_not_pending_review(): void
    {
        $exam = Exam::factory()->create(['status' => 'draft']);
        $user = $this->makeUser(['is_hod' => true]);

        $this->expectException(\RuntimeException::class);
        $this->service->verifyExam($exam, $user);
    }

    /* ------------------------------------------------------------------ */
    /*  rejectExam — pending_review/verified → draft                       */
    /* ------------------------------------------------------------------ */

    public function test_reject_exam_returns_to_draft_from_pending_review(): void
    {
        $exam     = Exam::factory()->create(['status' => 'pending_review']);
        $reviewer = $this->makeUser(['is_hod' => true]);

        $result = $this->service->rejectExam($exam, $reviewer, 'Questions are too easy.');

        $this->assertEquals('draft', $result->status);
    }

    public function test_reject_exam_returns_to_draft_from_verified(): void
    {
        $exam     = Exam::factory()->create(['status' => 'verified']);
        $reviewer = $this->makeUser(['is_school_exam_officer' => true]);

        $result = $this->service->rejectExam($exam, $reviewer, 'Needs more depth.');

        $this->assertEquals('draft', $result->status);
    }

    public function test_reject_exam_throws_if_draft(): void
    {
        $exam     = Exam::factory()->create(['status' => 'draft']);
        $reviewer = $this->makeUser();

        $this->expectException(\RuntimeException::class);
        $this->service->rejectExam($exam, $reviewer, 'Some comment');
    }

    /* ------------------------------------------------------------------ */
    /*  publish — verified → published (by School Officer or CBT)         */
    /* ------------------------------------------------------------------ */

    public function test_publish_transitions_verified_to_published(): void
    {
        $exam = Exam::factory()->create([
            'status'     => 'verified',
            'is_practice'=> false,
            'start_time' => now()->addDays(3),
            'end_time'   => now()->addDays(3)->addHours(2),
        ]);

        // Add a question so publish() passes the question-count check
        $q = \App\Models\Question::factory()->create();
        \App\Models\ExamQuestion::create(['exam_id' => $exam->id, 'question_id' => $q->id, 'question_order' => 1, 'points' => 2]);

        $user   = $this->makeUser(['role' => 'cbt']);
        $result = $this->service->publish($exam, $user);

        $this->assertEquals('published', $result->status);
    }

    public function test_publish_throws_if_not_verified(): void
    {
        $exam = Exam::factory()->create(['status' => 'draft']);
        $user = $this->makeUser(['role' => 'cbt']);

        $this->expectException(\RuntimeException::class);
        $this->service->publish($exam, $user);
    }

    /* ------------------------------------------------------------------ */
    /*  Post-exam: submitGrading                                           */
    /* ------------------------------------------------------------------ */

    public function test_submit_grading_transitions_results_status_to_grading_submitted(): void
    {
        $exam = Exam::factory()->published()->create(['results_status' => 'pending_grading']);
        $user = $this->makeUser();

        $result = $this->service->submitGrading($exam, $user);

        $this->assertEquals('grading_submitted', $result->results_status);
    }

    /* ------------------------------------------------------------------ */
    /*  Post-exam: verifyResults (Dept Officer approves)                   */
    /* ------------------------------------------------------------------ */

    public function test_verify_results_transitions_to_results_verified(): void
    {
        $exam = Exam::factory()->published()->create(['results_status' => 'grading_submitted']);
        $user = $this->makeUser(['is_department_exam_officer' => true]);

        $result = $this->service->verifyResults($exam, $user);

        $this->assertEquals('results_verified', $result->results_status);
    }

    /* ------------------------------------------------------------------ */
    /*  Post-exam: rejectGrading (Dept Officer rejects)                    */
    /* ------------------------------------------------------------------ */

    public function test_reject_grading_returns_to_pending_grading(): void
    {
        $exam     = Exam::factory()->published()->create(['results_status' => 'grading_submitted']);
        $reviewer = $this->makeUser(['is_department_exam_officer' => true]);

        $result = $this->service->rejectGrading($exam, $reviewer, 'Check question 5 grading.');

        $this->assertEquals('pending_grading', $result->results_status);
    }

    public function test_reject_grading_throws_if_wrong_status(): void
    {
        $exam     = Exam::factory()->published()->create(['results_status' => 'pending_grading']);
        $reviewer = $this->makeUser();

        $this->expectException(\RuntimeException::class);
        $this->service->rejectGrading($exam, $reviewer, 'Comment');
    }
}
