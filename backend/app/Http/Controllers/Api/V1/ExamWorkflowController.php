<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExamFeedbackRequest;
use App\Models\Exam;
use App\Services\ExamWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamWorkflowController extends Controller
{
    public function __construct(private ExamWorkflowService $workflowService)
    {
    }

    /**
     * Submit an exam for HOD review.
     */
    public function submitHod(Exam $exam): JsonResponse
    {
        $this->authorize('update', $exam);
        
        $exam = $this->workflowService->submitForHodReview($exam);

        return response()->json([
            'success' => true,
            'message' => 'Exam submitted for HOD review.',
            'data' => $exam,
        ]);
    }

    /**
     * HOD approves the exam.
     */
    public function hodApprove(Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam); // Ensure they can see it (checked by policy)
        
        $exam = $this->workflowService->approveByHod($exam);

        return response()->json([
            'success' => true,
            'message' => 'Exam approved by HOD.',
            'data' => $exam,
        ]);
    }

    /**
     * HOD rejects the exam.
     */
    public function hodReject(ExamFeedbackRequest $request, Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam);
        
        $exam = $this->workflowService->rejectByHod($exam, $request->user(), $request->validated('comments'));

        return response()->json([
            'success' => true,
            'message' => 'Exam rejected by HOD.',
            'data' => $exam,
        ]);
    }

    /**
     * School Officer approves the exam.
     */
    public function schoolOfficerApprove(Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam);
        
        $exam = $this->workflowService->approveBySchoolOfficer($exam);

        return response()->json([
            'success' => true,
            'message' => 'Exam approved by School Officer.',
            'data' => $exam,
        ]);
    }

    /**
     * School Officer rejects the exam.
     */
    public function schoolOfficerReject(ExamFeedbackRequest $request, Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam);
        
        $exam = $this->workflowService->rejectBySchoolOfficer($exam, $request->user(), $request->validated('comments'));

        return response()->json([
            'success' => true,
            'message' => 'Exam rejected by School Officer.',
            'data' => $exam,
        ]);
    }

    /**
     * CBT marks exam as ready/published.
     */
    public function cbtPublish(Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam); // CBT policy restricted
        
        $exam = $this->workflowService->publishByCbt($exam);

        return response()->json([
            'success' => true,
            'message' => 'Exam published by CBT Admin.',
            'data' => $exam,
        ]);
    }

    // ==============================================
    // POST-EXAM WORKFLOW
    // ==============================================

    /**
     * CBT marks exam as having results synced.
     */
    public function syncResults(Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam);
        
        $exam = $this->workflowService->syncResultsByCbt($exam);

        return response()->json([
            'success' => true,
            'message' => 'Results synced, moving to grading stage.',
            'data' => $exam,
        ]);
    }

    /**
     * Lecturer submits their grading.
     */
    public function submitGrading(Exam $exam): JsonResponse
    {
        $this->authorize('update', $exam); // Must be creator
        
        $exam = $this->workflowService->submitGrading($exam);

        return response()->json([
            'success' => true,
            'message' => 'Grading submitted for review.',
            'data' => $exam,
        ]);
    }

    /**
     * Dept Officer approves the grading.
     */
    public function deptOfficerApprove(Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam);
        
        $exam = $this->workflowService->approveGradingByDeptOfficer($exam);

        return response()->json([
            'success' => true,
            'message' => 'Grading approved and results published.',
            'data' => $exam,
        ]);
    }

    /**
     * Dept Officer rejects the grading.
     */
    public function deptOfficerReject(ExamFeedbackRequest $request, Exam $exam): JsonResponse
    {
        $this->authorize('view', $exam);
        
        $exam = $this->workflowService->rejectGradingByDeptOfficer($exam, $request->user(), $request->validated('comments'));

        return response()->json([
            'success' => true,
            'message' => 'Grading rejected by Dept Officer.',
            'data' => $exam,
        ]);
    }
}
