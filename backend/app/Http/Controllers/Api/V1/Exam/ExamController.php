<?php

namespace App\Http\Controllers\Api\V1\Exam;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Exam\AddExamQuestionsRequest;
use App\Http\Requests\Exam\CreateExamRequest;
use App\Http\Requests\Exam\UpdateExamRequest;
use App\Http\Resources\ExamResource;
use App\Services\Exam\ExamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamController extends Controller
{
    public function __construct(
        private ExamService $examService
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Index — List exams (role-aware)                                    */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search', 'course_id', 'exam_type', 'status', 'results_status',
            'is_practice', 'trashed', 'per_page', 'page', 'sort_by', 'sort_dir',
        ]);

        $paginator = $this->examService->list($filters, $request->user());

        return ResponseHelper::paginated($paginator, 'Exams retrieved successfully', ExamResource::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Show — Single exam                                                 */
    /* ------------------------------------------------------------------ */

    public function show(int $id, Request $request): JsonResponse
    {
        $exam = $this->examService->find($id);
        $user = $request->user();

        // Lecturers can only view their own exams (HODs can view any exam for review)
        if ($user->role === 'lecturer' && ! $user->is_hod && $exam->created_by !== $user->id) {
            return ResponseHelper::error('You do not have access to this exam.', 403);
        }

        return ResponseHelper::success(
            new ExamResource($exam),
            'Exam retrieved successfully'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Store — Create exam                                                */
    /* ------------------------------------------------------------------ */

    public function store(CreateExamRequest $request): JsonResponse
    {
        $user = $request->user();

        // Lecturers can only create exams for courses they are assigned to
        if ($user->role === 'lecturer') {
            $assignedCourseIds = $user->taughtCourses()->pluck('courses.id')->toArray();
            if (! in_array($request->course_id, $assignedCourseIds)) {
                return ResponseHelper::error('You can only create exams for courses you are assigned to.', 403);
            }
        }

        $exam = $this->examService->create($request->validated(), $user);

        return ResponseHelper::success(
            new ExamResource($exam),
            'Exam created successfully',
            201
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Update — Modify exam                                               */
    /* ------------------------------------------------------------------ */

    public function update(int $id, UpdateExamRequest $request): JsonResponse
    {
        $exam = $this->examService->find($id);
        $user = $request->user();

        // Lecturers can only update their own exams
        if ($user->role === 'lecturer' && $exam->created_by !== $user->id) {
            return ResponseHelper::error('You can only edit your own exams.', 403);
        }

        try {
            $updated = $this->examService->update($exam, $request->validated(), $user);
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(
            new ExamResource($updated),
            'Exam updated successfully'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Destroy — Soft-delete exam                                         */
    /* ------------------------------------------------------------------ */

    public function destroy(int $id, Request $request): JsonResponse
    {
        $exam = $this->examService->find($id);
        $user = $request->user();

        // Lecturers can only delete their own exams
        if ($user->role === 'lecturer' && $exam->created_by !== $user->id) {
            return ResponseHelper::error('You can only delete your own exams.', 403);
        }

        try {
            $this->examService->delete($exam, $user);
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 409);
        }

        return ResponseHelper::success(null, 'Exam deleted successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Restore — Restore soft-deleted exam                                */
    /* ------------------------------------------------------------------ */

    public function restore(int $id, Request $request): JsonResponse
    {
        $user = $request->user();

        // Only admins can restore (or the creator)
        if ($user->role === 'lecturer') {
            return ResponseHelper::error('Only administrators can restore deleted exams.', 403);
        }

        $exam = $this->examService->restore($id, $user);

        return ResponseHelper::success(
            new ExamResource($exam),
            'Exam restored successfully'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Add Questions — Attach questions to an exam                        */
    /* ------------------------------------------------------------------ */

    public function addQuestions(int $id, AddExamQuestionsRequest $request): JsonResponse
    {
        $exam = $this->examService->find($id);
        $user = $request->user();

        // Lecturers can only modify their own exams
        if ($user->role === 'lecturer' && $exam->created_by !== $user->id) {
            return ResponseHelper::error('You can only modify your own exams.', 403);
        }

        $result = $this->examService->addQuestions($exam, $request->validated()['questions'], $user);

        $message = ($result['status_reset'] ?? false)
            ? 'Questions added. Exam has been reset to draft — please re-submit for review.'
            : 'Questions added to exam successfully';

        return ResponseHelper::success($result, $message);
    }

    /* ------------------------------------------------------------------ */
    /*  Remove Question — Detach a question from an exam                   */
    /* ------------------------------------------------------------------ */

    public function removeQuestion(int $examId, int $questionId, Request $request): JsonResponse
    {
        $exam = $this->examService->find($examId);
        $user = $request->user();

        // Lecturers can only modify their own exams
        if ($user->role === 'lecturer' && $exam->created_by !== $user->id) {
            return ResponseHelper::error('You can only modify your own exams.', 403);
        }

        $result = $this->examService->removeQuestion($exam, $questionId, $user);

        $message = $result['status_reset']
            ? 'Question removed. Exam has been reset to draft — please re-submit for review.'
            : 'Question removed from exam successfully';

        return ResponseHelper::success($result, $message);
    }

    /* ------------------------------------------------------------------ */
    /*  Results — Get exam results and statistics                          */
    /* ------------------------------------------------------------------ */

    public function results(int $id, Request $request): JsonResponse
    {
        $exam = $this->examService->find($id);
        $user = $request->user();

        // Lecturers can only view results for their own exams (HODs can view any)
        if ($user->role === 'lecturer' && ! $user->is_hod && $exam->created_by !== $user->id) {
            return ResponseHelper::error('You can only view results for your own exams.', 403);
        }

        $results = $this->examService->getResults($exam);

        return ResponseHelper::success($results, 'Exam results retrieved successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Submit Grading — Lecturer submits grading for HOD verification     */
    /* ------------------------------------------------------------------ */

    public function submitGrading(int $id, Request $request): JsonResponse
    {
        $exam = $this->examService->find($id);
        $user = $request->user();

        if ($exam->created_by !== $user->id && $user->role !== 'admin') {
            return ResponseHelper::error('You can only submit grading for your own exams.', 403);
        }

        try {
            $updated = $this->examService->submitGrading($exam, $user);
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(
            new ExamResource($updated),
            'Grading submitted for verification'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Reject Grading — HOD rejects grading back to lecturer             */
    /* ------------------------------------------------------------------ */

    public function rejectGrading(int $id, Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role !== 'admin' && ! $user->is_hod) {
            return ResponseHelper::error('Only HODs or administrators can reject grading.', 403);
        }

        $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $exam = $this->examService->find($id);

        try {
            $updated = $this->examService->rejectGrading($exam, $user, $request->input('reason'));
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(
            new ExamResource($updated),
            'Grading rejected and returned to lecturer'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Stats — Exam statistics                                            */
    /* ------------------------------------------------------------------ */

    public function stats(Request $request): JsonResponse
    {
        $stats = $this->examService->getStats($request->user());

        return ResponseHelper::success($stats, 'Exam statistics retrieved');
    }
}
