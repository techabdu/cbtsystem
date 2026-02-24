<?php

namespace App\Http\Controllers\Api\V1\ExamSession;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\ExamSession;
use App\Services\ExamSession\SessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamSessionController extends Controller
{
    public function __construct(
        private SessionService $sessionService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  GET /exam-sessions/{id}/status                                     */
    /* ------------------------------------------------------------------ */

    public function status(int $id): JsonResponse
    {
        $session = $this->findAuthorizedSession($id);
        if (! $session) {
            return ResponseHelper::error('Session not found or unauthorized.', 404);
        }

        if ($session->isSubmitted()) {
            return ResponseHelper::error('This exam has already been submitted.', 409);
        }

        if ($session->isTimedOut()) {
            // Auto-submit on timeout
            $result = $this->sessionService->submitExam($session, true);
            return ResponseHelper::success($result, 'Exam auto-submitted due to timeout.');
        }

        $data = $this->sessionService->getSessionStatus($session);

        return ResponseHelper::success($data, 'Session status retrieved.');
    }

    /* ------------------------------------------------------------------ */
    /*  GET /exam-sessions/{id}/questions                                  */
    /* ------------------------------------------------------------------ */

    public function questions(int $id): JsonResponse
    {
        $session = $this->findAuthorizedSession($id);
        if (! $session) {
            return ResponseHelper::error('Session not found or unauthorized.', 404);
        }

        if ($session->isSubmitted()) {
            return ResponseHelper::error('This exam has already been submitted.', 409);
        }

        if ($session->isTimedOut()) {
            $result = $this->sessionService->submitExam($session, true);
            return ResponseHelper::success($result, 'Exam auto-submitted due to timeout.');
        }

        $questions = $this->sessionService->getAllQuestions($session);

        return ResponseHelper::success([
            'questions'              => $questions,
            'total'                  => count($questions),
            'time_remaining_seconds' => $session->getTimeRemainingSeconds(),
            'allow_backtrack'        => $session->exam->allow_backtrack,
        ], 'Questions retrieved.');
    }

    /* ------------------------------------------------------------------ */
    /*  GET /exam-sessions/{id}/questions/{index}                          */
    /* ------------------------------------------------------------------ */

    public function question(int $id, int $index): JsonResponse
    {
        $session = $this->findAuthorizedSession($id);
        if (! $session) {
            return ResponseHelper::error('Session not found or unauthorized.', 404);
        }

        if ($session->isSubmitted()) {
            return ResponseHelper::error('This exam has already been submitted.', 409);
        }

        if ($session->isTimedOut()) {
            $result = $this->sessionService->submitExam($session, true);
            return ResponseHelper::success($result, 'Exam auto-submitted due to timeout.');
        }

        $data = $this->sessionService->getQuestion($session, $index);

        if (! $data) {
            return ResponseHelper::error('Question not found at this index.', 404);
        }

        return ResponseHelper::success($data, 'Question retrieved.');
    }

    /* ------------------------------------------------------------------ */
    /*  POST /exam-sessions/{id}/answers                                   */
    /* ------------------------------------------------------------------ */

    public function saveAnswer(Request $request, int $id): JsonResponse
    {
        $session = $this->findAuthorizedSession($id);
        if (! $session) {
            return ResponseHelper::error('Session not found or unauthorized.', 404);
        }

        if ($session->isSubmitted()) {
            return ResponseHelper::error('This exam has already been submitted.', 409);
        }

        if ($session->isTimedOut()) {
            $result = $this->sessionService->submitExam($session, true);
            return ResponseHelper::success($result, 'Exam auto-submitted due to timeout.');
        }

        $validated = $request->validate([
            'question_id' => 'required|integer',
            'answer'      => 'nullable|string',
            'is_flagged'  => 'sometimes|boolean',
        ]);

        // Verify question is in the session's sequence
        $sequence = $session->question_sequence ?? [];
        if (! in_array((int) $validated['question_id'], $sequence)) {
            return ResponseHelper::error('This question is not part of your exam.', 422);
        }

        $answer = $this->sessionService->saveAnswer(
            $session,
            (int) $validated['question_id'],
            $validated['answer'] ?? null,
            $validated['is_flagged'] ?? false,
        );

        return ResponseHelper::success([
            'question_id' => $answer->question_id,
            'version'     => $answer->version,
            'saved_at'    => $answer->last_updated_at?->toIso8601String(),
        ], 'Answer saved.');
    }

    /* ------------------------------------------------------------------ */
    /*  POST /exam-sessions/{id}/answers/batch                             */
    /* ------------------------------------------------------------------ */

    public function saveAnswersBatch(Request $request, int $id): JsonResponse
    {
        $session = $this->findAuthorizedSession($id);
        if (! $session) {
            return ResponseHelper::error('Session not found or unauthorized.', 404);
        }

        if ($session->isSubmitted()) {
            return ResponseHelper::error('This exam has already been submitted.', 409);
        }

        if ($session->isTimedOut()) {
            $result = $this->sessionService->submitExam($session, true);
            return ResponseHelper::success($result, 'Exam auto-submitted due to timeout.');
        }

        $validated = $request->validate([
            'answers'              => 'required|array|min:1',
            'answers.*.question_id' => 'required|integer',
            'answers.*.answer'      => 'nullable|string',
            'answers.*.is_flagged'  => 'sometimes|boolean',
        ]);

        $sequence = $session->question_sequence ?? [];
        $saved = [];

        foreach ($validated['answers'] as $item) {
            if (! in_array((int) $item['question_id'], $sequence)) {
                continue;
            }

            $answer = $this->sessionService->saveAnswer(
                $session,
                (int) $item['question_id'],
                $item['answer'] ?? null,
                $item['is_flagged'] ?? false,
            );

            $saved[] = [
                'question_id' => $answer->question_id,
                'version'     => $answer->version,
            ];
        }

        return ResponseHelper::success([
            'saved_count' => count($saved),
            'saved'       => $saved,
        ], 'Answers saved.');
    }

    /* ------------------------------------------------------------------ */
    /*  POST /exam-sessions/{id}/flag                                      */
    /* ------------------------------------------------------------------ */

    public function toggleFlag(Request $request, int $id): JsonResponse
    {
        $session = $this->findAuthorizedSession($id);
        if (! $session) {
            return ResponseHelper::error('Session not found or unauthorized.', 404);
        }

        if ($session->isSubmitted()) {
            return ResponseHelper::error('This exam has already been submitted.', 409);
        }

        $validated = $request->validate([
            'question_id' => 'required|integer',
        ]);

        $isFlagged = $this->sessionService->toggleFlag($session, (int) $validated['question_id']);

        return ResponseHelper::success([
            'question_id' => (int) $validated['question_id'],
            'is_flagged'  => $isFlagged,
        ], 'Flag toggled.');
    }

    /* ------------------------------------------------------------------ */
    /*  POST /exam-sessions/{id}/submit                                    */
    /* ------------------------------------------------------------------ */

    public function submit(int $id): JsonResponse
    {
        $session = $this->findAuthorizedSession($id);
        if (! $session) {
            return ResponseHelper::error('Session not found or unauthorized.', 404);
        }

        if ($session->isSubmitted()) {
            return ResponseHelper::error('This exam has already been submitted.', 409);
        }

        $result = $this->sessionService->submitExam($session, $session->isTimedOut());

        return ResponseHelper::success($result, 'Exam submitted successfully.');
    }

    /* ------------------------------------------------------------------ */
    /*  Helper: Find session and verify ownership                          */
    /* ------------------------------------------------------------------ */

    private function findAuthorizedSession(int $id): ?ExamSession
    {
        $user = auth()->user();
        if (! $user) {
            return null;
        }

        return ExamSession::where('id', $id)
            ->where('student_id', $user->id)
            ->with('exam')
            ->first();
    }
}
