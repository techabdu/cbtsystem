<?php

namespace App\Services\Course;

use App\Models\ActivityLog;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CourseLecturer;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class CourseService
{
    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Get a paginated, filterable list of courses.
     *
     * @param  array  $filters  Accepted keys: search, department_id, semester, level, academic_year, is_active, trashed, per_page, sort_by, sort_dir
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = Course::with('department')
            ->withCount(['students', 'lecturers', 'exams', 'questions']);

        // --- Include soft-deleted ---
        if (! empty($filters['trashed']) && $filters['trashed'] === 'only') {
            $query->onlyTrashed();
        } elseif (! empty($filters['trashed']) && $filters['trashed'] === 'with') {
            $query->withTrashed();
        }

        // --- Department filter ---
        if (! empty($filters['department_id'])) {
            $query->where('department_id', (int) $filters['department_id']);
        }

        // --- Semester filter ---
        if (! empty($filters['semester'])) {
            $query->where('semester', $filters['semester']);
        }

        // --- Level filter ---
        if (! empty($filters['level'])) {
            $query->where('level', $filters['level']);
        }

        // --- Academic year filter ---
        if (! empty($filters['academic_year'])) {
            $query->where('academic_year', $filters['academic_year']);
        }

        // --- Active status filter ---
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // --- Search (code, title) ---
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('title', 'LIKE', "%{$term}%")
                  ->orWhere('code', 'LIKE', "%{$term}%");
            });
        }

        // --- Sorting ---
        $sortBy  = $filters['sort_by'] ?? 'title';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $allowedSorts = ['title', 'code', 'created_at', 'credit_hours', 'students_count', 'level'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  Lecturer's courses (only assigned)                                 */
    /* ------------------------------------------------------------------ */

    /**
     * Get paginated list of courses assigned to a specific lecturer.
     */
    public function listForLecturer(User $lecturer, array $filters = []): LengthAwarePaginator
    {
        $query = Course::with('department')
            ->withCount(['students', 'lecturers', 'exams', 'questions'])
            ->whereHas('lecturers', function ($q) use ($lecturer) {
                $q->where('users.id', $lecturer->id);
            });

        // Search
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('title', 'LIKE', "%{$term}%")
                  ->orWhere('code', 'LIKE', "%{$term}%");
            });
        }

        // Active status
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        $sortBy  = $filters['sort_by'] ?? 'title';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $allowedSorts = ['title', 'code', 'created_at', 'students_count'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  Student's enrolled courses                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Get paginated list of courses a student is enrolled in.
     */
    public function listForStudent(User $student, array $filters = []): LengthAwarePaginator
    {
        $query = Course::with('department')
            ->withCount(['students', 'exams'])
            ->whereHas('enrollments', function ($q) use ($student) {
                $q->where('student_id', $student->id)
                  ->where('status', 'active');
            });

        // Search
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('title', 'LIKE', "%{$term}%")
                  ->orWhere('code', 'LIKE', "%{$term}%");
            });
        }

        $sortBy  = $filters['sort_by'] ?? 'title';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $allowedSorts = ['title', 'code', 'created_at'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    /**
     * Find a course by ID with relationships.
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function find(int $id): Course
    {
        return Course::with('department')
            ->withCount(['students', 'lecturers', 'exams', 'questions'])
            ->findOrFail($id);
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new course.
     */
    public function create(array $data, User $admin): Course
    {
        $course = Course::create([
            'department_id' => $data['department_id'],
            'code'          => strtoupper($data['code']),
            'title'         => $data['title'],
            'description'   => $data['description'] ?? null,
            'credit_hours'  => $data['credit_hours'] ?? null,
            'semester'      => $data['semester'] ?? null,
            'academic_year' => $data['academic_year'] ?? null,
            'level'         => $data['level'] ?? null,
            'is_active'     => $data['is_active'] ?? true,
        ]);

        $this->logActivity($admin, 'course_created', $course->id, newValues: [
            'code'  => $course->code,
            'title' => $course->title,
        ]);

        return $course->load('department')
            ->loadCount(['students', 'lecturers', 'exams', 'questions']);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Update an existing course.
     */
    public function update(Course $course, array $data, User $admin): Course
    {
        $oldValues = $course->only(array_keys($data));

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $course->update($data);

        $this->logActivity($admin, 'course_updated', $course->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $course->fresh()
            ->load('department')
            ->loadCount(['students', 'lecturers', 'exams', 'questions']);
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete a course.
     *
     * @throws \RuntimeException If course has active exam sessions.
     */
    public function delete(Course $course, User $admin): void
    {
        // Guard: prevent delete if there are active exams
        if ($course->exams()->whereIn('status', ['published'])->exists()) {
            throw new \RuntimeException(
                'Cannot delete a course that has published exams. Unpublish or delete exams first.'
            );
        }

        $course->update(['is_active' => false]);
        $course->delete();

        $this->logActivity($admin, 'course_deleted', $course->id, oldValues: [
            'code'  => $course->code,
            'title' => $course->title,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted course.
     *
     * @param  int   $id
     * @param  User  $admin
     * @return Course
     */
    public function restore(int $id, User $admin): Course
    {
        $course = Course::onlyTrashed()->findOrFail($id);
        $course->restore();
        $course->update(['is_active' => true]);

        $this->logActivity($admin, 'course_restored', $course->id);

        return $course->fresh()
            ->load('department')
            ->loadCount(['students', 'lecturers', 'exams', 'questions']);
    }

    /* ------------------------------------------------------------------ */
    /*  Students — List enrolled students for a course                     */
    /* ------------------------------------------------------------------ */

    /**
     * Get paginated list of enrolled students for a course.
     */
    public function getStudents(Course $course, array $filters = []): LengthAwarePaginator
    {
        $query = User::where('role', 'student')
            ->whereHas('enrollments', function ($q) use ($course, $filters) {
                $q->where('course_id', $course->id);
                if (! empty($filters['enrollment_status'])) {
                    $q->where('status', $filters['enrollment_status']);
                }
            })
            ->with(['enrollments' => function ($q) use ($course) {
                $q->where('course_id', $course->id);
            }]);

        // Search
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('first_name', 'LIKE', "%{$term}%")
                  ->orWhere('last_name', 'LIKE', "%{$term}%")
                  ->orWhere('email', 'LIKE', "%{$term}%")
                  ->orWhere('student_id', 'LIKE', "%{$term}%");
            });
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->orderBy('last_name')->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  Enrollment — Enroll / Unenroll                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Enroll a student in a course.
     *
     * @throws \RuntimeException If already enrolled or student not found.
     */
    public function enrollStudent(Course $course, int $studentId, User $admin): CourseEnrollment
    {
        $student = User::where('id', $studentId)->where('role', 'student')->first();

        if (! $student) {
            throw new \RuntimeException('Student not found.');
        }

        $existing = CourseEnrollment::where('student_id', $studentId)
            ->where('course_id', $course->id)
            ->first();

        if ($existing) {
            if ($existing->status === 'active') {
                throw new \RuntimeException('Student is already enrolled in this course.');
            }
            // Re-enroll if was dropped/completed
            $existing->update([
                'status'          => 'active',
                'enrollment_date' => now()->toDateString(),
            ]);

            $this->logActivity($admin, 'student_re_enrolled', $course->id, newValues: [
                'student_id' => $studentId,
                'course_id'  => $course->id,
            ]);

            return $existing->fresh();
        }

        $enrollment = CourseEnrollment::create([
            'student_id'      => $studentId,
            'course_id'       => $course->id,
            'enrollment_date' => now()->toDateString(),
            'status'          => 'active',
        ]);

        $this->logActivity($admin, 'student_enrolled', $course->id, newValues: [
            'student_id' => $studentId,
            'course_id'  => $course->id,
        ]);

        return $enrollment;
    }

    /**
     * Unenroll (drop) a student from a course.
     */
    public function unenrollStudent(Course $course, int $studentId, User $admin): void
    {
        $enrollment = CourseEnrollment::where('student_id', $studentId)
            ->where('course_id', $course->id)
            ->where('status', 'active')
            ->first();

        if (! $enrollment) {
            throw new \RuntimeException('No active enrollment found for this student in this course.');
        }

        $enrollment->update(['status' => 'dropped']);

        $this->logActivity($admin, 'student_unenrolled', $course->id, oldValues: [
            'student_id' => $studentId,
            'course_id'  => $course->id,
        ]);
    }

    /**
     * Bulk enroll multiple students.
     *
     * @return array{enrolled: int, skipped: int, errors: array}
     */
    public function bulkEnrollStudents(Course $course, array $studentIds, User $admin): array
    {
        $enrolled = 0;
        $skipped  = 0;
        $errors   = [];

        foreach ($studentIds as $studentId) {
            try {
                $this->enrollStudent($course, $studentId, $admin);
                $enrolled++;
            } catch (\RuntimeException $e) {
                if (str_contains($e->getMessage(), 'already enrolled')) {
                    $skipped++;
                } else {
                    $errors[] = ['student_id' => $studentId, 'error' => $e->getMessage()];
                }
            }
        }

        return [
            'enrolled' => $enrolled,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Lecturers — Assign / Unassign                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Get lecturers assigned to a course.
     */
    public function getLecturers(Course $course): Collection
    {
        return $course->lecturers()->get();
    }

    /**
     * Assign a lecturer to a course.
     */
    public function assignLecturer(Course $course, int $lecturerId, string $role, User $admin): CourseLecturer
    {
        $lecturer = User::where('id', $lecturerId)->where('role', 'lecturer')->first();

        if (! $lecturer) {
            throw new \RuntimeException('Lecturer not found.');
        }

        $existing = CourseLecturer::where('lecturer_id', $lecturerId)
            ->where('course_id', $course->id)
            ->first();

        if ($existing) {
            // Update role if different
            if ($existing->role !== $role) {
                $existing->update(['role' => $role]);
                $this->logActivity($admin, 'lecturer_role_updated', $course->id, newValues: [
                    'lecturer_id' => $lecturerId,
                    'role'        => $role,
                ]);
                return $existing->fresh();
            }
            throw new \RuntimeException('Lecturer is already assigned to this course.');
        }

        $assignment = CourseLecturer::create([
            'lecturer_id' => $lecturerId,
            'course_id'   => $course->id,
            'role'        => $role,
        ]);

        $this->logActivity($admin, 'lecturer_assigned', $course->id, newValues: [
            'lecturer_id' => $lecturerId,
            'course_id'   => $course->id,
            'role'        => $role,
        ]);

        return $assignment;
    }

    /**
     * Unassign a lecturer from a course.
     */
    public function unassignLecturer(Course $course, int $lecturerId, User $admin): void
    {
        $assignment = CourseLecturer::where('lecturer_id', $lecturerId)
            ->where('course_id', $course->id)
            ->first();

        if (! $assignment) {
            throw new \RuntimeException('Lecturer is not assigned to this course.');
        }

        $assignment->delete();

        $this->logActivity($admin, 'lecturer_unassigned', $course->id, oldValues: [
            'lecturer_id' => $lecturerId,
            'course_id'   => $course->id,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private function logActivity(
        User $admin,
        string $action,
        int $entityId,
        array $oldValues = [],
        array $newValues = [],
    ): void {
        ActivityLog::log(
            action: $action,
            entityType: 'course',
            entityId: $entityId,
            extra: [
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata'   => ['admin_id' => $admin->id],
            ],
        );
    }
}
