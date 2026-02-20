<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class StudentCourseController extends Controller
{
    /**
     * Get available courses based on student's combination departments.
     * Excludes already enrolled courses.
     */
    public function availableCourses(Request $request)
    {
        $user = $request->user();
        
        // Ensure user is a student
        if (!$user->isStudent()) {
            return response()->json(['message' => 'Only students can access this endpoint.'], 403);
        }

        $departmentIds = $user->department_ids;

        if (empty($departmentIds)) {
            return response()->json(['message' => 'No combination or department assigned.'], 400);
        }

        $query = Course::whereIn('department_id', $departmentIds)
            ->where('is_active', true)
            ->whereDoesntHave('enrollments', function ($q) use ($user) {
                // Ensure we check against the student's ID (the user PK), not the 'student_id' string column
                $q->where('student_id', $user->id);
            });

        // Optional filters
        if ($request->has('semester')) {
            $query->where('semester', $request->semester);
        }
        if ($request->has('level')) {
            // Explicit level filter from request (string-based legacy)
            $query->where('level', $request->level);
        } elseif ($user->level_id) {
            // Auto-scope: only show courses matching student's level
            $query->where(function ($q) use ($user) {
                $q->where('level_id', $user->level_id)
                  ->orWhereNull('level_id'); // Include courses without a level (general/common courses)
            });
        }

        $courses = $query->with(['department', 'levelRelation'])->paginate(20);

        return CourseResource::collection($courses)->additional([
            'meta' => [
                'enrollment_window' => $this->getEnrollmentWindowStatus(),
            ]
        ]);
    }

    /**
     * Get courses the student is currently enrolled in.
     */
    public function myCourses(Request $request)
    {
        $user = $request->user();

        if (!$user->isStudent()) {
             return response()->json(['message' => 'Only students can access this endpoint.'], 403);
        }

        $query = $user->enrolledCourses()->where('courses.is_active', true);

        if ($request->has('semester')) {
            $query->where('semester', $request->semester);
        }
        if ($request->has('level')) {
            $query->where('level', $request->level);
        }

        $courses = $query->with(['department', 'levelRelation'])->paginate(20);

        return CourseResource::collection($courses);
    }

    /**
     * Enroll in a course.
     */
    public function enroll(Request $request)
    {
        $request->validate([
            'course_id' => 'required|exists:courses,id',
        ]);

        $user = $request->user();

        if (!$user->isStudent()) {
             return response()->json(['message' => 'Only students can enroll.'], 403);
        }

        // Check enrollment window
        if (!$this->isEnrollmentOpen()) {
            return response()->json(['message' => 'Course enrollment is currently closed.'], 403);
        }

        $course = Course::find($request->course_id);

        // Verify course is in student's combination
        if (!in_array($course->department_id, $user->department_ids)) {
            return response()->json(['message' => 'This course is not available for your combination.'], 403);
        }

        // Verify course is in student's level (if both have level_id set)
        if ($user->level_id && $course->level_id && $user->level_id !== $course->level_id) {
            return response()->json(['message' => 'This course is not available for your current level.'], 403);
        }

        // Check if already enrolled
        if ($user->isEnrolledIn($course->id)) {
            return response()->json(['message' => 'You are already enrolled in this course.'], 409);
        }

        $user->enrollments()->create([
            'course_id' => $course->id,
            'enrollment_date' => now(),
            'status' => 'active',
        ]);

        return response()->json(['message' => 'Successfully enrolled in course.']);
    }

    /**
     * Unenroll from a course.
     */
    public function unenroll(Request $request)
    {
        $request->validate([
            'course_id' => 'required|exists:courses,id',
        ]);

        $user = $request->user();

        if (!$user->isStudent()) {
             return response()->json(['message' => 'Only students can unenroll.'], 403);
        }

        // Check enrollment window
        if (!$this->isEnrollmentOpen()) {
            return response()->json(['message' => 'Course enrollment modification is currently closed.'], 403);
        }

        $deleted = $user->enrollments()->where('course_id', $request->course_id)->delete();

        if (!$deleted) {
             return response()->json(['message' => 'You are not enrolled in this course.'], 404);
        }

        return response()->json(['message' => 'Successfully unenrolled from course.']);
    }

    /**
     * Check if enrollment is currently open.
     */
    private function isEnrollmentOpen(): bool
    {
        $start = SystemSetting::getValue('enrollment_start_date');
        $end = SystemSetting::getValue('enrollment_end_date');

        if (!$start || !$end) {
            return false; // Safest default
        }

        try {
            $startDate = Carbon::parse($start);
            $endDate = Carbon::parse($end);
            return now()->between($startDate, $endDate);
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Get enrollment window status for frontend.
     */
    private function getEnrollmentWindowStatus(): array
    {
        $start = SystemSetting::getValue('enrollment_start_date');
        $end = SystemSetting::getValue('enrollment_end_date');
        $isOpen = $this->isEnrollmentOpen();

        return [
            'is_open' => $isOpen,
            'start_date' => $start,
            'end_date' => $end,
        ];
    }
}
