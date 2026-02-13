<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Course\CourseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function __construct(
        private readonly CourseService $courseService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Enroll a student                                                   */
    /* ------------------------------------------------------------------ */

    public function enroll(Request $request, int $courseId): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|integer|exists:users,id',
        ]);

        $course = $this->courseService->find($courseId);

        try {
            $enrollment = $this->courseService->enrollStudent(
                $course,
                $request->input('student_id'),
                $request->user(),
            );

            return ResponseHelper::success([
                'enrollment' => [
                    'id'              => $enrollment->id,
                    'student_id'      => $enrollment->student_id,
                    'course_id'       => $enrollment->course_id,
                    'enrollment_date' => $enrollment->enrollment_date,
                    'status'          => $enrollment->status,
                ],
            ], 'Student enrolled successfully', 201);
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Unenroll a student                                                 */
    /* ------------------------------------------------------------------ */

    public function unenroll(Request $request, int $courseId, int $studentId): JsonResponse
    {
        $course = $this->courseService->find($courseId);

        try {
            $this->courseService->unenrollStudent($course, $studentId, $request->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Student unenrolled successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Bulk enroll students                                               */
    /* ------------------------------------------------------------------ */

    public function bulkEnroll(Request $request, int $courseId): JsonResponse
    {
        $request->validate([
            'student_ids'   => 'required|array|min:1',
            'student_ids.*' => 'integer|exists:users,id',
        ]);

        $course = $this->courseService->find($courseId);

        $result = $this->courseService->bulkEnrollStudents(
            $course,
            $request->input('student_ids'),
            $request->user(),
        );

        return ResponseHelper::success($result, 'Bulk enrollment completed', 201);
    }
}
