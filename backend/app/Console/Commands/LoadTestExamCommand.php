<?php

namespace App\Console\Commands;

use App\Models\Course;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\StudentAnswer;
use App\Models\User;
use App\Services\ExamSession\GradingService;
use App\Services\ExamSession\SessionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Stage 4.4 — Exam Load Test Command
 *
 * Simulates N students taking a real exam sequentially against the database.
 * Each student starts a session, answers all questions, and submits.
 * Reports elapsed time, total answers written, and verifies integrity.
 *
 * Usage:
 *   php artisan exam:load-test
 *   php artisan exam:load-test --students=200 --questions=30
 *   php artisan exam:load-test --students=100 --cleanup
 *
 * NOTE: This uses PHP's sequential execution (not parallel).
 * It measures correctness and DB throughput, not concurrent HTTP capacity.
 * For true concurrent HTTP load testing, use Apache Bench or k6 against
 * your real API endpoints in a staging environment.
 */
class LoadTestExamCommand extends Command
{
    protected $signature = 'exam:load-test
        {--students=100  : Number of simulated student sessions}
        {--questions=30  : Number of MCQ questions in the exam}
        {--cleanup       : Delete all seeded test data after the run}';

    protected $description = 'Stage 4.4: Simulate N exam sessions and verify integrity. Does NOT hit HTTP endpoints — uses service layer directly.';

    private array $seededIds = [
        'users'        => [],
        'exam_id'      => null,
        'department_id'=> null,
        'course_id'    => null,
    ];

    public function handle(SessionService $sessionService): int
    {
        $numStudents  = (int) $this->option('students');
        $numQuestions = (int) $this->option('questions');
        $doCleanup    = (bool) $this->option('cleanup');

        $this->line('');
        $this->line('<fg=cyan>[CBT Load Test]</> Starting: <fg=white>' . $numStudents . ' students × ' . $numQuestions . ' questions</>');
        $this->line('');

        // ----------------------------------------------------------------
        // 1. Seed the exam and questions
        // ----------------------------------------------------------------
        $this->info('  Seeding exam environment...');
        [$exam, $questionIds] = $this->seedExam($numQuestions);

        // ----------------------------------------------------------------
        // 2. Create student users
        // ----------------------------------------------------------------
        $this->info("  Creating {$numStudents} student accounts...");
        $students = $this->seedStudents($numStudents);

        // ----------------------------------------------------------------
        // 3. Simulate each student's session
        // ----------------------------------------------------------------
        $this->info("  Running {$numStudents} sessions...");
        $this->line('');

        $startTime   = microtime(true);
        $errors      = [];
        $sessionIds  = [];

        $bar = $this->output->createProgressBar($numStudents);
        $bar->setFormat(' %current%/%max% [%bar%] %percent:3s%% %elapsed:6s%/%estimated:-6s%');
        $bar->start();

        foreach ($students as $student) {
            try {
                $session = ExamSession::create([
                    'exam_id'            => $exam->id,
                    'student_id'         => $student->id,
                    'question_sequence'  => $questionIds,
                    'status'             => 'in_progress',
                    'scheduled_end_time' => now()->addMinutes(90),
                ]);

                $sessionIds[] = $session->id;

                // Answer all questions (simulating selective correct answers)
                foreach ($questionIds as $idx => $qId) {
                    $answer = ($idx % 3 === 0) ? 'B' : 'A'; // mix right/wrong
                    $sessionService->saveAnswer($session, $qId, $answer);
                }

                // Submit
                $sessionService->submitExam($session);

            } catch (\Throwable $e) {
                $errors[] = "Student {$student->id}: {$e->getMessage()}";
            }

            $bar->advance();
        }

        $bar->finish();
        $elapsed = round(microtime(true) - $startTime, 2);
        $this->line('');
        $this->line('');

        // ----------------------------------------------------------------
        // 4. Integrity Verification
        // ----------------------------------------------------------------
        $this->info('  Verifying integrity...');

        $expectedAnswers = count($sessionIds) * $numQuestions;

        $actualFinalAnswers = StudentAnswer::whereIn('session_id', $sessionIds)
            ->where('is_final', true)
            ->count();

        $submittedCount = ExamSession::whereIn('id', $sessionIds)
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->count();

        $this->line('');
        $this->table(
            ['Metric', 'Expected', 'Actual', 'Status'],
            [
                [
                    'Final answer rows',
                    $expectedAnswers,
                    $actualFinalAnswers,
                    $actualFinalAnswers === $expectedAnswers ? '<fg=green>✅ PASS</>' : '<fg=red>❌ FAIL</>',
                ],
                [
                    'Submitted sessions',
                    count($sessionIds),
                    $submittedCount,
                    $submittedCount === count($sessionIds) ? '<fg=green>✅ PASS</>' : '<fg=red>❌ FAIL</>',
                ],
                [
                    'Errors',
                    0,
                    count($errors),
                    empty($errors) ? '<fg=green>✅ PASS</>' : '<fg=red>❌ FAIL</>',
                ],
            ]
        );

        if (! empty($errors)) {
            $this->line('');
            $this->warn('  Errors encountered:');
            foreach (array_slice($errors, 0, 10) as $error) {
                $this->line("  <fg=red>• {$error}</>");
            }
            if (count($errors) > 10) {
                $this->line('  ... and ' . (count($errors) - 10) . ' more errors.');
            }
        }

        $this->line('');
        $this->line("<fg=cyan>[CBT Load Test]</> Done in <fg=white>{$elapsed}s</> — {$actualFinalAnswers} answers written — " . ($numStudents - count($errors)) . "/{$numStudents} sessions submitted");

        // ----------------------------------------------------------------
        // 5. Optional cleanup
        // ----------------------------------------------------------------
        if ($doCleanup) {
            $this->line('');
            $this->info('  Cleaning up test data...');
            $this->cleanUp($sessionIds);
            $this->line('  <fg=green>Cleanup complete.</>');
        } else {
            $this->line('  <fg=yellow>Tip: Run with --cleanup to remove test data, or inspect sessions in the DB.</>');
        }

        $this->line('');

        $allPassed = $actualFinalAnswers === $expectedAnswers
            && $submittedCount === count($sessionIds)
            && empty($errors);

        return $allPassed ? self::SUCCESS : self::FAILURE;
    }

