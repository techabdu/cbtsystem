<?php

namespace App\Policies;

use App\Models\ExamFeedback;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ExamFeedbackPolicy
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
    public function view(User $user, ExamFeedback $examFeedback): bool
    {
        // Only the recipient (who the feedback is for) or the reviewer (who wrote it) can view it.
        if ($user->id === $examFeedback->recipient_id || $user->id === $examFeedback->user_id) {
            return true;
        }

        // Edu Portal might need to view them too for auditing
        if ($user->isEduPortal()) {
            return true;
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
    public function update(User $user, ExamFeedback $examFeedback): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ExamFeedback $examFeedback): bool
    {
        return false;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, ExamFeedback $examFeedback): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, ExamFeedback $examFeedback): bool
    {
        return false;
    }
}
