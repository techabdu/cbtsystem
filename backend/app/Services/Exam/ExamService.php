<?php

namespace App\Services\Exam;

use App\Models\ActivityLog;
use App\Models\Exam;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class ExamService
{
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
            // Lecturers see only exams they created
            $query->where('created_by', $user->id);
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
        $data['status']     = 'draft';

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

        $exam->update(['total_marks' => $totalMarks]);

        $this->logActivity($user, 'exam_questions_updated', $exam->id, newValues: [
            'questions_added'  => count($questions),
            'total_questions'  => $totalQuestions,
            'total_marks'      => (float) $totalMarks,
        ]);

        return [
            'total_questions' => (int) $totalQuestions,
            'total_marks'     => (float) $totalMarks,
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
    public function removeQuestion(Exam $exam, int $questionId, User $user): void
    {
        DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->where('question_id', $questionId)
            ->delete();

        // Recalculate total_marks
        $totalMarks = DB::table('exam_questions')
            ->where('exam_id', $exam->id)
            ->sum('points');

        $exam->update(['total_marks' => $totalMarks]);

        $this->logActivity($user, 'exam_question_removed', $exam->id, oldValues: [
            'question_id' => $questionId,
        ]);
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
        if ($exam->status !== 'draft') {
            throw new \RuntimeException(
                "Only draft exams can be published. This exam is currently '{$exam->status}'."
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

        // Non-practice exams require valid time window
        if (! $exam->is_practice) {
            if (is_null($exam->start_time) || is_null($exam->end_time)) {
                throw new \RuntimeException(
                    'Cannot publish a non-practice exam without a valid start_time and end_time.'
                );
            }
        }

        $exam->update(['status' => 'published']);

        $this->logActivity($user, 'exam_published', $exam->id, newValues: [
            'title'      => $exam->title,
            'exam_type'  => $exam->exam_type,
            'is_practice'=> $exam->is_practice,
        ]);

        return $exam->fresh()->load(['course', 'creator']);
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

        return [
            'exam_id'         => $exam->id,
            'exam_title'      => $exam->title,
            'total_students'  => $sessions->unique('student_id')->count(),
            'completed'       => $submitted->count(),
            'in_progress'     => $sessions->where('status', 'in_progress')->count(),
            'avg_score'       => $avgScore,
            'highest_score'   => $highestScore,
            'lowest_score'    => $lowestScore,
            'pass_rate'       => $passRate,
            'results'         => $results,
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
            'total'     => (clone $query)->count(),
            'draft'     => (clone $query)->where('status', 'draft')->count(),
            'published' => (clone $query)->where('status', 'published')->count(),
            'completed' => (clone $query)->where('status', 'completed')->count(),
            'archived'  => (clone $query)->where('status', 'archived')->count(),
            'practice'  => (clone $query)->where('is_practice', true)->count(),
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
