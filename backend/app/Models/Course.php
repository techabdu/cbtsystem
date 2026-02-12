<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Course extends Model
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
        'department_id',
        'code',
        'title',
        'description',
        'credit_hours',
        'semester',
        'academic_year',
        'level',
        'is_active',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active'    => 'boolean',
            'credit_hours' => 'integer',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** Department this course belongs to. */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /** Students enrolled in this course. */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_enrollments', 'course_id', 'student_id')
                    ->withPivot('enrollment_date', 'status')
                    ->withTimestamps();
    }

    /** Lecturers assigned to this course. */
    public function lecturers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_lecturers', 'course_id', 'lecturer_id')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    /** Questions associated with this course. */
    public function questions(): HasMany
    {
        return $this->hasMany(Question::class);
    }

    /** Exams associated with this course. */
    public function exams(): HasMany
    {
        return $this->hasMany(Exam::class);
    }

    /** Course enrollments (pivot records). */
    public function enrollments(): HasMany
    {
        return $this->hasMany(CourseEnrollment::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only active courses. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** Scope: filter by semester. */
    public function scopeSemester($query, string $semester)
    {
        return $query->where('semester', $semester);
    }

    /** Scope: filter by academic year. */
    public function scopeAcademicYear($query, string $year)
    {
        return $query->where('academic_year', $year);
    }

    /** Scope: filter by level. */
    public function scopeLevel($query, string $level)
    {
        return $query->where('level', $level);
    }

    /** Scope: filter by department. */
    public function scopeInDepartment($query, int $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }
}
