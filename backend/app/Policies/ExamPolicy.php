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

        // 3. Admin can view all exams
        if ($user->isAdmin()) {
            return true;
        }

        // 4. CBT Admin can see verified and beyond (ready to publish through published)
        if ($user->isCbt()) {
            $cbtVisibleStatuses = ['verified', 'published'];
            return in_array($exam->status, $cbtVisibleStatuses);
        }

        // 5. HOD can see exams in their department that are pending_review or beyond
        if ($user->isHod()) {
            $isVisibleStatus = $exam->status !== 'draft';
            $isSameDept = $user->department_id === optional($exam->creator)->department_id;
            return $isVisibleStatus && $isSameDept;
        }

        // 6. School Exam Officer can see verified and published exams in their school
        if ($user->isSchoolExamOfficer()) {
            $isVisibleStatus = in_array($exam->status, ['verified', 'published']);
            $isSameSchool    = $user->school_id === optional(optional($exam->creator)->department)->school_id;
            return $isVisibleStatus && $isSameSchool;
        }

        // 7. Department Exam Officer can see exams in grading workflow in their department
        if ($user->isDepartmentExamOfficer()) {
            $isSameDept      = $user->department_id === optional($exam->creator)->department_id;
            $isGradingStage  = in_array($exam->results_status, ['grading_submitted', 'results_verified']);
            return $isSameDept && $isGradingStage;
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
