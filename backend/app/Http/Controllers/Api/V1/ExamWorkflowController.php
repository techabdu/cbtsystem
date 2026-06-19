<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExamFeedbackRequest;
use App\Models\Exam;
use App\Models\ExamFeedback;
use App\Services\Exam\ExamService;
use Illuminate\Http\JsonResponse;

/**
 * ExamWorkflowController
 *
 * Handles the multi-step exam approval pipeline:
 *
 *  PRE-EXAM:
 *    Lecturer → submitHod   → pending_review
 *    HOD      → hodApprove  → verified
 *    HOD      → hodReject   → draft  (+ feedback)
 *    School / CBT Admin → schoolOfficerApprove / cbtPublish → published
 *    School Officer     → schoolOfficerReject → draft (+ feedback)
 *
 *  POST-EXAM (results workflow via results_status):
 *    CBT        → syncResults      → results_status = pending_grading
 *    Lecturer   → submitGrading    → results_status = grading_submitted
 *    Dept Off.  → deptOfficerApprove → results_status = results_verified
 *    Dept Off.  → deptOfficerReject  → results_status = pending_grading  (+ feedback)
 *    Edu Portal → publishResults     → results_status = results_published
 */
class ExamWorkflowController extends Controller
{
    public function __construct(private ExamService $service) {}

    /* ------------------------------------------------------------------ */
    /*  PRE-EXAM WORKFLOW                                                   */
    /* ------------------------------------------------------------------ */

    /**
     * Lecturer submits a draft exam for HOD review.
     * draft → pending_review
     */
    public function submitHod(Exam $exam): JsonResponse
    {
        $this->authorize('update', $exam);

        $exam = $this->service->submitForReview($exam, request()->user());

        return response()->json([
            'success' => true,
            'message' => 'Exam submitted for HOD review.',
            'data'    => $exam,
        ]);
    }

    /**
     * HOD approves a pending_review exam.
     * pending_review → verified
     */
    public function hodApprove(Exam $exam): JsonResponse
    {
        $this->authorize('approveAsHod', $exam);

        $exam = $this->service->verifyExam($exam, request()->user());

        return response()->json([
            'success' => true,
            'message' => 'Exam verified by HOD. Awaiting publishing.',
            'data'    => $exam,
        ]);
    }

    /**
     * HOD rejects a pending_review exam back to draft.
     * pending_review → draft  (creates ExamFeedback)
     */
    public function hodReject(ExamFeedbackRequest $request, Exam $exam): JsonResponse
    {
        $this->authorize('approveAsHod', $exam);

        $comments = $request->validated('comments');

        $exam = $this->service->rejectExam($exam, $request->user(), $comments);

        ExamFeedback::create([
            'exam_id'      => $exam->id,
            'user_id'      => $request->user()->id,
            'recipient_id' => $exam->created_by,
            'stage'        => 'pending_review',
            'comments'     => $comments,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Exam rejected by HOD and returned to draft.',
            'data'    => $exam,
        ]);
    }

    /**
     * School Officer publishes a verified exam.
     * verified → published
     */
    public function schoolOfficerApprove(Exam $exam): JsonResponse
    {
        $this->authorize('approveAsSchoolOfficer', $exam);

        $exam = $this->service->publish($exam, request()->user());

        return response()->json([
            'success' => true,
            'message' => 'Exam published.',
            'data'    => $exam,
        ]);
    }

    /**
     * School Officer rejects a verified exam back to draft.
     * verified → draft  (creates ExamFeedback)
     */
    public function schoolOfficerReject(ExamFeedbackRequest $request, Exam $exam): JsonResponse
    {
        $this->authorize('approveAsSchoolOfficer', $exam);

        $comments = $request->validated('comments');

        $exam = $this->service->rejectExam($exam, $request->user(), $comments);

        ExamFeedback::create([
            'exam_id'      => $exam->id,
            'user_id'      => $request->user()->id,
            'recipient_id' => $exam->created_by,
            'stage'        => 'verified',
            'comments'     => $comments,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Exam rejected by School Officer and returned to draft.',
            'data'    => $exam,
        ]);
    }

    /**
     * CBT Admin publishes a verified exam.
     * verified → published
     */
    public function cbtPublish(Exam $exam): JsonResponse
    {
        $this->authorize('publishAsCbt', $exam);

        $exam = $this->service->publish($exam, request()->user());

        return response()->json([
            'success' => true,
            'message' => 'Exam published by CBT Admin.',
            'data'    => $exam,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  POST-EXAM WORKFLOW                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * CBT marks results as synced — starts the grading workflow.
     * published → results_status = pending_grading
     */
    public function syncResults(Exam $exam): JsonResponse
    {
        $this->authorize('syncResultsAsCbt', $exam);

        $exam->update(['results_status' => 'pending_grading']);

        return response()->json([
            'success' => true,
            'message' => 'Results synced. Exam is now in grading stage.',
            'data'    => $exam->fresh(),
        ]);
    }

    /**
     * Lecturer submits grading for verification.
     * results_status: pending_grading → grading_submitted
     */
    public function submitGrading(Exam $exam): JsonResponse
    {
        $this->authorize('update', $exam);

        $exam = $this->service->submitGrading($exam, request()->user());

        return response()->json([
            'success' => true,
            'message' => 'Grading submitted for verification.',
            'data'    => $exam,
        ]);
    }

    /**
     * Dept Officer approves grading → results verified.
     * results_status: grading_submitted → results_verified
     */
    public function deptOfficerApprove(Exam $exam): JsonResponse
    {
        $this->authorize('approveGradingAsDeptOfficer', $exam);

        $exam = $this->service->verifyResults($exam, request()->user());

        return response()->json([
            'success' => true,
            'message' => 'Grading verified by Dept Officer. Results ready to publish.',
            'data'    => $exam,
        ]);
    }

    /**
     * Dept Officer rejects grading — returns to lecturer.
     * results_status: grading_submitted → pending_grading  (creates ExamFeedback)
     */
    public function deptOfficerReject(ExamFeedbackRequest $request, Exam $exam): JsonResponse
    {
        $this->authorize('approveGradingAsDeptOfficer', $exam);

        $comments = $request->validated('comments');

        $exam = $this->service->rejectGrading($exam, $request->user(), $comments);

        ExamFeedback::create([
            'exam_id'      => $exam->id,
            'user_id'      => $request->user()->id,
            'recipient_id' => $exam->created_by,
            'stage'        => 'grading_submitted',
            'comments'     => $comments,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Grading rejected by Dept Officer. Returned to lecturer.',
            'data'    => $exam,
        ]);
    }

    /**
     * Edu Portal admin publishes verified results to students.
     * results_status: results_verified → results_published
     */
    public function publishResults(Exam $exam): JsonResponse
    {
        $this->authorize('publishResultsAsEduPortal', $exam);

        $exam = $this->service->publishResults($exam, request()->user());

        return response()->json([
            'success' => true,
            'message' => 'Results published. Students can now view their scores.',
            'data'    => $exam,
        ]);
    }
}
