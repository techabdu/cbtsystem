<?php

namespace App\Http\Controllers\Api\V1\Question;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\QuestionResource;
use App\Services\Question\QuestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class QuestionImageController extends Controller
{
    public function __construct(
        private QuestionService $questionService
    ) {}

    /* ------------------------------------------------------------------ */
    /*  POST /api/v1/questions/{id}/image                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Upload an image for a specific question.
     *
     * Validates ownership (lecturers can only upload for their own questions),
     * stores the image in public storage, and updates the question's image_url.
     *
     * @param  int      $id
     * @param  Request  $request
     * @return JsonResponse
     */
    public function store(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'image' => [
                'required',
                'file',
                'mimes:jpeg,jpg,png,gif,webp',
                'max:2048', // 2 MB
            ],
        ]);

        $question = $this->questionService->find($id);
        $user     = $request->user();

        // Lecturers can only upload images for their own questions
        if ($user->role === 'lecturer') {
            if ($question->created_by !== $user->id) {
                return ResponseHelper::error(
                    'You can only upload images for your own questions.',
                    403
                );
            }

            // Also verify the question belongs to an assigned course
            $assignedCourseIds = $user->taughtCourses()->pluck('courses.id')->toArray();
            if (! in_array($question->course_id, $assignedCourseIds)) {
                return ResponseHelper::error(
                    'You do not have access to this question.',
                    403
                );
            }
        }

        // Delete old image if it exists
        if (! empty($question->image_url)) {
            $oldPath = str_replace('/storage/', '', parse_url($question->image_url, PHP_URL_PATH));
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        // Store new image
        $file        = $request->file('image');
        $storagePath = "questions/{$id}";
        $fileName    = $file->store($storagePath, 'public');

        // $fileName is the relative path like "questions/5/filename.jpg"
        $fullUrl = Storage::disk('public')->url($fileName);

        $question->update([
            'has_image' => true,
            'image_url' => $fullUrl,
        ]);

        $question->load(['course', 'creator']);

        return ResponseHelper::success(
            data: new QuestionResource($question),
            message: 'Question image uploaded successfully.',
        );
    }

    /* ------------------------------------------------------------------ */
    /*  DELETE /api/v1/questions/{id}/image                               */
    /* ------------------------------------------------------------------ */

    /**
     * Remove the image from a question.
     *
     * @param  int      $id
     * @param  Request  $request
     * @return JsonResponse
     */
    public function destroy(string $id, Request $request): JsonResponse
    {
        $question = $this->questionService->find($id);
        $user     = $request->user();

        // Lecturers can only manage their own questions
        if ($user->role === 'lecturer' && $question->created_by !== $user->id) {
            return ResponseHelper::error(
                'You can only manage images for your own questions.',
                403
            );
        }

        if (empty($question->image_url)) {
            return ResponseHelper::error(
                'This question has no image to delete.',
                404
            );
        }

        // Remove from storage
        $parsedPath = parse_url($question->image_url, PHP_URL_PATH);
        // Strip the /storage/ prefix that Storage::url() adds
        $relativePath = ltrim(str_replace('/storage', '', $parsedPath), '/');

        if (Storage::disk('public')->exists($relativePath)) {
            Storage::disk('public')->delete($relativePath);
        }

        $question->update([
            'has_image' => false,
            'image_url' => null,
        ]);

        return ResponseHelper::success(
            message: 'Question image deleted successfully.',
        );
    }
}
