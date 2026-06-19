<?php

namespace App\Services\Question;
use App\Exceptions\BusinessRuleException;

use App\Models\ActivityLog;
use App\Models\Course;
use App\Models\Question;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class QuestionService
{
    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter (role-aware)                                */
    /* ------------------------------------------------------------------ */

    /**
     * Get a paginated, filterable list of questions.
     *
     * - Admins see all questions.
     * - Lecturers see only questions for their assigned courses.
     *
     * @param  array  $filters  Accepted keys: search, course_id, question_type, difficulty_level,
     *                          topic, is_active, is_verified, trashed, per_page, sort_by, sort_dir
     * @param  User   $user     The authenticated user (for role-based scoping)
     * @return LengthAwarePaginator
     */
    public function list(array $filters = [], User $user = null): LengthAwarePaginator
    {
        $query = Question::with(['course', 'creator']);

        // --- Role-based scoping ---
        if ($user && $user->role === 'lecturer') {
            // Lecturers see only questions for courses they are assigned to
            $assignedCourseIds = $user->taughtCourses()->pluck('courses.id')->toArray();
            $query->whereIn('course_id', $assignedCourseIds);
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

        // --- Question type filter ---
        if (! empty($filters['question_type'])) {
            $query->where('question_type', $filters['question_type']);
        }

        // --- Difficulty level filter ---
        if (! empty($filters['difficulty_level'])) {
            $query->where('difficulty_level', $filters['difficulty_level']);
        }

        // --- Topic filter ---
        if (! empty($filters['topic'])) {
            $query->where('topic', $filters['topic']);
        }

        // --- Active status filter ---
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // --- Verification status filter ---
        if (isset($filters['is_verified'])) {
            $query->where('is_verified', filter_var($filters['is_verified'], FILTER_VALIDATE_BOOLEAN));
        }

        // --- Search (question text, topic) ---
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('question_text', 'LIKE', "%{$term}%")
                  ->orWhere('topic', 'LIKE', "%{$term}%");
            });
        }

        // --- Sorting ---
        $sortBy  = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';
        $allowedSorts = ['created_at', 'question_type', 'difficulty_level', 'points', 'topic', 'times_used'];
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
     * Find a question by ID.
     *
     * @param  int  $id
     * @return Question
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function find(string $id): Question
    {
        return Question::with(['course', 'creator', 'verifier'])
            ->where('uuid', $id)
            ->firstOrFail();
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new question.
     *
     * @param  array  $data  Validated request data.
     * @param  User   $user  The user creating the question.
     * @return Question
     */
    public function create(array $data, User $user): Question
    {
        $data['created_by'] = $user->id;

        // Set has_image flag based on image_url
        if (! empty($data['image_url'])) {
            $data['has_image'] = true;
        }

        $question = Question::create($data);

        $this->logActivity($user, 'question_created', $question->id, newValues: [
            'course_id'     => $question->course_id,
            'question_type' => $question->question_type,
            'topic'         => $question->topic,
        ]);

        return $question->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Update an existing question.
     *
     * @param  Question  $question
     * @param  array     $data  Validated request data.
     * @param  User      $user
     * @return Question
     */
    public function update(Question $question, array $data, User $user): Question
    {
        $oldValues = $question->only(array_keys($data));

        // Update has_image flag based on image_url
        if (array_key_exists('image_url', $data)) {
            $data['has_image'] = ! empty($data['image_url']);
        }

        // If question content changed, reset verification
        $contentFields = ['question_text', 'options', 'correct_answer', 'question_type'];
        $contentChanged = false;
        foreach ($contentFields as $field) {
            if (array_key_exists($field, $data) && $data[$field] !== $question->$field) {
                $contentChanged = true;
                break;
            }
        }
        if ($contentChanged) {
            $data['is_verified'] = false;
            $data['verified_by'] = null;
            $data['verified_at'] = null;
        }

        $question->update($data);

        $this->logActivity($user, 'question_updated', $question->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $question->fresh()->load(['course', 'creator', 'verifier']);
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete a question.
     *
     * @param  Question  $question
     * @param  User      $user
     * @return void
     *
     * @throws \RuntimeException If question is used in active exams.
     */
    public function delete(Question $question, User $user): void
    {
        // Check if question is in any published/ongoing exams
        $activeExamCount = $question->exams()
            ->whereIn('status', ['published', 'ongoing'])
            ->count();

        if ($activeExamCount > 0) {
            throw new BusinessRuleException(
                "Cannot delete a question that is used in {$activeExamCount} active exam(s). Remove it from those exams first."
            );
        }

        $question->update(['is_active' => false]);
        $question->delete();

        $this->logActivity($user, 'question_deleted', $question->id, oldValues: [
            'question_text' => mb_substr($question->question_text, 0, 100),
            'course_id'     => $question->course_id,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted question.
     *
     * @param  int   $id
     * @param  User  $user
     * @return Question
     */
    public function restore(string $id, User $user): Question
    {
        $question = Question::onlyTrashed()->where('uuid', $id)->firstOrFail();
        $question->restore();
        $question->update(['is_active' => true]);

        $this->logActivity($user, 'question_restored', $question->id);

        return $question->fresh()->load(['course', 'creator']);
    }

    /* ------------------------------------------------------------------ */
    /*  Verify                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Mark a question as verified (by an admin or different lecturer).
     *
     * @param  Question  $question
     * @param  User      $user
     * @return Question
     */
    public function verify(Question $question, User $user): Question
    {
        $question->update([
            'is_verified'  => true,
            'verified_by'  => $user->id,
            'verified_at'  => now(),
        ]);

        $this->logActivity($user, 'question_verified', $question->id);

        return $question->fresh()->load(['course', 'creator', 'verifier']);
    }

    /* ------------------------------------------------------------------ */
    /*  Bulk Upload                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Bulk upload questions from JSON data.
     *
     * @param  int    $courseId
     * @param  array  $questionsData  Array of question arrays
     * @param  User   $user
     * @return array  ['total_processed' => int, 'successful' => int, 'failed' => int, 'errors' => array]
     */
    public function bulkUpload(int $courseId, array $questionsData, User $user): array
    {
        $results = [
            'total_processed' => count($questionsData),
            'successful'      => 0,
            'failed'          => 0,
            'errors'          => [],
        ];

        foreach ($questionsData as $index => $qData) {
            $row = $index + 1;

            // Validate each question
            $validator = Validator::make($qData, [
                'question_text'    => 'required|string',
                'question_type'    => 'required|in:multiple_choice,true_false,fill_in_blank,essay',
                'options'          => 'required_if:question_type,multiple_choice|array|min:2',
                'options.*.key'    => 'required_with:options|string',
                'options.*.value'  => 'required_with:options|string',
                'correct_answer'   => 'required_unless:question_type,essay',
                'points'           => 'nullable|numeric|min:0.01|max:100',
                'difficulty_level' => 'nullable|in:easy,medium,hard',
                'topic'            => 'nullable|string|max:200',
                'tags'             => 'nullable|array',
            ]);

            if ($validator->fails()) {
                $results['failed']++;
                $results['errors'][] = [
                    'row'   => $row,
                    'error' => $validator->errors()->first(),
                ];
                continue;
            }

            try {
                Question::create([
                    'course_id'        => $courseId,
                    'created_by'       => $user->id,
                    'question_text'    => $qData['question_text'],
                    'question_type'    => $qData['question_type'],
                    'options'          => $qData['options'] ?? null,
                    'correct_answer'   => $qData['correct_answer'] ?? null,
                    'points'           => $qData['points'] ?? 1.00,
                    'difficulty_level' => $qData['difficulty_level'] ?? null,
                    'topic'            => $qData['topic'] ?? null,
                    'tags'             => $qData['tags'] ?? null,
                    'is_active'        => true,
                ]);

                $results['successful']++;
            } catch (\Exception $e) {
                $results['failed']++;
                $results['errors'][] = [
                    'row'   => $row,
                    'error' => 'Failed to save: ' . $e->getMessage(),
                ];
            }
        }

        $this->logActivity($user, 'questions_bulk_uploaded', $courseId, newValues: [
            'total_processed' => $results['total_processed'],
            'successful'      => $results['successful'],
            'failed'          => $results['failed'],
        ]);

        return $results;
    }

    /* ------------------------------------------------------------------ */
    /*  Statistics                                                         */
    /* ------------------------------------------------------------------ */

    /**
     * Get question statistics for a user's scope.
     *
     * @param  User  $user
     * @return array
     */
    public function getStats(User $user): array
    {
        $query = Question::query();

        if ($user->role === 'lecturer') {
            $assignedCourseIds = $user->taughtCourses()->pluck('courses.id')->toArray();
            $query->whereIn('course_id', $assignedCourseIds);
        }

        return [
            'total'        => (clone $query)->count(),
            'active'       => (clone $query)->where('is_active', true)->count(),
            'verified'     => (clone $query)->where('is_verified', true)->count(),
            'by_type'      => [
                'multiple_choice' => (clone $query)->where('question_type', 'multiple_choice')->count(),
                'true_false'      => (clone $query)->where('question_type', 'true_false')->count(),
                'fill_in_blank'   => (clone $query)->where('question_type', 'fill_in_blank')->count(),
                'essay'           => (clone $query)->where('question_type', 'essay')->count(),
            ],
            'by_difficulty' => [
                'easy'   => (clone $query)->where('difficulty_level', 'easy')->count(),
                'medium' => (clone $query)->where('difficulty_level', 'medium')->count(),
                'hard'   => (clone $query)->where('difficulty_level', 'hard')->count(),
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
            entityType: 'question',
            entityId: $entityId,
            extra: [
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata'   => ['user_id' => $user->id],
            ],
        );
    }
}
