<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;

class Combination extends Model
{
    use HasFactory, SoftDeletes;

    protected static function booted(): void
    {
        static::saved(fn () => Cache::forget('combinations.active'));
        static::deleted(fn () => Cache::forget('combinations.active'));
    }

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    protected $fillable = [
        'code',
        'name',
        'first_department_id',
        'second_department_id',
        'is_double_major',
        'is_active',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    protected function casts(): array
    {
        return [
            'is_double_major' => 'boolean',
            'is_active'       => 'boolean',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** The first department in the combination. */
    public function firstDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'first_department_id');
    }

    /** The second department in the combination. */
    public function secondDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'second_department_id');
    }

    /** Students assigned to this combination. */
    public function students(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only active combinations. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
