<?php

namespace App\Services\ExamSession;

use App\Models\ExamSession;
use App\Models\Question;
use App\Models\StudentAnswer;

class GradingService
{
    /**
     * Grade all final answers for a session and update session totals.
     */
    public function gradeSession(ExamSession $session): void
    {
        $answers = $session->finalAnswers()->with('question')->get();

        $totalScore = 0;

        foreach ($answers as $answer) {
            $this->gradeAnswer($answer, $session);
            $totalScore += (float) $answer->points_awarded;
        }

        $totalMarks = (float) $session->exam->total_marks;
        $percentage = $totalMarks > 0 ? round(($totalScore / $totalMarks) * 100, 2) : 0;

        $session->update([
            'total_score' => $totalScore,
            'percentage'  => $percentage,
        ]);
    }

    /**
     * Grade a single answer based on question type.
     */
    public function gradeAnswer(StudentAnswer $answer, ExamSession $session): void
    {
        $question = $answer->question;
        if (! $question) {
            return;
        }

        // Get points for this question from exam_questions pivot
        $examQuestion = $session->exam->examQuestions()
            ->where('question_id', $question->id)
            ->first();

        $maxPoints = $examQuestion ? (float) $examQuestion->points : (float) $question->points;

        $studentAnswer = $this->normalizeAnswer($answer);

        if ($studentAnswer === null || $studentAnswer === '') {
            $answer->update([
                'is_correct'     => false,
                'points_awarded' => 0,
            ]);
            return;
        }

        match ($question->question_type) {
            'multiple_choice' => $this->gradeMultipleChoice($answer, $question, $studentAnswer, $maxPoints),
            'true_false'      => $this->gradeTrueFalse($answer, $question, $studentAnswer, $maxPoints),
            'fill_in_blank'   => $this->gradeFillInBlank($answer, $question, $studentAnswer, $maxPoints),
            'essay'           => $this->gradeEssay($answer, $maxPoints),
            default           => $answer->update(['is_correct' => false, 'points_awarded' => 0]),
        };
    }

    private function normalizeAnswer(StudentAnswer $answer): ?string
    {
        if ($answer->selected_option !== null) {
            return is_array($answer->selected_option)
                ? ($answer->selected_option[0] ?? null)
                : (string) $answer->selected_option;
        }

        return $answer->answer_text;
    }

    private function gradeMultipleChoice(StudentAnswer $answer, Question $question, string $studentAnswer, float $maxPoints): void
    {
        $correctAnswer = $this->getCorrectAnswer($question);
        $isCorrect = strtolower(trim($studentAnswer)) === strtolower(trim($correctAnswer));

        $answer->update([
            'is_correct'     => $isCorrect,
            'points_awarded' => $isCorrect ? $maxPoints : 0,
        ]);
    }

    private function gradeTrueFalse(StudentAnswer $answer, Question $question, string $studentAnswer, float $maxPoints): void
    {
        $correctAnswer = $this->getCorrectAnswer($question);
        $isCorrect = strtolower(trim($studentAnswer)) === strtolower(trim($correctAnswer));

        $answer->update([
            'is_correct'     => $isCorrect,
            'points_awarded' => $isCorrect ? $maxPoints : 0,
        ]);
    }

    private function gradeFillInBlank(StudentAnswer $answer, Question $question, string $studentAnswer, float $maxPoints): void
    {
        // Fill-in-blank requires manual grading for real exams — award 0 for now
        $answer->update([
            'is_correct'     => null,
            'points_awarded' => 0,
        ]);
    }

    private function gradeEssay(StudentAnswer $answer, float $maxPoints): void
    {
        // Essay questions require manual grading — award 0 for now
        $answer->update([
            'is_correct'     => null,
            'points_awarded' => 0,
        ]);
    }

    /**
     * Check if a session has any final answers still needing manual grading.
     */
    public function needsManualGrading(ExamSession $session): bool
    {
        return $session->finalAnswers()
            ->whereNull('is_correct')
            ->whereHas('question', function ($q) {
                $q->whereIn('question_type', ['fill_in_blank', 'essay']);
            })
            ->exists();
    }

    /**
     * Recalculate session total_score and percentage from all final answers.
     */
    public function recalculateSessionScore(ExamSession $session): void
    {
        $totalScore = (float) $session->finalAnswers()->sum('points_awarded');
        $totalMarks = (float) $session->exam->total_marks;
        $percentage = $totalMarks > 0 ? round(($totalScore / $totalMarks) * 100, 2) : 0;

        $session->update([
            'total_score' => $totalScore,
            'percentage'  => $percentage,
        ]);
    }

    private function getCorrectAnswer(Question $question): string
    {
        $correct = $question->correct_answer;

        if (is_array($correct)) {
            return $correct[0] ?? '';
        }

        return (string) ($correct ?? '');
    }
}
