<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Department extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('departments.active'));
        static::deleted(fn () => Cache::forget('departments.active'));
    }

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $fillable = [
        'school_id',
        'code',
        'name',
        'description',
        'is_active',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** Courses belonging to this department. */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    /** School this department belongs to. */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only active departments. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
