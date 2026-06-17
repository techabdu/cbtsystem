<?php

namespace App\Services\Exam;

use App\Models\ActivityLog;
use App\Models\Exam;
use App\Models\User;
use App\Services\Notification\NotificationService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ExamService
{
    public function __construct(private NotificationService $notifications) {}

    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter (role-aware)                                */
    /* ------------------------------------------------------------------ */

    /**
     * Get a paginated, filterable list of exams.
     *
     * - Admins see all exams.
     * - Lecturers see only exams they created.
     *
     * @param  array  $filters  Accepted keys: search, course_id, exam_type, status,
     *                          is_practice, trashed, per_page, sort_by, sort_dir
     * @param  User   $user     The authenticated user (for role-based scoping)
     * @return LengthAwarePaginator
     */
    public function list(array $filters = [], User $user = null): LengthAwarePaginator
    {
        $query = Exam::with(['course', 'creator'])->withCount('examQuestions');

        // --- Role-based scoping ---
        if ($user && $user->role === 'lecturer') {
            if (! $user->is_hod) {
                // Regular lecturers see only exams they created
                $query->where('created_by', $user->id);
            }
            // HODs see all exams to facilitate department-wide review
        }

        // --- Include soft-deleted ---
        if (! empty($filters['trashed']) && $filters['trashed'] === 'only') {
            $query->onlyTrashed();
        } elseif (! empty($filters['trashed']) && $filters['trashed'] === 'with') {
            $query->withTrashed();
        }

        // --- Course filter ---
        if (! empty($filters['course_id'])) {
            $query->where('course_id', $filters['course_id']);
        }

        // --- Exam type filter ---
        if (! empty($filters['exam_type'])) {
            $query->where('exam_type', $filters['exam_type']);
        }

        // --- Status filter ---
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        // --- Results status filter ---
        if (! empty($filters['results_status'])) {
            $query->where('results_status', $filters['results_status']);
        }

        // --- Practice filter ---
        if (isset($filters['is_practice'])) {
            $query->where('is_practice', filter_var($filters['is_practice'], FILTER_VALIDATE_BOOLEAN));
        }

        // --- Search (title) ---
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('title', 'LIKE', "%{$term}%")
                  ->orWhere('description', 'LIKE', "%{$term}%");
            });
        }

        // --- Sorting ---
        $sortBy  = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';
        $allowedSorts = ['created_at', 'title', 'start_time', 'end_time', 'status', 'exam_type', 'total_marks'];
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
     * Find an exam by ID with all relations.
     *
     * @param  int  $id
     * @return Exam
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function find(int $id): Exam
    {
        return Exam::with(['course', 'creator', 'examQuestions.question'])->findOrFail($id);
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new exam.
     *
     * @param  array  $data  Validated request data.
     * @param  User   $user  The user creating the exam.
     * @return Exam
     */
    public function create(array $data, User $user): Exam
    {
        $data['created_by'] = $user->id;
        $data['status']     = ($data['exam_type'] === 'practical') ? 'published' : 'draft';

        // Handle password hashing
        if (! empty($data['requires_password']) && ! empty($data['exam_password'])) {
            $data['exam_password_hash'] = bcrypt($data['exam_password']);
        }
        unset($data['exam_password']);

        $exam = Exam::create($data);

        $this->logActivity($user, 'exam_created', $exam->id, newValues: [
            'course_id' => $exam->course_id,
            'title'     => $exam->title,
            'exam_type' => $exam->exam_type,
            'status'    => $exam->status,
        ]);

        return $exam->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Update an existing exam.
     *
     * @param  Exam   $exam
     * @param  array  $data  Validated request data.
     * @param  User   $user
     * @return Exam
     *
     * @throws \RuntimeException If trying to change restricted fields on a published exam.
     */
    public function update(Exam $exam, array $data, User $user): Exam
    {
        // Published exams: only allow updating title, description, instructions
        if ($exam->status === 'published') {
            $restrictedFields = [
                'start_time', 'end_time', 'duration_minutes', 'total_marks',
                'passing_marks', 'randomize_questions', 'randomize_options',
                'questions_per_page', 'allow_backtrack', 'course_id',
            ];
            foreach ($restrictedFields as $field) {
                if (array_key_exists($field, $data)) {
                    throw new \RuntimeException(
                        "Cannot update '{$field}' on a published exam. Only title, description, and instructions can be changed."
                    );
                }
            }
        }

        $oldValues = $exam->only(array_keys($data));

        // Handle password update
        if (! empty($data['requires_password']) && ! empty($data['exam_password'])) {
            $data['exam_password_hash'] = bcrypt($data['exam_password']);
        }
        unset($data['exam_password']);

        $exam->update($data);

        $this->logActivity($user, 'exam_updated', $exam->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $exam->fresh()->load(['course', 'creator', 'examQuestions.question']);
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete an exam.
     *
     * @param  Exam  $exam
     * @param  User  $user
     * @return void
     *
     * @throws \RuntimeException If exam has active sessions.
     */
    public function delete(Exam $exam, User $user): void
    {
        // Check for active sessions
        $activeSessions = $exam->sessions()
            ->whereIn('status', ['in_progress'])
            ->count();

        if ($activeSessions > 0) {
            throw new \RuntimeException(
                "Cannot delete this exam — it has {$activeSessions} active session(s) in progress."
            );
        }

        $this->logActivity($user, 'exam_deleted', $exam->id, oldValues: [
            'title'     => $exam->title,
            'course_id' => $exam->course_id,
            'status'    => $exam->status,
        ]);

        $exam->update(['status' => 'archived']);
        $exam->delete();
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted exam.
     *
     * @param  int   $id
     * @param  User  $user
     * @return Exam
     */
    public function restore(int $id, User $user): Exam
    {
        $exam = Exam::onlyTrashed()->findOrFail($id);
        $exam->restore();
        $exam->update(['status' => 'draft']);

        $this->logActivity($user, 'exam_restored', $exam->id);

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Add Questions                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Add or update questions on an exam.
     *
     * @param  Exam   $exam
     * @param  array  $questions  Array of ['question_id', 'points', 'order'] entries.
     * @param  User   $user
     * @return array  ['total_questions' => int, 'total_marks' => float]
     */
    public function addQuestions(Exam $exam, array $questions, User $user): array
    {
        $rows = [];
        foreach ($questions as $q) {
            $rows[] = [
                'exam_id'        => $exam->id,
                'question_id'    => $q['question_id'],
                'question_order' => $q['order'] ?? 0,
                'points'         => $q['points'],
                'is_required'    => true,
                'created_at'     => now(),
            ];
        }

        // Upsert: insert or update on duplicate (exam_id, question_id)
        DB::table('exam_questions')->upsert(
            $rows,
            ['exam_id', 'question_id'],
            ['question_order', 'points']
        );

        // Recalculate total_marks from all current exam questions
        $totalMarks = DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->sum('points');

        $totalQuestions = DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->count();

        // If exam was under review, reset to draft — lecturer must re-submit
        $statusReset = in_array($exam->status, ['pending_review', 'verified'], true);
        $updateData  = ['total_marks' => $totalMarks];
        if ($statusReset) {
            $updateData['status'] = 'draft';
        }
        $exam->update($updateData);

        $this->logActivity($user, 'exam_questions_updated', $exam->id, newValues: [
            'questions_added'  => count($questions),
            'total_questions'  => $totalQuestions,
            'total_marks'      => (float) $totalMarks,
            'status_reset'     => $statusReset,
        ]);

        return [
            'total_questions' => (int) $totalQuestions,
            'total_marks'     => (float) $totalMarks,
            'status_reset'    => $statusReset,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Remove Question                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Remove a single question from an exam.
     *
     * @param  Exam  $exam
     * @param  int   $questionId
     * @param  User  $user
     * @return void
     */
    public function removeQuestion(Exam $exam, int $questionId, User $user): array
    {
        DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->where('question_id', $questionId)
            ->delete();

        // Recalculate total_marks
        $totalMarks = DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->sum('points');

        // If exam was under review, reset to draft — lecturer must re-submit
        $statusReset = in_array($exam->status, ['pending_review', 'verified'], true);
        $updateData  = ['total_marks' => $totalMarks];
        if ($statusReset) {
            $updateData['status'] = 'draft';
        }
        $exam->update($updateData);

        $this->logActivity($user, 'exam_question_removed', $exam->id, oldValues: [
            'question_id' => $questionId,
        ], newValues: ['status_reset' => $statusReset]);

        return ['status_reset' => $statusReset];
    }

    /* ------------------------------------------------------------------ */
    /*  Publish                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Publish a draft exam.
     *
     * @param  Exam  $exam
     * @param  User  $user
     * @return Exam
     *
     * @throws \RuntimeException If validation conditions are not met.
     */
    public function publish(Exam $exam, User $user): Exam
    {
        // Practice exams bypass the HOD/admin workflow — publishable from draft directly
        if ($exam->is_practice) {
            if (! in_array($exam->status, ['draft', 'verified'], true)) {
                throw new \RuntimeException(
                    "Practice exam cannot be published from '{$exam->status}' status."
                );
            }
        } elseif ($exam->status !== 'verified') {
            throw new \RuntimeException(
                "Only verified exams can be published. This exam is currently '{$exam->status}'. " .
                "It must be submitted for review and verified by an HOD first."
            );
        }

        $questionCount = DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->count();

        if ($questionCount < 1) {
            throw new \RuntimeException(
                'Cannot publish an exam with no questions. Add at least one question first.'
            );
        }

        if (! $exam->is_practice) {
            if (is_null($exam->start_time) || is_null($exam->end_time)) {
                throw new \RuntimeException(
                    'Cannot publish a non-practice exam without a valid start_time and end_time.'
                );
            }
        }

        $exam->update(['status' => 'published']);

        $this->logActivity($user, 'exam_published', $exam->id, newValues: [
            'title'       => $exam->title,
            'exam_type'   => $exam->exam_type,
            'is_practice' => $exam->is_practice,
        ]);

        // Notify creator and enrolled students (non-critical — never breaks the workflow)
        try {
            if ($exam->creator) {
                $this->notifications->notify(
                    $exam->creator,
                    'exam_published',
                    'Exam Published',
                    "Your exam \"{$exam->title}\" has been published and is now available to students.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }

            $courseCode = $exam->course->code ?? 'your course';
            $examLabel  = $exam->is_practice ? 'practice exam' : 'exam';
            $notifType  = $exam->is_practice ? 'practice_exam_available' : 'exam_available';
            $notifTitle = $exam->is_practice ? 'New Practice Exam Available' : 'New Exam Published';

            $enrolledStudents = User::join('course_enrollments', 'users.id', '=', 'course_enrollments.student_id')
                ->where('course_enrollments.course_id', $exam->course_id)
                ->where('course_enrollments.status', 'active')
                ->select('users.*')
                ->get();

            foreach ($enrolledStudents as $student) {
                $this->notifications->notify(
                    $student,
                    $notifType,
                    $notifTitle,
                    "A new {$examLabel} \"{$exam->title}\" is now available for {$courseCode}.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }
        } catch (\Exception $e) {
            // Notification failure must not block the publish action
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Submit for Review                                                   */
    /* ------------------------------------------------------------------ */

    /**
     * Lecturer submits a draft exam for HOD review.
     *
     * @param  Exam  $exam
     * @param  User  $user
     * @return Exam
     *
     * @throws \RuntimeException If not in draft status or has no questions.
     */
    public function submitForReview(Exam $exam, User $user): Exam
    {
        if ($exam->is_practice) {
            throw new \RuntimeException(
                'Practice exams do not require HOD review. You can publish them directly.'
            );
        }

        if ($exam->status !== 'draft') {
            throw new \RuntimeException(
                "Only draft exams can be submitted for review. This exam is currently '{$exam->status}'."
            );
        }

        $questionCount = DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->count();

        if ($questionCount < 1) {
            throw new \RuntimeException(
                'Cannot submit for review: exam has no questions. Add at least one question first.'
            );
        }

        $exam->update(['status' => 'pending_review']);

        $this->logActivity($user, 'exam_submitted_for_review', $exam->id, newValues: [
            'title'  => $exam->title,
            'status' => 'pending_review',
        ]);

        // Notify HODs in the course's department (non-critical — never breaks the workflow)
        try {
            if ($exam->course) {
                $hods = User::where('role', 'lecturer')
                    ->where('is_hod', true)
                    ->where('department_id', $exam->course->department_id)
                    ->get();
                foreach ($hods as $hod) {
                    $this->notifications->notify(
                        $hod,
                        'exam_review_requested',
                        'Exam Submitted for Review',
                        "{$user->full_name} has submitted \"{$exam->title}\" ({$exam->course->code}) for HOD review.",
                        ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                    );
                }
            }
        } catch (\Exception $e) {
            // Notification failure must not block the submit-for-review action
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Verify (HOD Approval)                                              */
    /* ------------------------------------------------------------------ */

    /**
     * HOD verifies a pending_review exam, making it ready for admin to publish.
     *
     * @param  Exam  $exam
     * @param  User  $user
     * @return Exam
     *
     * @throws \RuntimeException If not in pending_review status.
     */
    public function verifyExam(Exam $exam, User $user): Exam
    {
        if ($exam->status !== 'pending_review') {
            throw new \RuntimeException(
                "Only pending_review exams can be verified. This exam is currently '{$exam->status}'."
            );
        }

        $exam->update(['status' => 'verified']);

        $this->logActivity($user, 'exam_verified', $exam->id, newValues: [
            'title'  => $exam->title,
            'status' => 'verified',
        ]);

        // Notify creator and admins (non-critical — never breaks the workflow)
        try {
            if ($exam->creator) {
                $this->notifications->notify(
                    $exam->creator,
                    'exam_verified',
                    'Exam Verified',
                    "Your exam \"{$exam->title}\" has been verified by the HOD and is now awaiting admin scheduling and publishing.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }

            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $this->notifications->notify(
                    $admin,
                    'exam_ready_to_publish',
                    'Exam Ready to Publish',
                    "\"{$exam->title}\" has been verified by an HOD and is ready to be scheduled and published.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }
        } catch (\Exception $e) {
            // Notification failure must not block the verify action
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Reject (HOD or Admin sends back to draft)                          */
    /* ------------------------------------------------------------------ */

    /**
     * Reject a pending_review or verified exam back to draft.
     *
     * @param  Exam    $exam
     * @param  User    $user
     * @param  string  $reason  Optional rejection reason.
     * @return Exam
     *
     * @throws \RuntimeException If exam is not in a rejectable status.
     */
    public function rejectExam(Exam $exam, User $user, string $reason = ''): Exam
    {
        if (! in_array($exam->status, ['pending_review', 'verified'], true)) {
            throw new \RuntimeException(
                "Only pending_review or verified exams can be rejected. This exam is currently '{$exam->status}'."
            );
        }

        $oldStatus = $exam->status;
        $exam->update(['status' => 'draft']);

        $this->logActivity($user, 'exam_rejected', $exam->id,
            oldValues: ['status' => $oldStatus],
            newValues: ['status' => 'draft', 'reason' => $reason],
        );

        // Notify the exam creator (non-critical — never breaks the workflow)
        try {
            if ($exam->creator) {
                $this->notifications->notify(
                    $exam->creator,
                    'exam_rejected',
                    'Exam Rejected — Needs Revision',
                    "Your exam \"{$exam->title}\" was rejected and returned to draft. Reason: {$reason}",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }
        } catch (\Exception $e) {
            // Notification failure must not block the reject action
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Submit Grading — Lecturer marks grading as complete                */
    /* ------------------------------------------------------------------ */

    /**
     * Lecturer/admin submits grading for HOD verification.
     *
     * @throws \RuntimeException
     */
    public function submitGrading(Exam $exam, User $user): Exam
    {
        if (! in_array($exam->results_status, ['pending_grading', 'grading_rejected', null], true)) {
            throw new \RuntimeException(
                "Grading can only be submitted when status is 'pending_grading' or 'grading_rejected'. " .
                "Current status: '{$exam->results_status}'."
            );
        }

        // Verify all answers have been graded (single query)
        $submittedSessionIds = $exam->sessions()
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->pluck('id');

        $ungradedCount = \App\Models\StudentAnswer::whereIn('session_id', $submittedSessionIds)
            ->where('is_final', true)
            ->whereNull('is_correct')
            ->whereHas('question', fn ($q) => $q->whereIn('question_type', ['fill_in_blank', 'essay']))
            ->count();

        if ($ungradedCount > 0) {
            throw new \RuntimeException(
                "Cannot submit grading — {$ungradedCount} answer(s) still need manual grading."
            );
        }

        $exam->update(['results_status' => 'grading_submitted']);

        $this->logActivity($user, 'grading_submitted', $exam->id, newValues: [
            'results_status' => 'grading_submitted',
        ]);

        // Notify HODs in the course's department
        try {
            if ($exam->course) {
                $hods = User::where('role', 'lecturer')
                    ->where('is_hod', true)
                    ->where('department_id', $exam->course->department_id)
                    ->get();
                foreach ($hods as $hod) {
                    $this->notifications->notify(
                        $hod,
                        'grading_submitted',
                        'Grading Ready for Verification',
                        "Grading for \"{$exam->title}\" ({$exam->course->code}) is complete and ready for verification.",
                        ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                    );
                }
            }
        } catch (\Exception $e) {
            // Non-critical
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Reject Grading — HOD sends grading back to lecturer               */
    /* ------------------------------------------------------------------ */

    /**
     * HOD/admin rejects grading and returns it to the lecturer.
     *
     * @throws \RuntimeException
     */
    public function rejectGrading(Exam $exam, User $user, string $reason): Exam
    {
        if ($exam->results_status !== 'grading_submitted') {
            throw new \RuntimeException(
                "Only submitted grading can be rejected. Current status: '{$exam->results_status}'."
            );
        }

        $exam->update(['results_status' => 'pending_grading']);

        $this->logActivity($user, 'grading_rejected', $exam->id, newValues: [
            'results_status' => 'pending_grading',
            'reason'         => $reason,
        ]);

        // Notify exam creator
        try {
            if ($exam->creator) {
                $this->notifications->notify(
                    $exam->creator,
                    'grading_rejected',
                    'Grading Rejected — Needs Revision',
                    "Grading for \"{$exam->title}\" was rejected. Reason: {$reason}",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }
        } catch (\Exception $e) {
            // Non-critical
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Verify Results — HOD approves grading                             */
    /* ------------------------------------------------------------------ */

    /**
     * HOD/admin verifies grading results, making them ready for admin publishing.
     *
     * @throws \RuntimeException
     */
    public function verifyResults(Exam $exam, User $user): Exam
    {
        if ($exam->results_status !== 'grading_submitted') {
            throw new \RuntimeException(
                "Only submitted grading can be verified. Current status: '{$exam->results_status}'."
            );
        }

        $exam->update(['results_status' => 'results_verified']);

        $this->logActivity($user, 'results_verified', $exam->id, newValues: [
            'results_status' => 'results_verified',
        ]);

        // Notify admins and exam creator
        try {
            $admins = User::where('role', 'admin')->get();
            foreach ($admins as $admin) {
                $this->notifications->notify(
                    $admin,
                    'results_verified',
                    'Results Ready to Publish',
                    "Results for \"{$exam->title}\" have been verified by the HOD and are ready to publish.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }

            if ($exam->creator) {
                $this->notifications->notify(
                    $exam->creator,
                    'results_verified',
                    'Results Verified',
                    "Your exam \"{$exam->title}\" results have been verified. Admin will publish them soon.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }
        } catch (\Exception $e) {
            // Non-critical
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Publish Results — Admin makes results visible to students          */
    /* ------------------------------------------------------------------ */

    /**
     * Admin publishes results to students.
     *
     * @throws \RuntimeException
     */
    public function publishResults(Exam $exam, User $user): Exam
    {
        if ($exam->results_status !== 'results_verified') {
            throw new \RuntimeException(
                "Only verified results can be published. Current status: '{$exam->results_status}'."
            );
        }

        $exam->update([
            'results_status' => 'results_published',
            'metadata'       => array_merge($exam->metadata ?? [], [
                'results_published_at' => now()->toIso8601String(),
            ]),
        ]);

        $this->logActivity($user, 'results_published', $exam->id, newValues: [
            'results_status' => 'results_published',
        ]);

        // Notify exam creator and enrolled students
        try {
            if ($exam->creator) {
                $this->notifications->notify(
                    $exam->creator,
                    'results_published',
                    'Results Published',
                    "Results for \"{$exam->title}\" have been published to students.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }

            $enrolledStudents = User::join('course_enrollments', 'users.id', '=', 'course_enrollments.student_id')
                ->where('course_enrollments.course_id', $exam->course_id)
                ->where('course_enrollments.status', 'active')
                ->select('users.*')
                ->get();

            foreach ($enrolledStudents as $student) {
                $this->notifications->notify(
                    $student,
                    'results_published',
                    'Exam Results Available',
                    "Your results for \"{$exam->title}\" are now available.",
                    ['related_entity_type' => 'exam', 'related_entity_id' => $exam->id]
                );
            }
        } catch (\Exception $e) {
            // Non-critical
        }

        return $exam->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Student Results — Individual student results (published only)      */
    /* ------------------------------------------------------------------ */

    /**
     * Get a student's individual results for a published exam.
     *
     * @throws \RuntimeException
     */
    public function getStudentResults(Exam $exam, User $student): array
    {
        if ($exam->results_status !== 'results_published') {
            throw new \RuntimeException('Results for this exam have not been published yet.');
        }

        $session = $exam->sessions()
            ->where('student_id', $student->id)
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->first();

        if (! $session) {
            throw new \RuntimeException('No submitted exam session found.');
        }

        $answers = $session->finalAnswers()
            ->with('question')
            ->get()
            ->map(function ($answer) use ($exam) {
                $examQuestion = $exam->examQuestions()
                    ->where('question_id', $answer->question_id)
                    ->first();

                return [
                    'question_id'     => $answer->question_id,
                    'question_text'   => $answer->question?->question_text,
                    'question_type'   => $answer->question?->question_type,
                    'your_answer'     => $answer->answer_text ?? $answer->selected_option,
                    'correct_answer'  => $exam->show_correct_answers
                        ? $answer->question?->correct_answer
                        : null,
                    'is_correct'      => $answer->is_correct,
                    'points_awarded'  => (float) $answer->points_awarded,
                    'points_possible' => $examQuestion ? (float) $examQuestion->points : 0,
                ];
            })
            ->values()
            ->toArray();

        return [
            'exam_id'              => $exam->id,
            'exam_title'           => $exam->title,
            'course_code'          => $exam->course?->code,
            'total_marks'          => (float) $exam->total_marks,
            'passing_marks'        => (float) $exam->passing_marks,
            'student_score'        => (float) $session->total_score,
            'percentage'           => (float) $session->percentage,
            'passed'               => (float) $session->total_score >= (float) $exam->passing_marks,
            'submitted_at'         => $session->submitted_at?->toIso8601String(),
            'show_correct_answers' => $exam->show_correct_answers,
            'answers'              => $answers,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Results                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Get exam results and statistics.
     *
     * @param  Exam  $exam
     * @return array
     */
    public function getResults(Exam $exam): array
    {
        $sessions = $exam->sessions()->with('student')->get();

        $submitted = $sessions->whereIn('status', ['submitted', 'auto_submitted']);

        $scores = $submitted->whereNotNull('total_score')->pluck('total_score')->map(fn($s) => (float) $s);

        $avgScore     = $scores->count() > 0 ? round($scores->average(), 2) : null;
        $highestScore = $scores->count() > 0 ? $scores->max() : null;
        $lowestScore  = $scores->count() > 0 ? $scores->min() : null;

        $passing = (float) $exam->passing_marks;
        $passCount = $scores->filter(fn($s) => $s >= $passing)->count();
        $passRate = $scores->count() > 0 ? round(($passCount / $scores->count()) * 100, 2) : null;

        $results = $submitted->map(function ($session) use ($exam) {
            return [
                'session_id'    => $session->id,
                'student_id'    => $session->student_id,
                'student_name'  => $session->student?->full_name,
                'student_email' => $session->student?->email,
                'status'        => $session->status,
                'total_score'   => $session->total_score !== null ? (float) $session->total_score : null,
                'percentage'    => $session->percentage !== null ? (float) $session->percentage : null,
                'passed'        => $session->total_score !== null ? (float) $session->total_score >= (float) $exam->passing_marks : null,
                'started_at'    => $session->started_at?->toIso8601String(),
                'submitted_at'  => $session->submitted_at?->toIso8601String(),
            ];
        })->values()->toArray();

        // Count ungraded answers across all submitted sessions (single query)
        $ungradedCount = \App\Models\StudentAnswer::whereIn('session_id', $submitted->pluck('id'))
            ->where('is_final', true)
            ->whereNull('is_correct')
            ->whereHas('question', fn ($q) => $q->whereIn('question_type', ['fill_in_blank', 'essay']))
            ->count();

        return [
            'exam_id'                => $exam->id,
            'exam_title'             => $exam->title,
            'results_status'         => $exam->results_status ?? 'pending_grading',
            'needs_manual_grading'   => $ungradedCount > 0,
            'ungraded_answers_count' => $ungradedCount,
            'total_students'         => $sessions->unique('student_id')->count(),
            'completed'              => $submitted->count(),
            'in_progress'            => $sessions->where('status', 'in_progress')->count(),
            'avg_score'              => $avgScore,
            'highest_score'          => $highestScore,
            'lowest_score'           => $lowestScore,
            'pass_rate'              => $passRate,
            'results'                => $results,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Statistics                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Get exam statistics for a user's scope.
     *
     * @param  User  $user
     * @return array
     */
    public function getStats(User $user): array
    {
        $query = Exam::query();

        if ($user->role === 'lecturer') {
            $query->where('created_by', $user->id);
        }

        return [
            'total'          => (clone $query)->count(),
            'draft'          => (clone $query)->where('status', 'draft')->count(),
            'pending_review' => (clone $query)->where('status', 'pending_review')->count(),
            'verified'       => (clone $query)->where('status', 'verified')->count(),
            'published'      => (clone $query)->where('status', 'published')->count(),
            'completed'      => (clone $query)->where('status', 'completed')->count(),
            'archived'       => (clone $query)->where('status', 'archived')->count(),
            'practice'       => (clone $query)->where('is_practice', true)->count(),
            'by_type'   => [
                'quiz'     => (clone $query)->where('exam_type', 'quiz')->count(),
                'midterm'  => (clone $query)->where('exam_type', 'midterm')->count(),
                'final'    => (clone $query)->where('exam_type', 'final')->count(),
                'makeup'   => (clone $query)->where('exam_type', 'makeup')->count(),
                'practice' => (clone $query)->where('exam_type', 'practice')->count(),
            ],
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private function logActivity(
        User $user,
        string $action,
        int $entityId,
        array $oldValues = [],
        array $newValues = [],
    ): void {
        ActivityLog::log(
            action: $action,
            entityType: 'exam',
            entityId: $entityId,
            extra: [
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata'   => ['user_id' => $user->id],
            ],
        );
    }
}
