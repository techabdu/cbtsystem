<?php

namespace App\Http\Controllers\Api\V1\Hod;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\Course;
use App\Models\CourseLecturer;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HodController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  Authorization: Verify the user is HOD                              */
    /* ------------------------------------------------------------------ */

    private function authorizeHod(Request $request): ?JsonResponse
    {
        $user = $request->user();

        if (! $user || ! $user->isHod()) {
            return ResponseHelper::error('Access denied. You are not a Head of Department.', 403);
        }

        if (! $user->department_id) {
            return ResponseHelper::error('Your account has no department assigned.', 403);
        }

        return null; // authorized
    }

    /* ------------------------------------------------------------------ */
    /*  GET /hod/department-lecturers                                       */
    /*  List all lecturers in the HOD's department                          */
    /* ------------------------------------------------------------------ */

    public function departmentLecturers(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeHod($request)) return $denied;

        $hod = $request->user();

        $lecturers = User::where('department_id', $hod->department_id)
            ->where('role', 'lecturer')
            ->where('is_active', true)
            ->with('department')
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();

        return ResponseHelper::success([
            'lecturers'     => UserResource::collection($lecturers),
            'department_id' => $hod->department_id,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  GET /hod/department-courses                                         */
    /*  List all courses in the HOD's department                            */
    /* ------------------------------------------------------------------ */

    public function departmentCourses(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeHod($request)) return $denied;

        $hod = $request->user();

        $courses = Course::where('department_id', $hod->department_id)
            ->where('is_active', true)
            ->with('department')
            ->withCount(['lecturers', 'students', 'questions'])
            ->orderBy('code')
            ->get();

        return ResponseHelper::success([
            'courses'       => CourseResource::collection($courses),
            'department_id' => $hod->department_id,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  GET /hod/assignments                                                */
    /*  List all course-lecturer assignments in the HOD's department        */
    /* ------------------------------------------------------------------ */

    public function assignments(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeHod($request)) return $denied;

        $hod = $request->user();

        // Get all courses in this department with their assigned lecturers
        $courses = Course::where('department_id', $hod->department_id)
            ->where('is_active', true)
            ->with(['department', 'lecturers' => function ($query) {
                $query->select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'users.staff_id', 'users.is_hod')
                      ->orderBy('users.last_name');
            }])
            ->withCount(['lecturers', 'students', 'questions'])
            ->orderBy('code')
            ->get();

        return ResponseHelper::success([
            'courses'       => $courses->map(function ($course) {
                return [
                    'id'              => $course->id,
                    'code'            => $course->code,
                    'title'           => $course->title,
                    'credit_hours'    => $course->credit_hours,
                    'semester'        => $course->semester,
                    'students_count'  => $course->students_count,
                    'questions_count' => $course->questions_count,
                    'lecturers'       => $course->lecturers->map(function ($lecturer) {
                        return [
                            'id'        => $lecturer->id,
                            'full_name' => $lecturer->full_name,
                            'email'     => $lecturer->email,
                            'staff_id'  => $lecturer->staff_id,
                            'is_hod'    => (bool) $lecturer->is_hod,
                            'pivot_role'=> $lecturer->pivot->role,
                        ];
                    }),
                ];
            }),
            'department_id' => $hod->department_id,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  POST /hod/assign-course                                             */
    /*  Assign a lecturer to a course (scoped to HOD's department)          */
    /* ------------------------------------------------------------------ */

    public function assignCourse(Request $request): JsonResponse
    {
        if ($denied = $this->authorizeHod($request)) return $denied;

        $request->validate([
            'lecturer_id' => 'required|integer|exists:users,id',
            'course_id'   => 'required|integer|exists:courses,id',
            'role'        => 'sometimes|string|in:lecturer,coordinator,assistant',
        ]);

        $hod = $request->user();

        // Verify the lecturer belongs to the HOD's department
        $lecturer = User::where('id', $request->lecturer_id)
            ->where('role', 'lecturer')
            ->where('department_id', $hod->department_id)
            ->first();

        if (! $lecturer) {
            return ResponseHelper::error('Lecturer not found in your department.', 422);
        }

        // Verify the course belongs to the HOD's department
        $course = Course::where('id', $request->course_id)
            ->where('department_id', $hod->department_id)
            ->first();

        if (! $course) {
            return ResponseHelper::error('Course not found in your department.', 422);
        }

        // Check if already assigned
        $existing = CourseLecturer::where('lecturer_id', $lecturer->id)
            ->where('course_id', $course->id)
            ->first();

        if ($existing) {
            return ResponseHelper::error('This lecturer is already assigned to this course.', 422);
        }

        $assignment = CourseLecturer::create([
            'lecturer_id' => $lecturer->id,
            'course_id'   => $course->id,
            'role'        => $request->input('role', 'lecturer'),
        ]);

        // Log activity
        ActivityLog::log(
            action: 'hod_assigned_course',
            entityType: 'course_lecturer',
            entityId: $assignment->id,
            extra: [
                'hod_id'      => $hod->id,
                'lecturer_id' => $lecturer->id,
                'course_id'   => $course->id,
                'course_code' => $course->code,
            ],
        );

        return ResponseHelper::success([
            'assignment' => [
                'id'          => $assignment->id,
                'lecturer_id' => $assignment->lecturer_id,
                'course_id'   => $assignment->course_id,
                'role'        => $assignment->role,
                'lecturer'    => [
                    'id'        => $lecturer->id,
                    'full_name' => $lecturer->full_name,
                    'staff_id'  => $lecturer->staff_id,
                ],
                'course'      => [
                    'id'    => $course->id,
                    'code'  => $course->code,
                    'title' => $course->title,
                ],
            ],
        ], 'Lecturer assigned to course successfully.', 201);
    }

    /* ------------------------------------------------------------------ */
    /*  DELETE /hod/unassign-course/{lecturerId}/{courseId}                  */
    /*  Unassign a lecturer from a course (scoped to HOD's department)      */
    /* ------------------------------------------------------------------ */

    public function unassignCourse(Request $request, int $lecturerId, int $courseId): JsonResponse
    {
        if ($denied = $this->authorizeHod($request)) return $denied;

        $hod = $request->user();

        // Verify the course belongs to the HOD's department
        $course = Course::where('id', $courseId)
            ->where('department_id', $hod->department_id)
            ->first();

        if (! $course) {
            return ResponseHelper::error('Course not found in your department.', 422);
        }

        $assignment = CourseLecturer::where('lecturer_id', $lecturerId)
            ->where('course_id', $courseId)
            ->first();

        if (! $assignment) {
            return ResponseHelper::error('Assignment not found.', 404);
        }

        $assignment->delete();

        // Log activity
        ActivityLog::log(
            action: 'hod_unassigned_course',
            entityType: 'course_lecturer',
            entityId: $lecturerId,
            extra: [
                'hod_id'      => $hod->id,
                'lecturer_id' => $lecturerId,
                'course_id'   => $courseId,
                'course_code' => $course->code,
            ],
        );

        return ResponseHelper::success(null, 'Lecturer unassigned from course successfully.');
    }
}