    /* ------------------------------------------------------------------ */
    /*  Seeding helpers                                                    */
    /* ------------------------------------------------------------------ */

    private function seedExam(int $numQuestions): array
    {
        // Use direct DB inserts to avoid nested factory chains that trigger
        // unique-constraint conflicts on the shared development database.

        // Department — factories are fine here (no unique constraints)
        $dept = Department::factory()->create(['name' => '[LoadTest] Dept-' . now()->format('His')]);
        $this->seededIds['department_id'] = $dept->id;

        // Level — reuse existing (table has no soft-deletes)
        $levelId = DB::table('levels')->value('id');
        if (! $levelId) {
            $levelId = DB::table('levels')->insertGetId([
                'code' => 'LT0', 'name' => 'Load Test Level',
                'order' => 1, 'is_active' => 1,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // Course — DB::table avoids $fillable mismatch (model uses 'title', column is 'name')
        $courseId = DB::table('courses')->insertGetId([
            'uuid'          => (string) \Illuminate\Support\Str::uuid(),
            'department_id' => $dept->id,
            'level_id'      => $levelId,
            'code'          => '[LT]' . strtoupper(\Illuminate\Support\Str::random(4)),
            'name'          => '[LoadTest] Course',
            'credit_units'  => 3,
            'semester'      => 'first',
            'academic_year' => '2025/2026',
            'is_active'     => 1,
            'created_at'    => now(),
            'updated_at'    => now(),
        ]);
        $this->seededIds['course_id'] = $courseId;

        // Lecturer — reuse existing or create one
        $lecturerId = DB::table('users')->where('role', 'lecturer')->value('id');
        if (! $lecturerId) {
            $lecturerId = User::factory()->create(['role' => 'lecturer'])->id;
            $this->seededIds['users'][] = $lecturerId;
        }

        // Exam — Exam::create() works since 'course_id' is in $fillable
        $exam = Exam::create([
            'uuid'             => (string) \Illuminate\Support\Str::uuid(),
            'course_id'        => $courseId,
            'created_by'       => $lecturerId,
            'title'            => '[LoadTest] Exam - ' . now()->format('Y-m-d H:i:s'),
            'exam_type'        => 'final',
            'start_time'       => now()->addDays(3),
            'end_time'         => now()->addDays(3)->addHours(2),
            'duration_minutes' => 90,
            'total_marks'      => $numQuestions * 2.0,
            'passing_marks'    => $numQuestions * 2.0 * 0.4,
            'status'           => 'published',
            'is_practice'      => false,
            'randomize_questions' => false,
            'randomize_options'   => false,
            'allow_backtrack'     => false,
        ]);
        $this->seededIds['exam_id'] = $exam->id;

        // Questions
        $questionIds = [];
        for ($i = 1; $i <= $numQuestions; $i++) {
            $q = Question::factory()->create([
                'course_id'      => $courseId,
                'created_by'     => $lecturerId,
                'question_type'  => 'multiple_choice',
                'correct_answer' => 'A',
                'options'        => json_encode(['A' => 'Option A', 'B' => 'Option B', 'C' => 'Option C', 'D' => 'Option D']),
                'points'         => 2.0,
            ]);
            ExamQuestion::create([
                'exam_id'        => $exam->id,
                'question_id'    => $q->id,
                'question_order' => $i,
                'points'         => 2.0,
            ]);
            $questionIds[] = $q->id;
        }

        return [$exam, $questionIds];
    }

    private function seedStudents(int $count): array
    {
        $students = [];
        for ($i = 0; $i < $count; $i++) {
            $student = User::factory()->create([
                'role'       => 'student',
                'first_name' => '[LoadTest]',
                'last_name'  => "Student{$i}",
                'email'      => 'loadtest_student_' . Str::random(8) . '@test.invalid',
            ]);
            $students[]  = $student;
            $this->seededIds['users'][] = $student->id;
        }
        return $students;
    }

    private function cleanUp(array $sessionIds): void
    {
        DB::transaction(function () use ($sessionIds) {
            // Order matter: children first
            StudentAnswer::whereIn('session_id', $sessionIds)->forceDelete();
            \App\Models\SessionSnapshot::whereIn('session_id', $sessionIds)->forceDelete();
            ExamSession::whereIn('id', $sessionIds)->forceDelete();

            if ($this->seededIds['exam_id']) {
                ExamQuestion::where('exam_id', $this->seededIds['exam_id'])->forceDelete();
                Exam::where('id', $this->seededIds['exam_id'])->forceDelete();
            }

            if (! empty($this->seededIds['users'])) {
                User::whereIn('id', $this->seededIds['users'])->forceDelete();
            }

            if ($this->seededIds['course_id']) {
                Course::where('id', $this->seededIds['course_id'])->forceDelete();
            }

            if ($this->seededIds['department_id']) {
                Department::where('id', $this->seededIds['department_id'])->forceDelete();
            }
        });
    }
}
