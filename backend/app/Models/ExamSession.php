<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class ExamSession extends Model
{
    use HasFactory;

    /* ------------------------------------------------------------------ */
    /*  Boot — Auto-generate UUID and session token on creation           */
    /* ------------------------------------------------------------------ */

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model): void {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
            if (empty($model->session_token)) {
                $model->session_token = bin2hex(random_bytes(32));
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $fillable = [
        'uuid',
        'exam_id',
        'student_id',
        'session_token',
        'started_at',
        'scheduled_end_time',
        'submitted_at',
        'actual_end_time',
        'question_sequence',
        'current_question_index',
        'questions_answered',
        'questions_flagged',
        'status',
        'last_activity_at',
        'recovery_data',
        'total_score',
        'percentage',
        'ip_address',
        'user_agent',
        'device_fingerprint',
        'has_violations',
        'violation_count',
        'violations',
    ];

    /* ------------------------------------------------------------------ */
    /*  Hidden / Serialization                                            */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $hidden = [
        'session_token', // Sensitive — only expose through specific endpoints
        'ip_address',
        'user_agent',
        'device_fingerprint',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'started_at'         => 'datetime',
            'scheduled_end_time' => 'datetime',
            'submitted_at'       => 'datetime',
            'actual_end_time'    => 'datetime',
            'last_activity_at'   => 'datetime',
            'question_sequence'  => 'array',
            'questions_flagged'  => 'array',
            'recovery_data'      => 'array',
            'violations'         => 'array',
            'total_score'        => 'decimal:2',
            'percentage'         => 'decimal:2',
            'has_violations'     => 'boolean',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** The exam this session belongs to. */
    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    /** The student taking the exam. */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /** Answers submitted during this session. */
    public function answers(): HasMany
    {
        return $this->hasMany(StudentAnswer::class, 'session_id');
    }

    /** Final (latest-version) answers submitted during this session. */
    public function finalAnswers(): HasMany
    {
        return $this->hasMany(StudentAnswer::class, 'session_id')
                    ->where('is_final', true);
    }

    /** Snapshots taken during this session. */
    public function snapshots(): HasMany
    {
        return $this->hasMany(SessionSnapshot::class, 'session_id');
    }

    /** Activity logs related to this session. */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'session_id');
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: in-progress sessions. */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }

    /** Scope: submitted sessions. */
    public function scopeSubmitted($query)
    {
        return $query->whereIn('status', ['submitted', 'auto_submitted']);
    }

    /** Scope: interrupted (needs recovery). */
    public function scopeInterrupted($query)
    {
        return $query->where('status', 'interrupted');
    }

    /** Scope: sessions with violations. */
    public function scopeWithViolations($query)
    {
        return $query->where('has_violations', true);
    }

    /** Scope: sessions for a specific exam. */
    public function scopeForExam($query, int $examId)
    {
        return $query->where('exam_id', $examId);
    }

    /** Scope: sessions for a specific student. */
    public function scopeForStudent($query, int $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /* ------------------------------------------------------------------ */
    /*  Helper Methods                                                    */
    /* ------------------------------------------------------------------ */

    /** Check if the session is still in progress. */
    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    /** Check if the session has been submitted. */
    public function isSubmitted(): bool
    {
        return in_array($this->status, ['submitted', 'auto_submitted']);
    }

    /** Check if the session was interrupted. */
    public function isInterrupted(): bool
    {
        return $this->status === 'interrupted';
    }

    /** Check if the session has timed out. */
    public function isTimedOut(): bool
    {
        return $this->scheduled_end_time && now()->isAfter($this->scheduled_end_time);
    }

    /** Get time remaining in seconds. */
    public function getTimeRemainingSeconds(): int
    {
        if (!$this->scheduled_end_time || $this->isTimedOut()) {
            return 0;
        }

        return (int) now()->diffInSeconds($this->scheduled_end_time, false);
    }

    /** Get total number of questions in this session. */
    public function getTotalQuestionsCount(): int
    {
        return is_array($this->question_sequence)
            ? count($this->question_sequence)
            : 0;
    }

    /** Record a violation event. */
    public function recordViolation(string $type, ?string $description = null): void
    {
        $violations = $this->violations ?? [];

        $violations[] = [
            'type'        => $type,
            'description' => $description,
            'timestamp'   => now()->toIso8601String(),
        ];

        $this->update([
            'violations'      => $violations,
            'violation_count' => count($violations),
            'has_violations'  => true,
        ]);
    }

    /** Check if the student passed the exam. */
    public function hasPassed(): bool
    {
        if ($this->total_score === null) {
            return false;
        }

        return $this->total_score >= $this->exam->passing_marks;
    }
}
