<?php

namespace Tests\Unit;

use App\Models\Exam;
use App\Models\ExamFeedback;
use App\Models\User;
use App\Services\ExamWorkflowService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamWorkflowServiceTest extends TestCase
{
    use RefreshDatabase;

    private ExamWorkflowService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ExamWorkflowService();
    }

    /* ------------------------------------------------------------------ */
    /*  Pre-Exam Workflow                                                  */
    /* ------------------------------------------------------------------ */

    public function test_submit_for_hod_review_transitions_draft_to_hod_review(): void
    {
        $exam = Exam::factory()->draft()->create();

        $result = $this->service->submitForHodReview($exam);

        $this->assertEquals('hod_review', $result->status);
    }

    public function test_submit_for_hod_review_throws_if_not_draft(): void
    {
        $exam = Exam::factory()->hodReview()->create();

        $this->expectException(\Exception::class);
        $this->service->submitForHodReview($exam);
    }

    public function test_approve_by_hod_transitions_to_school_officer_review(): void
    {
        $exam = Exam::factory()->hodReview()->create();

        $result = $this->service->approveByHod($exam);

        $this->assertEquals('school_officer_review', $result->status);
    }

    public function test_approve_by_hod_throws_if_not_hod_review(): void
    {
        $exam = Exam::factory()->draft()->create();

        $this->expectException(\Exception::class);
        $this->service->approveByHod($exam);
    }

    public function test_reject_by_hod_returns_exam_to_draft_and_creates_feedback(): void
    {
        $exam     = Exam::factory()->hodReview()->create();
        $reviewer = User::factory()->create(['role' => 'lecturer', 'is_hod' => true]);

        $result = $this->service->rejectByHod($exam, $reviewer, 'Questions are too easy.');

        $this->assertEquals('draft', $result->status);

        $this->assertDatabaseHas('exam_feedback', [
            'exam_id'  => $exam->id,
            'user_id'  => $reviewer->id,
            'stage'    => 'pre_exam_hod_review',
            'comments' => 'Questions are too easy.',
        ]);
    }

    public function test_reject_by_hod_throws_if_not_hod_review(): void
    {
        $exam     = Exam::factory()->draft()->create();
        $reviewer = User::factory()->create(['role' => 'lecturer']);

        $this->expectException(\Exception::class);
        $this->service->rejectByHod($exam, $reviewer, 'Some comment');
    }

    public function test_approve_by_school_officer_transitions_to_cbt_setup(): void
    {
        $exam = Exam::factory()->create(['status' => 'school_officer_review']);

        $result = $this->service->approveBySchoolOfficer($exam);

        $this->assertEquals('cbt_setup', $result->status);
    }

    public function test_approve_by_school_officer_throws_if_wrong_status(): void
    {
        $exam = Exam::factory()->draft()->create();

        $this->expectException(\Exception::class);
        $this->service->approveBySchoolOfficer($exam);
    }

    public function test_reject_by_school_officer_returns_to_draft_and_creates_feedback(): void
    {
        $exam     = Exam::factory()->create(['status' => 'school_officer_review']);
        $reviewer = User::factory()->create(['role' => 'lecturer', 'is_school_exam_officer' => true]);

        $result = $this->service->rejectBySchoolOfficer($exam, $reviewer, 'Needs more questions.');

        $this->assertEquals('draft', $result->status);

        $this->assertDatabaseHas('exam_feedback', [
            'exam_id'  => $exam->id,
            'stage'    => 'pre_exam_school_officer_review',
            'comments' => 'Needs more questions.',
        ]);
    }

    public function test_publish_by_cbt_transitions_cbt_setup_to_published(): void
    {
        $exam = Exam::factory()->create(['status' => 'cbt_setup']);

        $result = $this->service->publishByCbt($exam);

        $this->assertEquals('published', $result->status);
    }

    public function test_publish_by_cbt_throws_if_not_cbt_setup(): void
    {
        $exam = Exam::factory()->draft()->create();

        $this->expectException(\Exception::class);
        $this->service->publishByCbt($exam);
    }

    /* ------------------------------------------------------------------ */
    /*  Post-Exam Workflow                                                 */
    /* ------------------------------------------------------------------ */

    public function test_sync_results_transitions_published_to_grading(): void
    {
        $exam = Exam::factory()->published()->create();

        $result = $this->service->syncResultsByCbt($exam);

        $this->assertEquals('grading', $result->status);
    }

    public function test_sync_results_throws_if_not_published(): void
    {
        $exam = Exam::factory()->draft()->create();

        $this->expectException(\Exception::class);
        $this->service->syncResultsByCbt($exam);
    }

    public function test_submit_grading_transitions_grading_to_grading_review(): void
    {
        $exam = Exam::factory()->create(['status' => 'grading']);

        $result = $this->service->submitGrading($exam);

        $this->assertEquals('grading_review', $result->status);
    }

    public function test_approve_grading_by_dept_officer_transitions_to_results_published(): void
    {
        $exam = Exam::factory()->create(['status' => 'grading_review']);

        $result = $this->service->approveGradingByDeptOfficer($exam);

        $this->assertEquals('results_published', $result->status);
    }

    public function test_reject_grading_by_dept_officer_returns_to_grading_and_creates_feedback(): void
    {
        $exam     = Exam::factory()->create(['status' => 'grading_review']);
        $reviewer = User::factory()->create(['role' => 'lecturer', 'is_department_exam_officer' => true]);

        $result = $this->service->rejectGradingByDeptOfficer($exam, $reviewer, 'Check question 5 grading.');

        $this->assertEquals('grading', $result->status);

        $this->assertDatabaseHas('exam_feedback', [
            'exam_id'  => $exam->id,
            'stage'    => 'post_exam_grading_review',
            'comments' => 'Check question 5 grading.',
        ]);
    }

    public function test_reject_grading_by_dept_officer_throws_if_wrong_status(): void
    {
        $exam     = Exam::factory()->draft()->create();
        $reviewer = User::factory()->create(['role' => 'lecturer']);

        $this->expectException(\Exception::class);
        $this->service->rejectGradingByDeptOfficer($exam, $reviewer, 'Comment');
    }
}
