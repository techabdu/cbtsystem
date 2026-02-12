<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentAnswer extends Model
{
    use HasFactory;

    /* ------------------------------------------------------------------ */
    /*  Timestamps                                                        */
    /* ------------------------------------------------------------------ */

    /** Disable default timestamps; we use custom timestamp columns. */
    public $timestamps = false;

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $fillable = [
        'session_id',
        'question_id',
        'answer_text',
        'selected_option',
        'is_flagged',
        'time_spent_seconds',
        'version',
        'is_final',
        'is_correct',
        'points_awarded',
        'first_answered_at',
        'last_updated_at',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'selected_option'   => 'array',
            'is_flagged'        => 'boolean',
            'is_final'          => 'boolean',
            'is_correct'        => 'boolean',
            'points_awarded'    => 'decimal:2',
            'first_answered_at' => 'datetime',
            'last_updated_at'   => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** The session this answer belongs to. */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'session_id');
    }

    /** The question this answer is for. */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only final answers (latest version per question). */
    public function scopeFinal($query)
    {
        return $query->where('is_final', true);
    }

    /** Scope: flagged answers. */
    public function scopeFlagged($query)
    {
        return $query->where('is_flagged', true);
    }

    /** Scope: correct answers. */
    public function scopeCorrect($query)
    {
        return $query->where('is_correct', true);
    }

    /** Scope: answers for a specific session. */
    public function scopeForSession($query, int $sessionId)
    {
        return $query->where('session_id', $sessionId);
    }

    /** Scope: answers for a specific question. */
    public function scopeForQuestion($query, int $questionId)
    {
        return $query->where('question_id', $questionId);
    }

    /** Scope: latest version per question within a session. */
    public function scopeLatestVersions($query, int $sessionId)
    {
        return $query->where('session_id', $sessionId)
                     ->whereIn('id', function ($sub) use ($sessionId) {
                         $sub->selectRaw('MAX(id)')
                             ->from('student_answers')
                             ->where('session_id', $sessionId)
                             ->groupBy('question_id');
                     });
    }

    /* ------------------------------------------------------------------ */
    /*  Helper Methods                                                    */
    /* ------------------------------------------------------------------ */

    /** Get the actual answer content (text or selected option). */
    public function getAnswerContent(): mixed
    {
        return $this->answer_text ?? $this->selected_option;
    }

    /** Check if this answer has been graded. */
    public function isGraded(): bool
    {
        return $this->is_correct !== null;
    }
}
