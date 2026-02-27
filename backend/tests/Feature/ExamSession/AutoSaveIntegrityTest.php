<?php

namespace Tests\Feature\ExamSession;

use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\SessionSnapshot;
use App\Models\StudentAnswer;
use App\Models\User;
use App\Services\ExamSession\SessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Stage 4.4 — Auto-Save Integrity Test
 *
 * Verifies that the auto-save mechanism maintains correct answer state:
 * - Versioning increments monotonically on every save
 * - Only one is_final=true row per (session, question) at any time
 * - The previous final is correctly demoted before writing the new final
 * - Snapshot is created EXACTLY when answered_count % 10 === 0
 * - Created snapshot contains all current answer data
 */
class AutoSaveIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private SessionService $service;
    private ExamSession    $session;
    private Question       $mcqQuestion;
    private Question       $textQuestion;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(SessionService::class);

        $student = User::factory()->create(['role' => 'student']);
        $exam    = Exam::factory()->published()->create(['total_marks' => 50.00]);

        // Create 12 questions for the exam (ensures we can test the 10-answer boundary)
        $this->mcqQuestion  = Question::factory()->create(['question_type' => 'multiple_choice', 'correct_answer' => 'A']);
        $this->textQuestion = Question::factory()->create(['question_type' => 'fill_in_blank']);

        // Also create 10 extra MCQ questions for snapshot boundary tests
        $allQuestions = [$this->mcqQuestion, $this->textQuestion];
        for ($i = 1; $i <= 10; $i++) {
            $allQuestions[] = Question::factory()->create(['question_type' => 'multiple_choice', 'correct_answer' => 'B']);
        }

        $questionIds = [];
        foreach ($allQuestions as $idx => $q) {
            ExamQuestion::create([
                'exam_id'     => $exam->id,
                'question_id' => $q->id,
                'order'       => $idx + 1,
                'points'      => 2.00,
            ]);
            $questionIds[] = $q->id;
        }

        $this->session = ExamSession::create([
            'exam_id'            => $exam->id,
            'student_id'         => $student->id,
            'question_sequence'  => $questionIds,
            'status'             => 'in_progress',
            'scheduled_end_time' => now()->addMinutes(90),
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Test 1: version increments monotonically                          */
    /* ------------------------------------------------------------------ */

    public function test_version_increments_on_every_save(): void
    {
        $qId = $this->mcqQuestion->id;

        $this->service->saveAnswer($this->session, $qId, 'A');
        $this->service->saveAnswer($this->session, $qId, 'B');
        $this->service->saveAnswer($this->session, $qId, 'C');

        $versions = StudentAnswer::where('session_id', $this->session->id)
            ->where('question_id', $qId)
            ->orderBy('version')
            ->pluck('version')
            ->toArray();

        $this->assertEquals([1, 2, 3], $versions, 'Versions should be 1, 2, 3');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 2: Only one is_final=true at any time per (session, question)*/
    /* ------------------------------------------------------------------ */

    public function test_only_one_final_row_per_session_question_at_all_times(): void
    {
        $qId = $this->mcqQuestion->id;

        // Save 5 times
        foreach (['A', 'B', 'C', 'A', 'B'] as $answer) {
            $this->service->saveAnswer($this->session, $qId, $answer);

            // After each save, exactly 1 is_final=true row should exist
            $finalCount = StudentAnswer::where('session_id', $this->session->id)
                ->where('question_id', $qId)
                ->where('is_final', true)
                ->count();

            $this->assertEquals(1, $finalCount, 'Must always have exactly ONE final answer');
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Test 3: Previous final is demoted before new final is written     */
    /* ------------------------------------------------------------------ */

    public function test_previous_final_is_demoted_before_new_write(): void
    {
        $qId = $this->mcqQuestion->id;

        $this->service->saveAnswer($this->session, $qId, 'A'); // version 1
        $v1 = StudentAnswer::where('session_id', $this->session->id)
            ->where('question_id', $qId)
            ->where('version', 1)
            ->first();

        $this->assertTrue($v1->is_final, 'v1 should be final initially');

        $this->service->saveAnswer($this->session, $qId, 'B'); // version 2

        $v1->refresh();
        $this->assertFalse((bool) $v1->is_final, 'v1 should be demoted after v2 is saved');

        $v2 = StudentAnswer::where('session_id', $this->session->id)
            ->where('question_id', $qId)
            ->where('version', 2)
            ->first();

        $this->assertTrue((bool) $v2->is_final, 'v2 should be the new final');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 4: first_answered_at stays fixed for all versions            */
    /* ------------------------------------------------------------------ */

    public function test_first_answered_at_stays_fixed_across_versions(): void
    {
        $qId = $this->mcqQuestion->id;

        $this->service->saveAnswer($this->session, $qId, 'A');
        $firstTime = StudentAnswer::where('session_id', $this->session->id)
            ->where('question_id', $qId)
            ->value('first_answered_at');

        sleep(1); // small delay to ensure timestamps differ

        $this->service->saveAnswer($this->session, $qId, 'B');

        $allFirstAnsweredAt = StudentAnswer::where('session_id', $this->session->id)
            ->where('question_id', $qId)
            ->pluck('first_answered_at')
            ->toArray();

        foreach ($allFirstAnsweredAt as $time) {
            $this->assertEquals(
                $firstTime,
                $time,
                'first_answered_at should remain the same across all versions'
            );
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Test 5: Snapshot created at exactly the 10th answer               */
    /* ------------------------------------------------------------------ */

    public function test_snapshot_created_at_exactly_10th_answer(): void
    {
        // Get question IDs from the session sequence
        $sequence = $this->session->question_sequence;

        // Answer 9 questions — no snapshot yet
        foreach (array_slice($sequence, 0, 9) as $qId) {
            $this->service->saveAnswer($this->session, $qId, 'A');
        }

        $snapshotsBefore = SessionSnapshot::where('session_id', $this->session->id)
            ->where('snapshot_type', 'auto_save')
            ->count();
        $this->assertEquals(0, $snapshotsBefore, 'No snapshot should exist before 10th answer');

        // Answer 10th question — snapshot should trigger
        $this->service->saveAnswer($this->session, $sequence[9], 'A');

        $snapshotsAfter = SessionSnapshot::where('session_id', $this->session->id)
            ->where('snapshot_type', 'auto_save')
            ->count();
        $this->assertEquals(1, $snapshotsAfter, 'Snapshot should exist after 10th answer');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 6: Snapshot data contains all current answers                */
    /* ------------------------------------------------------------------ */

    public function test_snapshot_contains_all_current_answers(): void
    {
        $sequence = $this->session->question_sequence;

        // Answer the first 10 questions
        foreach (array_slice($sequence, 0, 10) as $qId) {
            $this->service->saveAnswer($this->session, $qId, 'A');
        }

        $snapshot = SessionSnapshot::where('session_id', $this->session->id)
            ->where('snapshot_type', 'auto_save')
            ->first();

        $this->assertNotNull($snapshot, 'Snapshot should exist');

        $snapshotAnswers = $snapshot->snapshot_data['answers'] ?? [];
        $this->assertCount(10, $snapshotAnswers, 'Snapshot should contain all 10 answers');

        $snapshotQuestionIds = array_column($snapshotAnswers, 'question_id');
        foreach (array_slice($sequence, 0, 10) as $qId) {
            $this->assertContains($qId, $snapshotQuestionIds, "Question {$qId} should be in snapshot");
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Test 7: Text answer stored in answer_text, MCQ in selected_option */
    /* ------------------------------------------------------------------ */

    public function test_answer_stored_in_correct_column_by_type(): void
    {
        // MCQ answer
        $this->service->saveAnswer($this->session, $this->mcqQuestion->id, 'B');
        $mcqAnswer = StudentAnswer::where('session_id', $this->session->id)
            ->where('question_id', $this->mcqQuestion->id)
            ->where('is_final', true)
            ->first();

        $this->assertNull($mcqAnswer->answer_text, 'MCQ: answer_text should be null');
        $this->assertEquals(['B'], $mcqAnswer->selected_option, 'MCQ: selected_option should be [B]');

        // Fill-in-blank answer
        $this->service->saveAnswer($this->session, $this->textQuestion->id, 'photosynthesis');
        $textAnswer = StudentAnswer::where('session_id', $this->session->id)
            ->where('question_id', $this->textQuestion->id)
            ->where('is_final', true)
            ->first();

        $this->assertEquals('photosynthesis', $textAnswer->answer_text, 'Text: answer_text should be set');
        $this->assertNull($textAnswer->selected_option, 'Text: selected_option should be null');
    }
}
