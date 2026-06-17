<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\User;
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

    public function assign(Request $request, string $courseId): JsonResponse
    {
        $request->validate([
            'lecturer_id' => 'required|string|exists:users,uuid',
            'role'        => 'sometimes|string|in:lecturer,coordinator,assistant',
        ]);

        $course = $this->courseService->find($courseId);
        $lecturer = User::where('uuid', $request->input('lecturer_id'))->firstOrFail();

        try {
            $assignment = $this->courseService->assignLecturer(
                $course,
                $lecturer->id,
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

    public function unassign(Request $request, string $courseId, string $lecturerId): JsonResponse
    {
        $course = $this->courseService->find($courseId);
        $lecturer = User::where('uuid', $lecturerId)->firstOrFail();

        try {
            $this->courseService->unassignLecturer($course, $lecturer->id, $request->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Lecturer unassigned successfully');
    }
}
