<?php

namespace App\Policies;

use App\Models\Exam;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ExamPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Exam $exam): bool
    {
        // 1. Creator can always view
        if ($user->id === $exam->created_by) {
            return true;
        }

        // 2. Edu Portal can view all exams
        if ($user->isEduPortal()) {
            return true;
        }

        // 3. Admin can view all exams (maybe strictly for system info, but safe to allow)
        if ($user->isAdmin()) {
            return true;
        }

        // 4. CBT Admin can view exams that are at 'cbt_setup' and beyond
        if ($user->isCbt()) {
            $cbtVisibleStatuses = ['cbt_setup', 'published', 'grading', 'grading_review', 'results_published'];
            return in_array($exam->status, $cbtVisibleStatuses);
        }

        // 5. HOD Review limits
        if ($user->isHod()) {
            // Can see if it belongs to their department AND is past 'draft'
            $isVisibleStatus = !in_array($exam->status, ['draft']);
            $isSameDept = \App\Models\CourseLecturer::where('lecturer_id', $exam->created_by)
                            ->join('courses', 'courses.id', '=', 'course_lecturers.course_id')
                            ->where('courses.department_id', $user->department_id)
                            ->exists() || $user->department_id === $exam->creator->department_id; // Simpler check based on exam creator's department
            
            if ($isVisibleStatus && $isSameDept) {
                return true;
            }
        }

        // 6. School Exam Officer Review limits
        if ($user->isSchoolExamOfficer()) {
            // Can see if past 'hod_review' AND in same school
            $isVisibleStatus = !in_array($exam->status, ['draft', 'hod_review']);
            $isSameSchool = $user->school_id === $exam->creator->department->school_id;

            if ($isVisibleStatus && $isSameSchool) {
                return true;
            }
        }

        // 7. Department Exam Officer
        if ($user->isDepartmentExamOfficer()) {
            // Can see if past 'grading' AND in same department
            $isVisibleStatus = in_array($exam->status, ['grading_review', 'results_published']);
            $isSameDept = $user->department_id === $exam->creator->department_id;

            if ($isVisibleStatus && $isSameDept) {
                return true;
            }
        }

        return false;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return false;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Exam $exam): bool
    {
        // The creator can edit it if it's a draft or was rejected back to draft
        if ($user->id === $exam->created_by && $exam->isDraft()) {
            return true;
        }

        // Practical exams are loose, creators can edit them anytime (unless we lock them)
        if ($user->id === $exam->created_by && $exam->exam_type === 'practical') {
            return true;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Exam $exam): bool
    {
        // Creator can delete if draft or practical
        if ($user->id === $exam->created_by) {
            return $exam->isDraft() || $exam->exam_type === 'practical';
        }
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Exam $exam): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Exam $exam): bool
    {
        return false;
    }
}
