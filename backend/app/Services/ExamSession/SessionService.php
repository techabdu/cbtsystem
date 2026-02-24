<?php

namespace App\Services\ExamSession;

use App\Models\ActivityLog;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\SessionSnapshot;
use App\Models\StudentAnswer;
use Illuminate\Support\Facades\DB;

class SessionService
{
    public function __construct(
        private GradingService $gradingService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Get session status + exam info                                     */
    /* ------------------------------------------------------------------ */

    public function getSessionStatus(ExamSession $session): array
    {
        $session->load('exam.course');

        $answeredIds = StudentAnswer::where('session_id', $session->id)
            ->where('is_final', true)
            ->pluck('question_id')
            ->toArray();

        $flaggedIds = StudentAnswer::where('session_id', $session->id)
            ->where('is_final', true)
            ->where('is_flagged', true)
            ->pluck('question_id')
            ->toArray();

        return [
            'session_id'             => $session->id,
            'session_uuid'           => $session->uuid,
            'status'                 => $session->status,
            'time_remaining_seconds' => $session->getTimeRemainingSeconds(),
            'current_question_index' => $session->current_question_index,
            'total_questions'        => $session->getTotalQuestionsCount(),
            'questions_answered'     => count($answeredIds),
            'answered_question_ids'  => $answeredIds,
            'flagged_question_ids'   => $flaggedIds,
            'exam' => [
                'id'               => $session->exam->id,
                'title'            => $session->exam->title,
                'course_code'      => $session->exam->course?->code,
                'course_title'     => $session->exam->course?->title,
                'duration_minutes' => $session->exam->duration_minutes,
                'total_marks'      => (float) $session->exam->total_marks,
                'allow_backtrack'  => $session->exam->allow_backtrack,
                'instructions'     => $session->exam->instructions,
            ],
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Get a question by index in the session's question sequence         */
    /* ------------------------------------------------------------------ */

    public function getQuestion(ExamSession $session, int $index): ?array
    {
        $sequence = $session->question_sequence;
        if (! is_array($sequence) || $index < 0 || $index >= count($sequence)) {
            return null;
        }

        $questionId = $sequence[$index];

        $examQuestion = $session->exam->examQuestions()
            ->where('question_id', $questionId)
            ->with(['question' => function ($q) {
                $q->select('id', 'question_text', 'question_type', 'options', 'image_url');
            }])
            ->first();

        if (! $examQuestion || ! $examQuestion->question) {
            return null;
        }

        // Get existing answer for this question
        $existingAnswer = StudentAnswer::where('session_id', $session->id)
            ->where('question_id', $questionId)
            ->where('is_final', true)
            ->first();

        // Update current index
        $session->update([
            'current_question_index' => $index,
            'last_activity_at'       => now(),
        ]);

        return [
            'index'         => $index,
            'total'         => count($sequence),
            'question_id'   => $questionId,
            'question_text' => $examQuestion->question->question_text,
            'question_type' => $examQuestion->question->question_type,
            'options'       => $examQuestion->question->options,
            'image_url'     => $examQuestion->question->image_url,
            'points'        => (float) $examQuestion->points,
            'saved_answer'  => $existingAnswer ? [
                'answer'     => $existingAnswer->answer_text ?? $existingAnswer->selected_option,
                'is_flagged' => $existingAnswer->is_flagged,
            ] : null,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Get all questions (for loading entire exam at once)                 */
    /* ------------------------------------------------------------------ */

    public function getAllQuestions(ExamSession $session): array
    {
        $sequence = $session->question_sequence ?? [];

        $examQuestions = $session->exam->examQuestions()
            ->whereIn('question_id', $sequence)
            ->with(['question' => function ($q) {
                $q->select('id', 'question_text', 'question_type', 'options', 'image_url');
            }])
            ->get()
            ->keyBy('question_id');

        // Get all existing answers
        $existingAnswers = StudentAnswer::where('session_id', $session->id)
            ->where('is_final', true)
            ->get()
            ->keyBy('question_id');

        $questions = [];
        foreach ($sequence as $idx => $questionId) {
            $eq = $examQuestions->get($questionId);
            if (! $eq || ! $eq->question) {
                continue;
            }

            $existingAnswer = $existingAnswers->get($questionId);

            $questions[] = [
                'index'         => $idx,
                'question_id'   => $questionId,
                'question_text' => $eq->question->question_text,
                'question_type' => $eq->question->question_type,
                'options'       => $eq->question->options,
                'image_url'     => $eq->question->image_url,
                'points'        => (float) $eq->points,
                'saved_answer'  => $existingAnswer ? [
                    'answer'     => $existingAnswer->answer_text ?? $existingAnswer->selected_option,
                    'is_flagged' => $existingAnswer->is_flagged,
                ] : null,
            ];
        }

        $session->update(['last_activity_at' => now()]);

        return $questions;
    }

    /* ------------------------------------------------------------------ */
    /*  Save an answer                                                     */
    /* ------------------------------------------------------------------ */

    public function saveAnswer(ExamSession $session, int $questionId, ?string $answer, bool $isFlagged = false): StudentAnswer
    {
        // Determine if answer is text or selected option based on question type
        $question = Question::find($questionId);
        $isOptionType = $question && in_array($question->question_type, ['multiple_choice', 'true_false']);

        // Mark any previous final answer for this question as non-final
        StudentAnswer::where('session_id', $session->id)
            ->where('question_id', $questionId)
            ->where('is_final', true)
            ->update(['is_final' => false]);

        // Get version number
        $version = StudentAnswer::where('session_id', $session->id)
            ->where('question_id', $questionId)
            ->max('version') ?? 0;

        $studentAnswer = StudentAnswer::create([
            'session_id'      => $session->id,
            'question_id'     => $questionId,
            'answer_text'     => $isOptionType ? null : $answer,
            'selected_option' => $isOptionType ? ($answer ? [$answer] : null) : null,
            'is_flagged'      => $isFlagged,
            'version'         => $version + 1,
            'is_final'        => true,
            'first_answered_at' => $version === 0 ? now() : StudentAnswer::where('session_id', $session->id)
                ->where('question_id', $questionId)
                ->min('first_answered_at') ?? now(),
            'last_updated_at' => now(),
        ]);

        // Update session counters
        $answeredCount = StudentAnswer::where('session_id', $session->id)
            ->where('is_final', true)
            ->whereNotNull('answer_text')
            ->orWhere(function ($q) use ($session) {
                $q->where('session_id', $session->id)
                  ->where('is_final', true)
                  ->whereNotNull('selected_option');
            })
            ->distinct('question_id')
            ->count('question_id');

        $session->update([
            'questions_answered' => $answeredCount,
            'last_activity_at'   => now(),
        ]);

        // Auto-snapshot every 10 answers
        if ($answeredCount > 0 && $answeredCount % 10 === 0) {
            $this->createSnapshot($session, 'auto_save');
        }

        return $studentAnswer;
    }

    /* ------------------------------------------------------------------ */
    /*  Toggle flag on a question                                          */
    /* ------------------------------------------------------------------ */

    public function toggleFlag(ExamSession $session, int $questionId): bool
    {
        $answer = StudentAnswer::where('session_id', $session->id)
            ->where('question_id', $questionId)
            ->where('is_final', true)
            ->first();

        if ($answer) {
            $newFlag = ! $answer->is_flagged;
            $answer->update(['is_flagged' => $newFlag]);
            return $newFlag;
        }

        // No answer yet — create a placeholder flagged entry
        StudentAnswer::create([
            'session_id'       => $session->id,
            'question_id'      => $questionId,
            'is_flagged'       => true,
            'version'          => 1,
            'is_final'         => true,
            'first_answered_at' => now(),
            'last_updated_at'  => now(),
        ]);

        return true;
    }

    /* ------------------------------------------------------------------ */
    /*  Submit the exam                                                    */
    /* ------------------------------------------------------------------ */

    public function submitExam(ExamSession $session, bool $isAutoSubmit = false): array
    {
        return DB::transaction(function () use ($session, $isAutoSubmit) {
            // Create final snapshot before grading
            $this->createSnapshot($session, 'checkpoint');

            // Grade all final answers
            $this->gradingService->gradeSession($session);

            // Reload to get updated scores
            $session->refresh();

            $status = $isAutoSubmit ? 'auto_submitted' : 'submitted';

            $session->update([
                'status'          => $status,
                'submitted_at'    => now(),
                'actual_end_time' => now(),
                'last_activity_at' => now(),
            ]);

            ActivityLog::create([
                'user_id'     => $session->student_id,
                'session_id'  => $session->id,
                'action'      => $isAutoSubmit ? 'exam_auto_submitted' : 'exam_submitted',
                'entity_type' => 'exam_session',
                'entity_id'   => $session->id,
                'description' => $isAutoSubmit
                    ? 'Exam auto-submitted due to timeout'
                    : 'Student submitted exam',
                'metadata'    => [
                    'total_score' => (float) $session->total_score,
                    'percentage'  => (float) $session->percentage,
                ],
            ]);

            // Build results
            $finalAnswers = $session->finalAnswers()
                ->with('question')
                ->get();

            $results = $finalAnswers->map(function ($a) use ($session) {
                $eq = $session->exam->examQuestions()
                    ->where('question_id', $a->question_id)
                    ->first();

                return [
                    'question_id'     => $a->question_id,
                    'question_text'   => $a->question?->question_text,
                    'question_type'   => $a->question?->question_type,
                    'your_answer'     => $a->answer_text ?? ($a->selected_option[0] ?? null),
                    'correct_answer'  => $session->exam->show_correct_answers
                        ? $this->getCorrectAnswerDisplay($a->question)
                        : null,
                    'is_correct'      => $a->is_correct,
                    'points_awarded'  => (float) $a->points_awarded,
                    'points_possible' => $eq ? (float) $eq->points : 0,
                ];
            })->toArray();

            return [
                'session_id'      => $session->id,
                'status'          => $status,
                'total_score'     => (float) $session->total_score,
                'total_marks'     => (float) $session->exam->total_marks,
                'percentage'      => (float) $session->percentage,
                'passed'          => $session->hasPassed(),
                'correct_count'   => $finalAnswers->where('is_correct', true)->count(),
                'total_questions' => $session->getTotalQuestionsCount(),
                'show_results'    => $session->exam->show_results_immediately,
                'show_answers'    => $session->exam->show_correct_answers,
                'results'         => $session->exam->show_results_immediately ? $results : [],
            ];
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Create a session snapshot                                          */
    /* ------------------------------------------------------------------ */

    public function createSnapshot(ExamSession $session, string $type = 'auto_save'): SessionSnapshot
    {
        $answers = StudentAnswer::where('session_id', $session->id)
            ->where('is_final', true)
            ->get()
            ->map(fn ($a) => [
                'question_id'     => $a->question_id,
                'answer_text'     => $a->answer_text,
                'selected_option' => $a->selected_option,
                'is_flagged'      => $a->is_flagged,
                'version'         => $a->version,
            ])
            ->toArray();

        return SessionSnapshot::create([
            'session_id'    => $session->id,
            'snapshot_type' => $type,
            'snapshot_data' => [
                'current_question_index' => $session->current_question_index,
                'questions_answered'     => $session->questions_answered,
                'answers'                => $answers,
                'time_remaining'         => $session->getTimeRemainingSeconds(),
            ],
            'created_at' => now(),
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private function getCorrectAnswerDisplay(?Question $question): ?string
    {
        if (! $question) {
            return null;
        }

        $correct = $question->correct_answer;

        if (is_array($correct)) {
            return $correct[0] ?? null;
        }

        return $correct;
    }
}
