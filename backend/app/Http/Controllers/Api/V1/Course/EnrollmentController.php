<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\User;
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

    public function enroll(Request $request, string $courseId): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|string|exists:users,uuid',
        ]);

        $course = $this->courseService->find($courseId);
        $student = User::where('uuid', $request->input('student_id'))->firstOrFail();

        try {
            $enrollment = $this->courseService->enrollStudent(
                $course,
                $student->id,
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

    public function unenroll(Request $request, string $courseId, string $studentId): JsonResponse
    {
        $course = $this->courseService->find($courseId);
        $student = User::where('uuid', $studentId)->firstOrFail();

        try {
            $this->courseService->unenrollStudent($course, $student->id, $request->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Student unenrolled successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Bulk enroll students                                               */
    /* ------------------------------------------------------------------ */

    public function bulkEnroll(Request $request, string $courseId): JsonResponse
    {
        $request->validate([
            'student_ids'   => 'required|array|min:1',
            'student_ids.*' => 'string|exists:users,uuid',
        ]);

        $course = $this->courseService->find($courseId);
        $integerIds = User::whereIn('uuid', $request->input('student_ids'))->pluck('id')->toArray();

        $result = $this->courseService->bulkEnrollStudents(
            $course,
            $integerIds,
            $request->user(),
        );

        return ResponseHelper::success($result, 'Bulk enrollment completed', 201);
    }
}
