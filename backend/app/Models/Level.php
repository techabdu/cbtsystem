<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Level extends Model
{
    use HasFactory, SoftDeletes;

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    protected $fillable = [
        'code',
        'name',
        'description',
        'numeric_order',
        'is_active',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    protected function casts(): array
    {
        return [
            'is_active'     => 'boolean',
            'numeric_order' => 'integer',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** Courses that belong to this level. */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    /** Students assigned to this level. */
    public function students(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only active levels. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** Scope: ordered by numeric_order ascending. */
    public function scopeOrdered($query)
    {
        return $query->orderBy('numeric_order', 'asc');
    }
}
