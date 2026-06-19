<?php

namespace App\Http\Controllers\Api\V1\Exam;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Exam;
use App\Models\StudentAnswer;
use App\Services\ExamSession\GradingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManualGradingController extends Controller
{
    public function __construct(
        private GradingService $gradingService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Index — Fetch all sessions with ungraded answers for an exam       */
    /* ------------------------------------------------------------------ */

    public function index(string $id, Request $request): JsonResponse
    {
        $exam = Exam::with(['course'])->where('uuid', $id)->firstOrFail();

        if (! $this->canGrade($exam, $request->user())) {
            return ResponseHelper::error('You do not have access to grade this exam.', 403);
        }

        $sessions = $exam->sessions()
            ->with('student')
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->get();

        $gradingSessions = [];

        foreach ($sessions as $session) {
            // Get ungraded final answers (fill_in_blank + essay with is_correct = null)
            $ungradedAnswers = StudentAnswer::where('session_id', $session->id)
                ->where('is_final', true)
                ->whereNull('is_correct')
                ->whereHas('question', function ($q) {
                    $q->whereIn('question_type', ['fill_in_blank', 'essay']);
                })
                ->with('question')
                ->get();

            if ($ungradedAnswers->isEmpty()) {
                continue;
            }

            $gradingSessions[] = [
                'session_id'     => $session->id,
                'student_id'     => $session->student_id,
                'student_name'   => $session->student?->full_name,
                'student_matric' => $session->student?->student_id,
                'status'         => $session->status,
                'total_score'    => (float) $session->total_score,
                'percentage'     => (float) $session->percentage,
                'submitted_at'   => $session->submitted_at?->toIso8601String(),
                'ungraded_answers' => $ungradedAnswers->map(function ($answer) use ($exam) {
                    $examQuestion = $exam->examQuestions()
                        ->where('question_id', $answer->question_id)
                        ->first();

                    return [
                        'id'              => $answer->id,
                        'question_id'     => $answer->question_id,
                        'question_text'   => $answer->question?->question_text,
                        'question_type'   => $answer->question?->question_type,
                        'answer_text'     => $answer->answer_text,
                        'max_points'      => $examQuestion ? (float) $examQuestion->points : 0,
                        'points_awarded'  => (float) $answer->points_awarded,
                        'is_correct'      => $answer->is_correct,
                    ];
                })->values()->toArray(),
                'total_ungraded' => $ungradedAnswers->count(),
            ];
        }

        return ResponseHelper::success([
            'exam_id'                   => $exam->id,
            'exam_title'                => $exam->title,
            'course_code'               => $exam->course?->code,
            'total_sessions'            => $sessions->count(),
            'sessions_needing_grading'  => count($gradingSessions),
            'sessions'                  => $gradingSessions,
        ], 'Manual grading data retrieved successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Summary — Grading progress for an exam                             */
    /* ------------------------------------------------------------------ */

    public function summary(string $id, Request $request): JsonResponse
    {
        $exam = Exam::where('uuid', $id)->firstOrFail();

        if (! $this->canGrade($exam, $request->user())) {
            return ResponseHelper::error('You do not have access to this exam.', 403);
        }

        $sessions = $exam->sessions()
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->get();

        $totalSessions = $sessions->count();
        $sessionsNeedingGrading = 0;
        $totalUngradedAnswers = 0;

        foreach ($sessions as $session) {
            $ungradedCount = StudentAnswer::where('session_id', $session->id)
                ->where('is_final', true)
                ->whereNull('is_correct')
                ->whereHas('question', function ($q) {
                    $q->whereIn('question_type', ['fill_in_blank', 'essay']);
                })
                ->count();

            if ($ungradedCount > 0) {
                $sessionsNeedingGrading++;
                $totalUngradedAnswers += $ungradedCount;
            }
        }

        return ResponseHelper::success([
            'total_sessions'            => $totalSessions,
            'sessions_needing_grading'  => $sessionsNeedingGrading,
            'sessions_fully_graded'     => $totalSessions - $sessionsNeedingGrading,
            'total_ungraded_answers'    => $totalUngradedAnswers,
            'results_status'            => $exam->results_status ?? 'pending_grading',
        ], 'Grading summary retrieved successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Grade Answer — Lecturer grades a single student answer             */
    /* ------------------------------------------------------------------ */

    public function gradeAnswer(int $id, Request $request): JsonResponse
    {
        $answer = StudentAnswer::with(['question', 'session.exam'])->findOrFail($id);
        $exam = $answer->session->exam;
        $user = $request->user();

        if (! $this->canGrade($exam, $user)) {
            return ResponseHelper::error('You do not have access to grade this answer.', 403);
        }

        // Get max points from exam_questions pivot
        $examQuestion = $exam->examQuestions()
            ->where('question_id', $answer->question_id)
            ->first();

        $maxPoints = $examQuestion ? (float) $examQuestion->points : 0;

        $request->validate([
            'points_awarded' => ['required', 'numeric', 'min:0', "max:{$maxPoints}"],
            'feedback'       => ['nullable', 'string', 'max:1000'],
        ]);

        $pointsAwarded = (float) $request->input('points_awarded');

        $answer->update([
            'points_awarded' => $pointsAwarded,
            'is_correct'     => $pointsAwarded > 0,
        ]);

        // Recalculate session score
        $this->gradingService->recalculateSessionScore($answer->session);
        $answer->session->refresh();

        ActivityLog::log(
            action: 'answer_manually_graded',
            entityType: 'student_answer',
            entityId: $answer->id,
            extra: [
                'new_values' => [
                    'points_awarded' => $pointsAwarded,
                    'max_points'     => $maxPoints,
                    'feedback'       => $request->input('feedback'),
                ],
                'metadata' => [
                    'user_id'    => $user->id,
                    'session_id' => $answer->session_id,
                    'exam_id'    => $exam->id,
                ],
            ],
        );

        return ResponseHelper::success([
            'answer_id'      => $answer->id,
            'points_awarded' => $pointsAwarded,
            'max_points'     => $maxPoints,
            'is_correct'     => $pointsAwarded > 0,
            'session_score'  => [
                'total_score' => (float) $answer->session->total_score,
                'percentage'  => (float) $answer->session->percentage,
            ],
        ], 'Answer graded successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Authorization helper                                               */
    /* ------------------------------------------------------------------ */

    private function canGrade(Exam $exam, $user): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role === 'lecturer') {
            // Exam creator or HOD can grade
            return $exam->created_by === $user->id || $user->is_hod;
        }

        return false;
    }
}
