<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SessionSnapshot extends Model
{
    use HasFactory;

    /* ------------------------------------------------------------------ */
    /*  Timestamps                                                        */
    /* ------------------------------------------------------------------ */

    /** Only created_at, no updated_at — snapshots are immutable. */
    public $timestamps = false;

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $fillable = [
        'session_id',
        'snapshot_data',
        'snapshot_type',
        'created_at',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'snapshot_data' => 'array',
            'created_at'    => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** The session this snapshot belongs to. */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ExamSession::class, 'session_id');
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: filter by snapshot type. */
    public function scopeOfType($query, string $type)
    {
        return $query->where('snapshot_type', $type);
    }

    /** Scope: auto-save snapshots. */
    public function scopeAutoSaves($query)
    {
        return $query->where('snapshot_type', 'auto_save');
    }

    /** Scope: recovery snapshots. */
    public function scopeRecoveryPoints($query)
    {
        return $query->where('snapshot_type', 'recovery');
    }

    /** Scope: latest snapshot first. */
    public function scopeLatestFirst($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}
