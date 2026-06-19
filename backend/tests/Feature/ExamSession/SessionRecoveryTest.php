<?php

namespace Tests\Feature\ExamSession;

use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\SessionSnapshot;
use App\Models\StudentAnswer;
use App\Models\User;
use App\Services\ExamSession\RecoveryService;
use App\Services\ExamSession\SessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Stage 4.4 — Session Recovery Test
 *
 * Tests RecoveryService:
 * - restoreFromSnapshot returns 0 when no answers are missing (no-op)
 * - restoreFromSnapshot correctly re-creates StudentAnswer rows from snapshot
 *   when the session's answers table is empty (simulated server crash)
 * - After restore, getSessionStatus shows the correct questions_answered count
 * - getRecoverySummary returns correct snapshot metadata
 */
class SessionRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private RecoveryService $recoveryService;
    private SessionService  $sessionService;
    private Exam            $exam;
    private ExamSession     $session;
    /** @var Question[] */
    private array $questions = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->recoveryService = app(RecoveryService::class);
        $this->sessionService  = app(SessionService::class);

        $student   = User::factory()->create(['role' => 'student']);
        $this->exam = Exam::factory()->published()->create(['total_marks' => 20.00]);

        for ($i = 1; $i <= 5; $i++) {
            $q = Question::factory()->create(['question_type' => 'multiple_choice', 'correct_answer' => 'A', 'points' => 4]);
            ExamQuestion::create(['exam_id' => $this->exam->id, 'question_id' => $q->id, 'question_order' => $i, 'points' => 4]);
            $this->questions[] = $q;
        }

        $this->session = ExamSession::create([
            'exam_id'            => $this->exam->id,
            'student_id'         => $student->id,
            'question_sequence'  => collect($this->questions)->pluck('id')->toArray(),
            'status'             => 'in_progress',
            'scheduled_end_time' => now()->addMinutes(60),
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Helper: create a snapshot with given answers                       */
    /* ------------------------------------------------------------------ */

    private function createSnapshotWithAnswers(array $answerData): SessionSnapshot
    {
        return SessionSnapshot::create([
            'session_id'    => $this->session->id,
            'snapshot_type' => 'auto_save',
            'snapshot_data' => [
                'current_question_index' => count($answerData) - 1,
                'questions_answered'     => count($answerData),
                'answers'                => $answerData,
                'time_remaining'         => 2700,
            ],
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Test 1: restoreFromSnapshot is a no-op when all answers present   */
    /* ------------------------------------------------------------------ */

    public function test_restore_from_snapshot_is_noop_when_answers_already_exist(): void
    {
        $qId = $this->questions[0]->id;

        // Create an answer in the live table
        StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $qId,
            'selected_option' => ['A'],
            'is_final'        => true,
            'version'         => 1,
            'first_answered_at' => now(),
            'last_updated_at' => now(),
        ]);

        // Create a snapshot that also contains this question
        $this->createSnapshotWithAnswers([
            ['question_id' => $qId, 'selected_option' => ['A'], 'answer_text' => null, 'is_flagged' => false, 'version' => 1],
        ]);

        $restored = $this->recoveryService->restoreFromSnapshot($this->session);

        $this->assertEquals(0, $restored, 'restoreFromSnapshot should restore 0 when all already exist');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 2: All answers restored when student_answers table is empty  */
    /* ------------------------------------------------------------------ */

    public function test_restore_from_snapshot_recreates_missing_answers(): void
    {
        $answerData = [];
        foreach ($this->questions as $q) {
            $answerData[] = [
                'question_id'     => $q->id,
                'selected_option' => ['A'],
                'answer_text'     => null,
                'is_flagged'      => false,
                'version'         => 1,
            ];
        }

        $this->createSnapshotWithAnswers($answerData);

        // student_answers table is empty (simulates crash before DB write)
        $this->assertEmpty(
            StudentAnswer::where('session_id', $this->session->id)->get(),
            'Pre-condition: student_answers should be empty'
        );

        $restored = $this->recoveryService->restoreFromSnapshot($this->session);

        $this->assertEquals(5, $restored, 'Should have restored 5 answers from snapshot');

        // Verify the restored rows exist in student_answers
        $liveCount = StudentAnswer::where('session_id', $this->session->id)
            ->where('is_final', true)
            ->count();

        $this->assertEquals(5, $liveCount, '5 final answer rows should exist after recovery');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 3: Only partial restore when some answers are missing        */
    /* ------------------------------------------------------------------ */

    public function test_restore_from_snapshot_only_fills_missing_answers(): void
    {
        // Write 2 answers to live table
        foreach (array_slice($this->questions, 0, 2) as $q) {
            StudentAnswer::create([
                'session_id'      => $this->session->id,
                'question_id'     => $q->id,
                'selected_option' => ['A'],
                'is_final'        => true,
                'version'         => 1,
                'first_answered_at' => now(),
                'last_updated_at' => now(),
            ]);
        }

        // Snapshot has all 5 answers
        $answerData = [];
        foreach ($this->questions as $q) {
            $answerData[] = [
                'question_id'     => $q->id,
                'selected_option' => ['A'],
                'answer_text'     => null,
                'is_flagged'      => false,
                'version'         => 1,
            ];
        }
        $this->createSnapshotWithAnswers($answerData);

        $restored = $this->recoveryService->restoreFromSnapshot($this->session);

        $this->assertEquals(3, $restored, 'Should only restore the 3 missing answers');

        $totalFinal = StudentAnswer::where('session_id', $this->session->id)
            ->where('is_final', true)
            ->count();
        $this->assertEquals(5, $totalFinal, 'Should have 5 final answers total after partial restore');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 4: questions_answered counter synced after restore            */
    /* ------------------------------------------------------------------ */

    public function test_questions_answered_counter_synced_after_restore(): void
    {
        $answerData = [];
        foreach ($this->questions as $q) {
            $answerData[] = [
                'question_id'     => $q->id,
                'selected_option' => ['A'],
                'answer_text'     => null,
                'is_flagged'      => false,
                'version'         => 1,
            ];
        }
        $this->createSnapshotWithAnswers($answerData);

        $this->recoveryService->restoreFromSnapshot($this->session);
        $this->session->refresh();

        $this->assertEquals(
            5,
            (int) $this->session->questions_answered,
            'questions_answered should be synced to 5 after recovery'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Test 5: getRecoverySummary returns correct metadata               */
    /* ------------------------------------------------------------------ */

    public function test_get_recovery_summary_returns_correct_metadata(): void
    {
        $answerData = [
            ['question_id' => $this->questions[0]->id, 'selected_option' => ['A'], 'answer_text' => null, 'is_flagged' => false, 'version' => 1],
            ['question_id' => $this->questions[1]->id, 'selected_option' => ['B'], 'answer_text' => null, 'is_flagged' => false, 'version' => 1],
        ];
        $this->createSnapshotWithAnswers($answerData);

        $summary = $this->recoveryService->getRecoverySummary($this->session);

        $this->assertTrue($summary['has_snapshot'], 'has_snapshot should be true');
        $this->assertEquals(2, $summary['answers_in_snapshot'], 'Should report 2 answers in snapshot');
        $this->assertEquals(2700, $summary['time_remaining_at_snapshot'], 'time_remaining should be 2700');
        $this->assertNotNull($summary['snapshot_time'], 'snapshot_time should not be null');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 6: no snapshot → getRecoverySummary returns safe defaults    */
    /* ------------------------------------------------------------------ */

    public function test_get_recovery_summary_returns_defaults_when_no_snapshot(): void
    {
        $summary = $this->recoveryService->getRecoverySummary($this->session);

        $this->assertFalse($summary['has_snapshot'], 'has_snapshot should be false');
        $this->assertEquals(0, $summary['answers_in_snapshot']);
        $this->assertNull($summary['snapshot_time']);
        $this->assertNull($summary['time_remaining_at_snapshot']);
    }

    /* ------------------------------------------------------------------ */
    /*  Test 7: getSessionStatus triggers recovery for interrupted session */
    /* ------------------------------------------------------------------ */

    public function test_get_session_status_auto_recovers_interrupted_session(): void
    {
        // Mark session as interrupted
        $this->session->update(['status' => 'interrupted']);

        // Create snapshot with answers
        $answerData = [];
        foreach ($this->questions as $q) {
            $answerData[] = [
                'question_id'     => $q->id,
                'selected_option' => ['A'],
                'answer_text'     => null,
                'is_flagged'      => false,
                'version'         => 1,
            ];
        }
        $this->createSnapshotWithAnswers($answerData);

        // student_answers table is empty (crash scenario)
        $this->assertEquals(0, StudentAnswer::where('session_id', $this->session->id)->count());

        $status = $this->sessionService->getSessionStatus($this->session);

        // Recovery should have fired and restored answers
        $this->assertEquals(5, $status['recovered_answers'], 'Status should report 5 recovered answers');
        $this->assertTrue($status['recovery_summary']['has_snapshot'], 'Recovery summary should report snapshot found');
        $this->assertEquals(5, $status['questions_answered'], 'questions_answered should reflect recovered answers');
    }
}
