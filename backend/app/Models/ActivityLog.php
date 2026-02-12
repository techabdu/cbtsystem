<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityLog extends Model
{
    use HasFactory;

    /* ------------------------------------------------------------------ */
    /*  Timestamps                                                        */
    /* ------------------------------------------------------------------ */

    /** Only created_at, no updated_at — logs are immutable. */
    public $timestamps = false;

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $fillable = [
        'user_id',
        'session_id',
        'action',
        'entity_type',
        'entity_id',
        'description',
        'ip_address',
        'user_agent',
        'old_values',
        'new_values',
        'metadata',
        'created_at',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'metadata'   => 'array',
            'created_at' => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** The user who performed the action. */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** The exam session related to this log (if applicable). */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'session_id');
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: filter by action. */
    public function scopeAction($query, string $action)
    {
        return $query->where('action', $action);
    }

    /** Scope: filter by entity type. */
    public function scopeForEntity($query, string $entityType, ?int $entityId = null)
    {
        $query->where('entity_type', $entityType);

        if ($entityId !== null) {
            $query->where('entity_id', $entityId);
        }

        return $query;
    }

    /** Scope: filter by user. */
    public function scopeByUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    /** Scope: filter by date range. */
    public function scopeBetween($query, string $from, string $to)
    {
        return $query->whereBetween('created_at', [$from, $to]);
    }

    /** Scope: latest logs first. */
    public function scopeLatestFirst($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    /* ------------------------------------------------------------------ */
    /*  Static Factory Method — convenient log creation                   */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new activity log entry.
     *
     * @param  string       $action      e.g., 'login', 'exam_started', 'answer_saved'
     * @param  string|null  $entityType  e.g., 'exam', 'question', 'user'
     * @param  int|null     $entityId    ID of the related entity
     * @param  array        $extra       Additional data (description, old_values, new_values, metadata)
     */
    public static function log(
        string $action,
        ?string $entityType = null,
        ?int    $entityId = null,
        array   $extra = [],
    ): self {
        return self::create(array_merge([
            'user_id'     => auth()->id(),
            'action'      => $action,
            'entity_type' => $entityType,
            'entity_id'   => $entityId,
            'ip_address'  => request()->ip(),
            'user_agent'  => request()->userAgent(),
            'created_at'  => now(),
        ], $extra));
    }
}
