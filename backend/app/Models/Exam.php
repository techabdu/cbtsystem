<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Exam extends Model
{
    use HasFactory, SoftDeletes;

    /* ------------------------------------------------------------------ */
    /*  Boot — Auto-generate UUID on creation                             */
    /* ------------------------------------------------------------------ */

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model): void {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $fillable = [
        'uuid',
        'course_id',
        'created_by',
        'title',
        'description',
        'instructions',
        'exam_type',
        'start_time',
        'end_time',
        'duration_minutes',
        'total_marks',
        'passing_marks',
        'randomize_questions',
        'randomize_options',
        'questions_per_page',
        'allow_backtrack',
        'show_results_immediately',
        'show_correct_answers',
        'requires_password',
        'exam_password_hash',
        'allowed_student_ids',
        'status',
        'is_practice',
        'enable_proctoring',
        'proctoring_config',
        'metadata',
    ];

    /* ------------------------------------------------------------------ */
    /*  Hidden / Serialization                                            */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $hidden = [
        'exam_password_hash',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'start_time'              => 'datetime',
            'end_time'                => 'datetime',
            'total_marks'             => 'decimal:2',
            'passing_marks'           => 'decimal:2',
            'randomize_questions'     => 'boolean',
            'randomize_options'       => 'boolean',
            'allow_backtrack'         => 'boolean',
            'show_results_immediately' => 'boolean',
            'show_correct_answers'    => 'boolean',
            'requires_password'       => 'boolean',
            'is_practice'             => 'boolean',
            'enable_proctoring'       => 'boolean',
            'allowed_student_ids'     => 'array',
            'proctoring_config'       => 'array',
            'metadata'                => 'array',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** Course this exam belongs to. */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** User who created this exam. */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Questions linked to this exam (through pivot). */
    public function questions(): BelongsToMany
    {
        return $this->belongsToMany(Question::class, 'exam_questions')
                    ->withPivot('question_order', 'points', 'is_required')
                    ->orderByPivot('question_order');
    }

    /** Exam question pivot records (direct access). */
    public function examQuestions(): HasMany
    {
        return $this->hasMany(ExamQuestion::class)->orderBy('question_order');
    }

    /** Exam sessions (student attempts). */
    public function sessions(): HasMany
    {
        return $this->hasMany(ExamSession::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only published exams. */
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }

    /** Scope: exams that haven't started yet. */
    public function scopeUpcoming($query)
    {
        return $query->where('start_time', '>', now());
    }

    /** Scope: currently active (between start and end). */
    public function scopeOngoing($query)
    {
        return $query->where('start_time', '<=', now())
                     ->where('end_time', '>=', now());
    }

    /** Scope: completed exams. */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /** Scope: draft exams. */
    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    /** Scope: practice exams only. */
    public function scopePractice($query)
    {
        return $query->where('is_practice', true);
    }

    /** Scope: real (non-practice) exams only. */
    public function scopeReal($query)
    {
        return $query->where('is_practice', false);
    }

    /** Scope: filter by exam type. */
    public function scopeOfType($query, string $type)
    {
        return $query->where('exam_type', $type);
    }

    /** Scope: filter by course. */
    public function scopeForCourse($query, int $courseId)
    {
        return $query->where('course_id', $courseId);
    }

    /* ------------------------------------------------------------------ */
    /*  Helper Methods                                                    */
    /* ------------------------------------------------------------------ */

    /** Check if the exam is currently within its time window. */
    public function isWithinTimeWindow(): bool
    {
        return now()->between($this->start_time, $this->end_time);
    }

    /** Check if the exam is published. */
    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    /** Check if the exam is a draft. */
    public function isDraft(): bool
    {
        return $this->status === 'draft';
    }

    /** Check if the exam has ended. */
    public function hasEnded(): bool
    {
        return now()->isAfter($this->end_time);
    }

    /** Check if the exam hasn't started yet. */
    public function hasNotStarted(): bool
    {
        return now()->isBefore($this->start_time);
    }

    /** Get total number of questions for this exam. */
    public function getQuestionCount(): int
    {
        return $this->examQuestions()->count();
    }
}
