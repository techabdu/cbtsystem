<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamAccessCode extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'student_id',
        'access_code',
        'semester',
        'academic_year',
        'is_active',
        'activated_at',
        'expires_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active'    => 'boolean',
            'activated_at' => 'datetime',
            'expires_at'   => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                      */
    /* ------------------------------------------------------------------ */

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                       */
    /* ------------------------------------------------------------------ */

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
              ->orWhere('expires_at', '>', now());
        });
    }

    public function scopeForStudent($query, int $studentId)
    {
        return $query->where('student_id', $studentId);
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    public function isValid(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->expires_at && now()->isAfter($this->expires_at)) {
            return false;
        }

        return true;
    }
}
