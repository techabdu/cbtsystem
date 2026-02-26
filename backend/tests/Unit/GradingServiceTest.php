<?php

namespace Tests\Unit;

use App\Models\Course;
use App\Models\Exam;
use App\Models\ExamQuestion;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\StudentAnswer;
use App\Models\User;
use App\Services\ExamSession\GradingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GradingServiceTest extends TestCase
{
    use RefreshDatabase;

    private GradingService $service;
    private Exam $exam;
    private ExamSession $session;
    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = new GradingService();

        $this->student = User::factory()->create(['role' => 'student']);
        $this->exam    = Exam::factory()->published()->create(['total_marks' => 10.00]);

        $this->session = ExamSession::create([
            'exam_id'           => $this->exam->id,
            'student_id'        => $this->student->id,
            'question_sequence' => [],
            'status'            => 'submitted',
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  gradeAnswer — Multiple Choice                                      */
    /* ------------------------------------------------------------------ */

    public function test_grade_answer_marks_correct_multiple_choice(): void
    {
        $question = Question::factory()->create([
            'question_type'  => 'multiple_choice',
            'correct_answer' => 'A',
            'points'         => 2.00,
        ]);

        ExamQuestion::create([
            'exam_id'        => $this->exam->id,
            'question_id'    => $question->id,
            'question_order' => 1,
            'points'         => 2.00,
        ]);

        $answer = StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $question->id,
            'selected_option' => ['A'],
            'is_final'        => true,
        ]);

        $this->service->gradeAnswer($answer, $this->session);

        $answer->refresh();
        $this->assertTrue($answer->is_correct);
        $this->assertEquals(2.00, (float) $answer->points_awarded);
    }

    public function test_grade_answer_marks_incorrect_multiple_choice(): void
    {
        $question = Question::factory()->create([
            'question_type'  => 'multiple_choice',
            'correct_answer' => 'A',
            'points'         => 2.00,
        ]);

        ExamQuestion::create([
            'exam_id'        => $this->exam->id,
            'question_id'    => $question->id,
            'question_order' => 1,
            'points'         => 2.00,
        ]);

        $answer = StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $question->id,
            'selected_option' => ['B'],
            'is_final'        => true,
        ]);

        $this->service->gradeAnswer($answer, $this->session);

        $answer->refresh();
        $this->assertFalse($answer->is_correct);
        $this->assertEquals(0, (float) $answer->points_awarded);
    }

    /* ------------------------------------------------------------------ */
    /*  gradeAnswer — True/False                                           */
    /* ------------------------------------------------------------------ */

    public function test_grade_answer_marks_correct_true_false(): void
    {
        $question = Question::factory()->trueFalse()->create([
            'correct_answer' => 'True',
            'points'         => 1.00,
        ]);

        ExamQuestion::create([
            'exam_id'        => $this->exam->id,
            'question_id'    => $question->id,
            'question_order' => 1,
            'points'         => 1.00,
        ]);

        $answer = StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $question->id,
            'selected_option' => ['True'],
            'is_final'        => true,
        ]);

        $this->service->gradeAnswer($answer, $this->session);

        $answer->refresh();
        $this->assertTrue($answer->is_correct);
        $this->assertEquals(1.00, (float) $answer->points_awarded);
    }

    /* ------------------------------------------------------------------ */
    /*  gradeAnswer — Essay / Fill-in-Blank (manual grading required)     */
    /* ------------------------------------------------------------------ */

    public function test_essay_answer_is_flagged_for_manual_grading(): void
    {
        $question = Question::factory()->essay()->create(['points' => 5.00]);

        ExamQuestion::create([
            'exam_id'        => $this->exam->id,
            'question_id'    => $question->id,
            'question_order' => 1,
            'points'         => 5.00,
        ]);

        $answer = StudentAnswer::create([
            'session_id'  => $this->session->id,
            'question_id' => $question->id,
            'answer_text' => 'My essay response here.',
            'is_final'    => true,
        ]);

        $this->service->gradeAnswer($answer, $this->session);

        $answer->refresh();
        $this->assertNull($answer->is_correct); // Null = needs manual grading
        $this->assertEquals(0, (float) $answer->points_awarded);
    }

    public function test_fill_in_blank_is_flagged_for_manual_grading(): void
    {
        $question = Question::factory()->fillInBlank()->create(['points' => 2.00]);

        ExamQuestion::create([
            'exam_id'        => $this->exam->id,
            'question_id'    => $question->id,
            'question_order' => 1,
            'points'         => 2.00,
        ]);

        $answer = StudentAnswer::create([
            'session_id'  => $this->session->id,
            'question_id' => $question->id,
            'answer_text' => 'some text',
            'is_final'    => true,
        ]);

        $this->service->gradeAnswer($answer, $this->session);

        $answer->refresh();
        $this->assertNull($answer->is_correct);
    }

    /* ------------------------------------------------------------------ */
    /*  gradeAnswer — Blank / unanswered                                  */
    /* ------------------------------------------------------------------ */

    public function test_unanswered_question_gets_zero_points(): void
    {
        $question = Question::factory()->create(['points' => 2.00]);

        ExamQuestion::create([
            'exam_id'        => $this->exam->id,
            'question_id'    => $question->id,
            'question_order' => 1,
            'points'         => 2.00,
        ]);

        $answer = StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $question->id,
            'selected_option' => null,
            'answer_text'     => null,
            'is_final'        => true,
        ]);

        $this->service->gradeAnswer($answer, $this->session);

        $answer->refresh();
        $this->assertFalse($answer->is_correct);
        $this->assertEquals(0, (float) $answer->points_awarded);
    }

    /* ------------------------------------------------------------------ */
    /*  needsManualGrading                                                 */
    /* ------------------------------------------------------------------ */

    public function test_needs_manual_grading_returns_true_when_essay_present(): void
    {
        $question = Question::factory()->essay()->create();

        StudentAnswer::create([
            'session_id'  => $this->session->id,
            'question_id' => $question->id,
            'answer_text' => 'Some essay',
            'is_final'    => true,
            'is_correct'  => null,
        ]);

        $this->assertTrue($this->service->needsManualGrading($this->session));
    }

    public function test_needs_manual_grading_returns_false_when_all_graded(): void
    {
        $question = Question::factory()->create(['question_type' => 'multiple_choice']);

        StudentAnswer::create([
            'session_id'      => $this->session->id,
            'question_id'     => $question->id,
            'selected_option' => ['A'],
            'is_final'        => true,
            'is_correct'      => true,
            'points_awarded'  => 1.00,
        ]);

        $this->assertFalse($this->service->needsManualGrading($this->session));
    }

    /* ------------------------------------------------------------------ */
    /*  recalculateSessionScore                                            */
    /* ------------------------------------------------------------------ */

    public function test_recalculate_session_score_sums_awarded_points(): void
    {
        $q1 = Question::factory()->create(['points' => 4.00]);
        $q2 = Question::factory()->create(['points' => 6.00]);

        StudentAnswer::create([
            'session_id'     => $this->session->id,
            'question_id'    => $q1->id,
            'is_final'       => true,
            'is_correct'     => true,
            'points_awarded' => 4.00,
        ]);

        StudentAnswer::create([
            'session_id'     => $this->session->id,
            'question_id'    => $q2->id,
            'is_final'       => true,
            'is_correct'     => true,
            'points_awarded' => 6.00,
        ]);

        $this->service->recalculateSessionScore($this->session);

        $this->session->refresh();
        $this->assertEquals(10.00, (float) $this->session->total_score);
        $this->assertEquals(100.00, (float) $this->session->percentage);
    }

    public function test_recalculate_session_score_partial(): void
    {
        $question = Question::factory()->create(['points' => 10.00]);

        StudentAnswer::create([
            'session_id'     => $this->session->id,
            'question_id'    => $question->id,
            'is_final'       => true,
            'is_correct'     => false,
            'points_awarded' => 0,
        ]);

        $this->service->recalculateSessionScore($this->session);

        $this->session->refresh();
        $this->assertEquals(0.00, (float) $this->session->total_score);
        $this->assertEquals(0.00, (float) $this->session->percentage);
    }
}
