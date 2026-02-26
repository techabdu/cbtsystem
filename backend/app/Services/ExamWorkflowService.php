<?php

namespace App\Services;

use App\Models\Exam;
use App\Models\ExamFeedback;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ExamWorkflowService
{
    /**
     * Move an exam from Draft to HOD Review (Lecturer action)
     */
    public function submitForHodReview(Exam $exam): Exam
    {
        if (!$exam->isDraft()) {
            throw new \Exception("Exam must be in draft status to submit for review.");
        }

        $exam->update(['status' => 'hod_review']);
        return $exam->fresh();
    }

    /**
     * Approve exam as HOD -> moves to School Officer Review
     */
    public function approveByHod(Exam $exam): Exam
    {
        if (!$exam->isHodReview()) {
            throw new \Exception("Exam is not pending HOD review.");
        }

        $exam->update(['status' => 'school_officer_review']);
        return $exam->fresh();
    }

    /**
     * Reject exam as HOD -> returns to Draft and creates feedback
     */
    public function rejectByHod(Exam $exam, User $reviewer, string $comments): Exam
    {
        if (!$exam->isHodReview()) {
            throw new \Exception("Exam is not pending HOD review.");
        }

        DB::transaction(function () use ($exam, $reviewer, $comments) {
            $exam->update(['status' => 'draft']);

            ExamFeedback::create([
                'exam_id' => $exam->id,
                'user_id' => $reviewer->id,
                'recipient_id' => $exam->created_by,
                'stage' => 'pre_exam_hod_review',
                'comments' => $comments,
            ]);
        });

        return $exam->fresh();
    }

    /**
     * Approve exam as School Officer -> moves to CBT Setup
     */
    public function approveBySchoolOfficer(Exam $exam): Exam
    {
        if (!$exam->isSchoolOfficerReview()) {
            throw new \Exception("Exam is not pending School Officer review.");
        }

        $exam->update(['status' => 'cbt_setup']);
        return $exam->fresh();
    }

    /**
     * Reject exam as School Officer -> returns to Draft and creates feedback
     */
    public function rejectBySchoolOfficer(Exam $exam, User $reviewer, string $comments): Exam
    {
        if (!$exam->isSchoolOfficerReview()) {
            throw new \Exception("Exam is not pending School Officer review.");
        }

        DB::transaction(function () use ($exam, $reviewer, $comments) {
            $exam->update(['status' => 'draft']);

            ExamFeedback::create([
                'exam_id' => $exam->id,
                'user_id' => $reviewer->id,
                'recipient_id' => $exam->created_by,
                'stage' => 'pre_exam_school_officer_review',
                'comments' => $comments,
            ]);
        });

        return $exam->fresh();
    }

    /**
     * CBT Setup completion -> moves to Published
     */
    public function publishByCbt(Exam $exam): Exam
    {
        if (!$exam->isCbtSetup()) {
            throw new \Exception("Exam is not ready for CBT setup.");
        }

        $exam->update(['status' => 'published']);
        return $exam->fresh();
    }

    // ==============================================
    // POST-EXAM WORKFLOW
    // ==============================================

    /**
     * CBT Syncs Results -> moves to Grading
     */
    public function syncResultsByCbt(Exam $exam): Exam
    {
        if (!$exam->isPublished()) {
            throw new \Exception("Exam must be published to sync results.");
        }

        $exam->update(['status' => 'grading']);
        return $exam->fresh();
    }

    /**
     * Lecturer submits grading -> moves to Grading Review
     */
    public function submitGrading(Exam $exam): Exam
    {
        if (!$exam->isGrading()) {
            throw new \Exception("Exam is not in grading stage.");
        }

        $exam->update(['status' => 'grading_review']);
        return $exam->fresh();
    }

    /**
     * Dept Officer approves grading -> moves to Results Published (Edu Portal)
     */
    public function approveGradingByDeptOfficer(Exam $exam): Exam
    {
        if (!$exam->isGradingReview()) {
            throw new \Exception("Exam is not pending Department Officer review.");
        }

        $exam->update(['status' => 'results_published']);
        return $exam->fresh();
    }

    /**
     * Dept Officer rejects grading -> returns to Grading and creates feedback
     */
    public function rejectGradingByDeptOfficer(Exam $exam, User $reviewer, string $comments): Exam
    {
        if (!$exam->isGradingReview()) {
            throw new \Exception("Exam is not pending Department Officer review.");
        }

        DB::transaction(function () use ($exam, $reviewer, $comments) {
            $exam->update(['status' => 'grading']);

            ExamFeedback::create([
                'exam_id' => $exam->id,
                'user_id' => $reviewer->id,
                'recipient_id' => $exam->created_by,
                'stage' => 'post_exam_grading_review',
                'comments' => $comments,
            ]);
        });

        return $exam->fresh();
    }
}
