<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Course\CourseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseLecturerController extends Controller
{
    public function __construct(
        private readonly CourseService $courseService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Assign a lecturer to a course                                      */
    /* ------------------------------------------------------------------ */

    public function assign(Request $request, int $courseId): JsonResponse
    {
        $request->validate([
            'lecturer_id' => 'required|integer|exists:users,id',
            'role'        => 'sometimes|string|in:lecturer,coordinator,assistant',
        ]);

        $course = $this->courseService->find($courseId);

        try {
            $assignment = $this->courseService->assignLecturer(
                $course,
                $request->input('lecturer_id'),
                $request->input('role', 'lecturer'),
                $request->user(),
            );

            return ResponseHelper::success([
                'assignment' => [
                    'id'          => $assignment->id,
                    'lecturer_id' => $assignment->lecturer_id,
                    'course_id'   => $assignment->course_id,
                    'role'        => $assignment->role,
                ],
            ], 'Lecturer assigned successfully', 201);
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Unassign a lecturer from a course                                  */
    /* ------------------------------------------------------------------ */

    public function unassign(Request $request, int $courseId, int $lecturerId): JsonResponse
    {
        $course = $this->courseService->find($courseId);

        try {
            $this->courseService->unassignLecturer($course, $lecturerId, $request->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Lecturer unassigned successfully');
    }
}
