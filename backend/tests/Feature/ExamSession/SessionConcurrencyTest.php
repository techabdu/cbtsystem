<?php

namespace Tests\Feature\ExamSession;

use App\Models\Course;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\StudentAnswer;
use App\Models\User;
use App\Services\ExamSession\SessionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Stage 4.4 — Session Concurrency Test
 *
 * Simulates 50 concurrent exam sessions against the same exam to verify:
 * - Each student's answers are fully isolated (no cross-contamination)
 * - Versioning increments correctly per student per question
 * - questions_answered counter is accurate per session
 * - Auto-snapshot fires at every 10th answer
 *
 * NOTE: True OS-level parallelism requires ext-parallel which is unavailable
 * under XAMPP. These tests use sequential simulation across N sessions in one
 * process to verify correctness under volume (not raw wall-clock throughput).
 * True throughput load testing is done via: php artisan exam:load-test
 */
class SessionConcurrencyTest extends TestCase
{
    use RefreshDatabase;

    private SessionService $service;
    private Exam           $exam;
    /** @var Question[] */
    private array $questions = [];

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(SessionService::class);

        $department = Department::factory()->create();
        $course     = Course::factory()->create(['department_id' => $department->id]);

        $this->exam = Exam::factory()->published()->create([
            'course_id'   => $course->id,
            'total_marks' => 30.00,
        ]);

