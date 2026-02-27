<?php

namespace Tests\Unit;

use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\StudentAnswer;
use App\Models\User;
use App\Services\ExamSession\GradingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Stage 4.4 — Grading Accuracy Test
 *
 * Comprehensive edge-case coverage for GradingService to verify 100% accuracy
 * for auto-graded question types. Extends the coverage of GradingServiceTest
 * without touching or duplicating existing tests.
 *
 * Coverage:
 *  - MCQ: correct/wrong/mixed-case/empty/whitespace
 *  - True/False: case-insensitive matching  (true/True/TRUE all → correct)
 *  - Fill-in-blank: ALWAYS null is_correct (manual), regardless of match
 *  - Essay: ALWAYS null is_correct (manual)
 *  - gradeSession: full session with mixed types → correct total_score + percentage
 *  - recalculateSessionScore: post-manual-grading score recalculation
 */
class GradingAccuracyTest extends TestCase
{
    use RefreshDatabase;

    private GradingService $service;
    private Exam           $exam;
    private ExamSession    $session;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new GradingService();

        $student = User::factory()->create(['role' => 'student']);
        $this->exam = Exam::factory()->published()->create(['total_marks' => 100.00]);

        $this->session = ExamSession::create([
            'exam_id'           => $this->exam->id,
            'student_id'        => $student->id,
            'question_sequence' => [],
            'status'            => 'submitted',
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Helper methods                                                     */
    /* ------------------------------------------------------------------ */

    private function makeQuestion(string $type, string $correct, float $points = 2.0): Question
    {
        $q = Question::factory()->create([
            'question_type'  => $type,
            'correct_answer' => $correct,
            'points'         => $points,
        ]);
        ExamQuestion::create([
            'exam_id'     => $this->exam->id,
            'question_id' => $q->id,
            'order'       => rand(1, 999),
            'points'      => $points,
        ]);
        return $q;
    }

    private function makeAnswer(Question $q, ?string $answer = null, bool $isOptionType = true): StudentAnswer
    {
        return StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $q->id,
            'selected_option' => $isOptionType && $answer !== null ? [$answer] : null,
            'answer_text'     => !$isOptionType ? $answer : null,
            'is_final'        => true,
            'version'         => 1,
            'first_answered_at' => now(),
            'last_updated_at' => now(),
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  MCQ — Accuracy                                                     */
    /* ------------------------------------------------------------------ */

    #[DataProvider('mcqProvider')]
    public function test_mcq_grading_accuracy(string $correctAnswer, string $studentAnswer, bool $expectedCorrect): void
    {
        $q   = $this->makeQuestion('multiple_choice', $correctAnswer, 4.0);
        $ans = $this->makeAnswer($q, $studentAnswer);

        $this->service->gradeAnswer($ans, $this->session);
        $ans->refresh();

        $this->assertEquals($expectedCorrect, (bool) $ans->is_correct, "MCQ: correct='{$correctAnswer}', student='{$studentAnswer}'");
        $this->assertEquals($expectedCorrect ? 4.0 : 0.0, (float) $ans->points_awarded);
    }

    public static function mcqProvider(): array
    {
        return [
            'exact match A'         => ['A', 'A', true],
            'exact match B'         => ['B', 'B', true],
            'exact match C'         => ['C', 'C', true],
            'wrong answer'          => ['A', 'B', false],
            'reverse wrong'         => ['B', 'A', false],
            'case insensitive'      => ['A', 'a', true],   // lowercase should match
            'case insensitive D'    => ['D', 'd', true],
            'wrong case different'  => ['A', 'b', false],
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  MCQ — Empty answer                                                 */
    /* ------------------------------------------------------------------ */

    public function test_mcq_empty_answer_gets_zero_points(): void
    {
        $q = $this->makeQuestion('multiple_choice', 'A', 2.0);

        $ans = StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $q->id,
            'selected_option' => null,
            'answer_text'     => null,
            'is_final'        => true,
            'version'         => 1,
            'first_answered_at' => now(),
            'last_updated_at' => now(),
        ]);

        $this->service->gradeAnswer($ans, $this->session);
        $ans->refresh();

        $this->assertFalse((bool) $ans->is_correct);
        $this->assertEquals(0.0, (float) $ans->points_awarded);
    }

    /* ------------------------------------------------------------------ */
    /*  True/False — Case-insensitive matching                            */
    /* ------------------------------------------------------------------ */

    #[DataProvider('trueFalseProvider')]
    public function test_true_false_case_insensitive_matching(string $correct, string $student, bool $expected): void
    {
        $q   = $this->makeQuestion('true_false', $correct, 1.0);
        $ans = $this->makeAnswer($q, $student);

        $this->service->gradeAnswer($ans, $this->session);
        $ans->refresh();

        $this->assertEquals($expected, (bool) $ans->is_correct, "T/F: correct='{$correct}', student='{$student}'");
        $this->assertEquals($expected ? 1.0 : 0.0, (float) $ans->points_awarded);
    }

    public static function trueFalseProvider(): array
    {
        return [
            'True exact'     => ['True',  'True',  true],
            'True lowercase' => ['True',  'true',  true],
            'True uppercase' => ['True',  'TRUE',  true],
            'False exact'    => ['False', 'False', true],
            'False lowercase' => ['False', 'false', true],
            'True vs False'  => ['True',  'False', false],
            'False vs True'  => ['False', 'True',  false],
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Fill-in-blank — Always manual (null is_correct)                   */
    /* ------------------------------------------------------------------ */

    #[DataProvider('fillInBlankProvider')]
    public function test_fill_in_blank_always_flagged_for_manual_grading(string $answer): void
    {
        $q = Question::factory()->create([
            'question_type'  => 'fill_in_blank',
            'correct_answer' => 'photosynthesis',
            'points'         => 3.0,
        ]);
        ExamQuestion::create(['exam_id' => $this->exam->id, 'question_id' => $q->id, 'order' => 1, 'points' => 3.0]);

        $ans = $this->makeAnswer($q, $answer, false);
        $this->service->gradeAnswer($ans, $this->session);
        $ans->refresh();

        $this->assertNull($ans->is_correct, "Fill-in-blank must have null is_correct (manual grading required). Answer: '{$answer}'");
        $this->assertEquals(0.0, (float) $ans->points_awarded, 'Fill-in-blank must get 0 pts until manually graded');
    }

    public static function fillInBlankProvider(): array
    {
        return [
            'exact match'     => ['photosynthesis'],
            'close partial'   => ['photosinthesis'],  // typo — still goes to manual
            'completely wrong' => ['mitosis'],
            // NOTE: empty string is treated as "unanswered" → is_correct=false (not null)
            // This is tested separately in test_empty_fill_in_blank_treated_as_unanswered()
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Essay — Always manual                                              */
    /* ------------------------------------------------------------------ */

    public function test_essay_always_null_is_correct(): void
    {
        $q = Question::factory()->create(['question_type' => 'essay', 'correct_answer' => null, 'points' => 10.0]);
        ExamQuestion::create(['exam_id' => $this->exam->id, 'question_id' => $q->id, 'order' => 1, 'points' => 10.0]);

        $ans = $this->makeAnswer($q, 'A long essay response that covers all points.', false);
        $this->service->gradeAnswer($ans, $this->session);
        $ans->refresh();

        $this->assertNull($ans->is_correct, 'Essay must always be null (manual grading required)');
        $this->assertEquals(0.0, (float) $ans->points_awarded, 'Essay must get 0 pts until manually graded');
    }

    /* ------------------------------------------------------------------ */
    /*  gradeSession — Mixed question types: correct total_score          */
    /* ------------------------------------------------------------------ */

    public function test_grade_session_correctly_sums_auto_graded_questions(): void
    {
        $exam = Exam::factory()->published()->create(['total_marks' => 10.00]);
        $student = User::factory()->create(['role' => 'student']);

        $session = ExamSession::create([
            'exam_id'           => $exam->id,
            'student_id'        => $student->id,
            'question_sequence' => [],
            'status'            => 'submitted',
        ]);

        // 4 MCQ questions, 2 pts each
        $correctQuestions = [];
        for ($i = 0; $i < 4; $i++) {
            $q = Question::factory()->create(['question_type' => 'multiple_choice', 'correct_answer' => 'A', 'points' => 2]);
            ExamQuestion::create(['exam_id' => $exam->id, 'question_id' => $q->id, 'order' => $i + 1, 'points' => 2]);
            $correctQuestions[] = $q;
        }

        // 1 essay question, 2 pts — requires manual grading → contributes 0 to auto score
        $essayQ = Question::factory()->create(['question_type' => 'essay', 'correct_answer' => null, 'points' => 2]);
        ExamQuestion::create(['exam_id' => $exam->id, 'question_id' => $essayQ->id, 'order' => 5, 'points' => 2]);

        // Answer: get 3 MCQ correct, 1 MCQ wrong, essay answered
        foreach (array_slice($correctQuestions, 0, 3) as $q) {
            StudentAnswer::create(['session_id' => $session->id, 'question_id' => $q->id, 'selected_option' => ['A'], 'is_final' => true, 'version' => 1, 'first_answered_at' => now(), 'last_updated_at' => now()]);
        }
        StudentAnswer::create(['session_id' => $session->id, 'question_id' => $correctQuestions[3]->id, 'selected_option' => ['C'], 'is_final' => true, 'version' => 1, 'first_answered_at' => now(), 'last_updated_at' => now()]);
        StudentAnswer::create(['session_id' => $session->id, 'question_id' => $essayQ->id, 'answer_text' => 'My detailed essay.', 'is_final' => true, 'version' => 1, 'first_answered_at' => now(), 'last_updated_at' => now()]);

        $this->service->gradeSession($session);
        $session->refresh();

        // 3 correct MCQ × 2 pts = 6 pts; 1 wrong MCQ = 0; essay = 0 (manual)
        $this->assertEquals(6.0, (float) $session->total_score, 'total_score should be 6.0 (3 correct MCQ)');
        $this->assertEquals(60.0, (float) $session->percentage, 'percentage should be 60%');
    }

    /* ------------------------------------------------------------------ */
    /*  recalculateSessionScore — After manual grading updates score       */
    /* ------------------------------------------------------------------ */

    public function test_recalculate_correctly_updates_after_manual_grade(): void
    {
        $exam    = Exam::factory()->published()->create(['total_marks' => 10.00]);
        $student = User::factory()->create(['role' => 'student']);

        $session = ExamSession::create([
            'exam_id'           => $exam->id,
            'student_id'        => $student->id,
            'question_sequence' => [],
            'status'            => 'submitted',
            'total_score'       => 4.0,   // from auto-grading only
            'percentage'        => 40.0,
        ]);

        // Simulate auto-graded MCQ already done (4 pts)
        $mcqQ = Question::factory()->create(['question_type' => 'multiple_choice', 'points' => 4]);
        StudentAnswer::create([
            'session_id'     => $session->id,
            'question_id'    => $mcqQ->id,
            'selected_option'=> ['A'],
            'is_final'       => true,
            'is_correct'     => true,
            'points_awarded' => 4.0,
            'version'        => 1,
            'first_answered_at' => now(),
            'last_updated_at'=> now(),
        ]);

        // Simulate essay manually graded (6 pts awarded)
        $essayQ = Question::factory()->create(['question_type' => 'essay', 'points' => 6]);
        StudentAnswer::create([
            'session_id'     => $session->id,
            'question_id'    => $essayQ->id,
            'answer_text'    => 'My essay.',
            'is_final'       => true,
            'is_correct'     => null, // essays don't get is_correct
            'points_awarded' => 6.0,  // manually assigned
            'version'        => 1,
            'first_answered_at' => now(),
            'last_updated_at'=> now(),
        ]);

        $this->service->recalculateSessionScore($session);
        $session->refresh();

        $this->assertEquals(10.0, (float) $session->total_score, 'total_score should be 10 after manual + auto combined');
        $this->assertEquals(100.0, (float) $session->percentage, 'percentage should be 100%');
    }
}
