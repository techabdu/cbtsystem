<?php

namespace App\Http\Controllers\Api\V1\Question;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Question\CreateQuestionRequest;
use App\Http\Requests\Question\UpdateQuestionRequest;
use App\Http\Resources\QuestionResource;
use App\Imports\QuestionImport;
use App\Services\Question\QuestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class QuestionController extends Controller
{
    public function __construct(
        private QuestionService $questionService
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Index — List questions (role-aware)                                */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $filters = $request->only([
            'search', 'course_id', 'question_type', 'difficulty_level',
            'topic', 'is_active', 'is_verified', 'trashed',
            'per_page', 'page', 'sort_by', 'sort_dir',
        ]);

        $paginator = $this->questionService->list($filters, $request->user());

        return ResponseHelper::paginated($paginator, 'Questions retrieved successfully', QuestionResource::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Show — Single question                                             */
    /* ------------------------------------------------------------------ */

    public function show(string $id, Request $request): JsonResponse
    {
        $question = $this->questionService->find($id);

        // Lecturers can only view questions for their assigned courses
        $user = $request->user();
        if ($user->role === 'lecturer') {
            $assignedCourseIds = $user->taughtCourses()->pluck('courses.id')->toArray();
            if (! in_array($question->course_id, $assignedCourseIds)) {
                return ResponseHelper::error('You do not have access to this question.', 403);
            }
        }

        return ResponseHelper::success(
            new QuestionResource($question),
            'Question retrieved successfully'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Store — Create question                                            */
    /* ------------------------------------------------------------------ */

    public function store(CreateQuestionRequest $request): JsonResponse
    {
        $user = $request->user();

        // Lecturers can only create questions for their assigned courses
        if ($user->role === 'lecturer') {
            $assignedCourseIds = $user->taughtCourses()->pluck('courses.id')->toArray();
            if (! in_array($request->course_id, $assignedCourseIds)) {
                return ResponseHelper::error('You can only create questions for courses you are assigned to.', 403);
            }
        }

        $question = $this->questionService->create($request->validated(), $user);

        return ResponseHelper::success(
            new QuestionResource($question),
            'Question created successfully',
            201
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Update — Modify question                                           */
    /* ------------------------------------------------------------------ */

    public function update(string $id, UpdateQuestionRequest $request): JsonResponse
    {
        $question = $this->questionService->find($id);
        $user = $request->user();

        // Lecturers can only update their own questions
        if ($user->role === 'lecturer' && $question->created_by !== $user->id) {
            return ResponseHelper::error('You can only edit your own questions.', 403);
        }

        $updated = $this->questionService->update($question, $request->validated(), $user);

        return ResponseHelper::success(
            new QuestionResource($updated),
            'Question updated successfully'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Destroy — Soft-delete question                                     */
    /* ------------------------------------------------------------------ */

    public function destroy(string $id, Request $request): JsonResponse
    {
        $question = $this->questionService->find($id);
        $user = $request->user();

        // Lecturers can only delete their own questions
        if ($user->role === 'lecturer' && $question->created_by !== $user->id) {
            return ResponseHelper::error('You can only delete your own questions.', 403);
        }

        try {
            $this->questionService->delete($question, $user);
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 409);
        }

        return ResponseHelper::success(null, 'Question deleted successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Restore — Restore soft-deleted question                            */
    /* ------------------------------------------------------------------ */

    public function restore(string $id, Request $request): JsonResponse
    {
        $question = $this->questionService->restore($id, $request->user());

        return ResponseHelper::success(
            new QuestionResource($question),
            'Question restored successfully'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Verify — Mark question as verified                                 */
    /* ------------------------------------------------------------------ */

    public function verify(string $id, Request $request): JsonResponse
    {
        $question = $this->questionService->find($id);
        $user = $request->user();

        // Prevent self-verification (lecturers can't verify their own questions)
        if ($user->role === 'lecturer' && $question->created_by === $user->id) {
            return ResponseHelper::error('You cannot verify your own questions.', 403);
        }

        $verified = $this->questionService->verify($question, $user);

        return ResponseHelper::success(
            new QuestionResource($verified),
            'Question verified successfully'
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Bulk Upload — Import questions from JSON                           */
    /* ------------------------------------------------------------------ */

    public function bulkUpload(Request $request): JsonResponse
    {
        $request->validate([
            'course_id'       => 'required|integer|exists:courses,id',
            'questions'       => 'required|array|min:1|max:500',
            'questions.*.question_text'    => 'required|string',
            'questions.*.question_type'    => 'required|in:multiple_choice,true_false,fill_in_blank,essay',
        ]);

        $user = $request->user();

        // Lecturers can only bulk-upload to their assigned courses
        if ($user->role === 'lecturer') {
            $assignedCourseIds = $user->taughtCourses()->pluck('courses.id')->toArray();
            if (! in_array($request->course_id, $assignedCourseIds)) {
                return ResponseHelper::error('You can only upload questions for courses you are assigned to.', 403);
            }
        }

        $results = $this->questionService->bulkUpload(
            $request->course_id,
            $request->questions,
            $user
        );

        $statusCode = $results['failed'] > 0 ? 207 : 201;

        return ResponseHelper::success($results, 'Bulk upload completed', $statusCode);
    }

    /* ------------------------------------------------------------------ */
    /*  Bulk Upload (Excel) — Import questions from .xlsx file            */
    /* ------------------------------------------------------------------ */

    /**
     * POST /api/v1/questions/bulk-upload-excel
     *
     * Accepts an Excel file and bulk-creates questions.
     * Column headers: Question, Option A, Option B, Option C, Option D,
     *                 Correct Answer, Question Type, Difficulty Level, Topic, Course Code
     */
    public function bulkUploadExcel(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls', 'max:10240'],
        ]);

        $import = new QuestionImport($request->user());

        try {
            Excel::import($import, $request->file('file'));
        } catch (\Maatwebsite\Excel\Validators\ValidationException $e) {
            return ResponseHelper::error(
                message: 'Validation failed while processing the Excel file.',
                statusCode: 422,
                errors: collect($e->failures())->map(fn ($f) => [
                    'row'     => $f->row(),
                    'message' => implode(', ', $f->errors()),
                ])->toArray(),
            );
        } catch (\Throwable $e) {
            return ResponseHelper::error(
                message: 'Failed to process the uploaded file: ' . $e->getMessage(),
                statusCode: 500,
            );
        }

        $results    = $import->getResults();
        $statusCode = $results['skipped'] > 0 ? 207 : 201;

        return ResponseHelper::success(
            data: $results,
            message: "Excel import completed. {$results['created']} question(s) created, {$results['skipped']} skipped.",
            statusCode: $statusCode,
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Stats — Question statistics                                        */
    /* ------------------------------------------------------------------ */

    public function stats(Request $request): JsonResponse
    {
        $stats = $this->questionService->getStats($request->user());

        return ResponseHelper::success($stats, 'Question statistics retrieved');
    }
}