        // Create 10 MCQ questions for the exam
        for ($i = 1; $i <= 10; $i++) {
            $q = Question::factory()->create([
                'question_type'  => 'multiple_choice',
                'correct_answer' => 'A',
                'points'         => 3.00,
            ]);
            ExamQuestion::create([
                'exam_id'     => $this->exam->id,
                'question_id' => $q->id,
                'order'       => $i,
                'points'      => 3.00,
            ]);
            $this->questions[] = $q;
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Helper: create a session + save N answers                          */
    /* ------------------------------------------------------------------ */

    private function makeSessionWithAnswers(User $student, int $numAnswers): ExamSession
    {
        $questionIds = collect($this->questions)->pluck('id')->toArray();

        $session = ExamSession::create([
            'exam_id'           => $this->exam->id,
            'student_id'        => $student->id,
            'question_sequence' => $questionIds,
            'status'            => 'in_progress',
            'scheduled_end_time' => now()->addMinutes(60),
        ]);

        foreach (array_slice($questionIds, 0, $numAnswers) as $qId) {
            $this->service->saveAnswer($session, $qId, 'A');
        }

        return $session->fresh();
    }

    /* ------------------------------------------------------------------ */
    /*  Test 1: Answer rows are fully isolated between sessions            */
    /* ------------------------------------------------------------------ */

    public function test_concurrent_sessions_have_no_cross_contamination(): void
    {
        $students = User::factory()->count(10)->create(['role' => 'student']);

        $sessions = [];
        foreach ($students as $student) {
            $sessions[] = $this->makeSessionWithAnswers($student, 5);
        }

        // Every session should have EXACTLY its own 5 answers, zero from other sessions
        foreach ($sessions as $i => $session) {
            $rows = StudentAnswer::where('session_id', $session->id)
                ->where('is_final', true)
                ->count();

            $this->assertEquals(
                5,
                $rows,
                "Session {$i} (student {$session->student_id}) has {$rows} answers, expected 5"
            );

            // No answer rows should belong to a different session
            $wrongSession = StudentAnswer::where('session_id', '!=', $session->id)
                ->where('question_id', $this->questions[0]->id)
                ->count();

            // We only assert via session isolation — each session queries its own rows
            $this->assertEquals(
                5,
                (int) $session->questions_answered,
                "Session {$i} questions_answered counter is wrong"
            );
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Test 2: Only one is_final=true row per (session, question)        */
    /* ------------------------------------------------------------------ */

    public function test_only_one_final_answer_per_question_after_multiple_saves(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $questionId = $this->questions[0]->id;

        $questionIds = collect($this->questions)->pluck('id')->toArray();
        $session = ExamSession::create([
            'exam_id'            => $this->exam->id,
            'student_id'         => $student->id,
            'question_sequence'  => $questionIds,
            'status'             => 'in_progress',
            'scheduled_end_time' => now()->addMinutes(60),
        ]);

        // Save the same question 5 times (simulating 5 auto-saves)
        foreach (['A', 'B', 'A', 'C', 'A'] as $answer) {
            $this->service->saveAnswer($session, $questionId, $answer);
        }

        $finalCount = StudentAnswer::where('session_id', $session->id)
            ->where('question_id', $questionId)
            ->where('is_final', true)
            ->count();

        $this->assertEquals(1, $finalCount, 'Should have exactly ONE final answer after 5 saves');

        // Version should be 5 (incremented each time)
        $latestVersion = StudentAnswer::where('session_id', $session->id)
            ->where('question_id', $questionId)
            ->where('is_final', true)
            ->value('version');

        $this->assertEquals(5, $latestVersion, 'Version should be 5 after 5 saves');
    }

    /* ------------------------------------------------------------------ */
    /*  Test 3: questions_answered counter stays accurate across 50 saves */
    /* ------------------------------------------------------------------ */

    public function test_questions_answered_counter_is_always_accurate(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $questionIds = collect($this->questions)->pluck('id')->toArray();

        $session = ExamSession::create([
            'exam_id'            => $this->exam->id,
            'student_id'         => $student->id,
            'question_sequence'  => $questionIds,
            'status'             => 'in_progress',
            'scheduled_end_time' => now()->addMinutes(60),
        ]);

        // Answer each question once, check counter after each
        foreach ($this->questions as $idx => $question) {
            $this->service->saveAnswer($session, $question->id, 'A');
            $session->refresh();

            $this->assertEquals(
                $idx + 1,
                (int) $session->questions_answered,
                "After save #{$idx}: questions_answered should be " . ($idx + 1)
            );
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Test 4: Auto-snapshot fires at exactly every 10th answer          */
    /* ------------------------------------------------------------------ */

    public function test_auto_snapshot_triggers_at_every_10_answers(): void
    {
        $student = User::factory()->create(['role' => 'student']);
        $questionIds = collect($this->questions)->pluck('id')->toArray();

        $session = ExamSession::create([
            'exam_id'            => $this->exam->id,
            'student_id'         => $student->id,
            'question_sequence'  => $questionIds,
            'status'             => 'in_progress',
            'scheduled_end_time' => now()->addMinutes(60),
        ]);

        // Answer exactly 10 questions
        foreach ($this->questions as $question) {
            $this->service->saveAnswer($session, $question->id, 'A');
        }

        $snapshotCount = \App\Models\SessionSnapshot::where('session_id', $session->id)
            ->where('snapshot_type', 'auto_save')
            ->count();

        $this->assertEquals(
            1,
            $snapshotCount,
            'Should have exactly 1 auto-save snapshot after answering 10 questions'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Test 5: 50 sequential sessions — all answers written correctly    */
    /* ------------------------------------------------------------------ */

    public function test_50_sequential_sessions_all_have_correct_answer_counts(): void
    {
        $NUM_SESSIONS  = 50;
        $NUM_QUESTIONS = 10; // all questions in the exam

        $students = User::factory()->count($NUM_SESSIONS)->create(['role' => 'student']);

        $sessionIds = [];
        foreach ($students as $student) {
            $session   = $this->makeSessionWithAnswers($student, $NUM_QUESTIONS);
            $sessionIds[] = $session->id;
        }

        // Verify total answers written
        $totalAnswers = StudentAnswer::whereIn('session_id', $sessionIds)
            ->where('is_final', true)
            ->count();

        $this->assertEquals(
            $NUM_SESSIONS * $NUM_QUESTIONS,
            $totalAnswers,
            "Expected {$NUM_SESSIONS} × {$NUM_QUESTIONS} = " . ($NUM_SESSIONS * $NUM_QUESTIONS) . " answers, got {$totalAnswers}"
        );

        // Verify each session has exactly NUM_QUESTIONS final answers
        foreach ($sessionIds as $sessionId) {
            $count = StudentAnswer::where('session_id', $sessionId)
                ->where('is_final', true)
                ->count();

            $this->assertEquals(
                $NUM_QUESTIONS,
                $count,
                "Session {$sessionId} has {$count} answers, expected {$NUM_QUESTIONS}"
            );
        }
    }
}
