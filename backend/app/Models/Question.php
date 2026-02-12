<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Question extends Model
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
        'question_text',
        'question_type',
        'options',
        'correct_answer',
        'has_image',
        'image_url',
        'has_audio',
        'audio_url',
        'points',
        'difficulty_level',
        'topic',
        'tags',
        'times_used',
        'average_score',
        'is_active',
        'is_verified',
        'verified_by',
        'verified_at',
        'metadata',
    ];

    /* ------------------------------------------------------------------ */
    /*  Hidden / Serialization                                            */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $hidden = [
        'correct_answer', // Never expose correct answers in general queries
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'options'          => 'array',
            'correct_answer'   => 'array',
            'tags'             => 'array',
            'metadata'         => 'array',
            'points'           => 'decimal:2',
            'average_score'    => 'decimal:2',
            'has_image'        => 'boolean',
            'has_audio'        => 'boolean',
            'is_active'        => 'boolean',
            'is_verified'      => 'boolean',
            'verified_at'      => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** Course this question belongs to. */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /** User who created this question. */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** User who verified this question. */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /** Exams that include this question. */
    public function exams(): BelongsToMany
    {
        return $this->belongsToMany(Exam::class, 'exam_questions')
                    ->withPivot('question_order', 'points', 'is_required')
                    ->withTimestamps();
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only active questions. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** Scope: only verified questions. */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /** Scope: filter by question type. */
    public function scopeOfType($query, string $type)
    {
        return $query->where('question_type', $type);
    }

    /** Scope: filter by difficulty level. */
    public function scopeDifficulty($query, string $level)
    {
        return $query->where('difficulty_level', $level);
    }

    /** Scope: filter by course. */
    public function scopeForCourse($query, int $courseId)
    {
        return $query->where('course_id', $courseId);
    }

    /** Scope: filter by topic. */
    public function scopeTopic($query, string $topic)
    {
        return $query->where('topic', $topic);
    }

    /* ------------------------------------------------------------------ */
    /*  Helper Methods                                                    */
    /* ------------------------------------------------------------------ */

    /** Check if question is multiple choice. */
    public function isMultipleChoice(): bool
    {
        return $this->question_type === 'multiple_choice';
    }

    /** Check if question is true/false. */
    public function isTrueFalse(): bool
    {
        return $this->question_type === 'true_false';
    }

    /** Check if question is fill-in-the-blank. */
    public function isFillInBlank(): bool
    {
        return $this->question_type === 'fill_in_blank';
    }

    /** Check if question is an essay. */
    public function isEssay(): bool
    {
        return $this->question_type === 'essay';
    }

    /** Check if question requires manual grading. */
    public function requiresManualGrading(): bool
    {
        return in_array($this->question_type, ['essay', 'matching']);
    }

    /** Increment usage counter. */
    public function incrementUsage(): void
    {
        $this->increment('times_used');
    }
}
