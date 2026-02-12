<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

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
        'email',
        'password',
        'first_name',
        'last_name',
        'middle_name',
        'student_id',
        'staff_id',
        'phone',
        'avatar_url',
        'role',
        'is_active',
        'is_verified',
        'email_verified_at',
        'last_login_at',
        'password_changed_at',
        'failed_login_attempts',
        'locked_until',
        'metadata',
    ];

    /* ------------------------------------------------------------------ */
    /*  Hidden / Serialization                                            */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $hidden = [
        'password',
        'remember_token',
        'failed_login_attempts',
        'locked_until',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'email_verified_at'  => 'datetime',
            'last_login_at'      => 'datetime',
            'password_changed_at' => 'datetime',
            'locked_until'       => 'datetime',
            'password'           => 'hashed',
            'is_active'          => 'boolean',
            'is_verified'        => 'boolean',
            'metadata'           => 'array',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** Courses the student is enrolled in. */
    public function enrolledCourses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_enrollments', 'student_id', 'course_id')
                    ->withPivot('enrollment_date', 'status')
                    ->withTimestamps();
    }

    /** Courses the lecturer is assigned to. */
    public function taughtCourses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_lecturers', 'lecturer_id', 'course_id')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    /** Questions created by this user (lecturer). */
    public function createdQuestions(): HasMany
    {
        return $this->hasMany(Question::class, 'created_by');
    }

    /** Exams created by this user (lecturer). */
    public function createdExams(): HasMany
    {
        return $this->hasMany(Exam::class, 'created_by');
    }

    /** Exam sessions this student has participated in. */
    public function examSessions(): HasMany
    {
        return $this->hasMany(ExamSession::class, 'student_id');
    }

    /** Notifications for this user. */
    public function userNotifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'user_id');
    }

    /** Activity logs for this user. */
    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class, 'user_id');
    }

    /* ------------------------------------------------------------------ */
    /*  Query Scopes                                                      */
    /* ------------------------------------------------------------------ */

    /** Scope: only active users. */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /** Scope: filter by role. */
    public function scopeRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /** Scope: only students. */
    public function scopeStudents($query)
    {
        return $query->where('role', 'student');
    }

    /** Scope: only lecturers. */
    public function scopeLecturers($query)
    {
        return $query->where('role', 'lecturer');
    }

    /** Scope: only admins. */
    public function scopeAdmins($query)
    {
        return $query->where('role', 'admin');
    }

    /** Scope: verified users. */
    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    /* ------------------------------------------------------------------ */
    /*  Accessors                                                         */
    /* ------------------------------------------------------------------ */

    /** Full name accessor. */
    public function getFullNameAttribute(): string
    {
        $parts = array_filter([
            $this->first_name,
            $this->middle_name,
            $this->last_name,
        ]);

        return implode(' ', $parts);
    }

    /* ------------------------------------------------------------------ */
    /*  Helper Methods                                                    */
    /* ------------------------------------------------------------------ */

    /** Check if user is an admin. */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** Check if user is a lecturer. */
    public function isLecturer(): bool
    {
        return $this->role === 'lecturer';
    }

    /** Check if user is a student. */
    public function isStudent(): bool
    {
        return $this->role === 'student';
    }

    /** Check if user account is locked. */
    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
    }

    /** Check if student is enrolled in a specific course. */
    public function isEnrolledIn(int $courseId): bool
    {
        return $this->enrolledCourses()
                    ->where('courses.id', $courseId)
                    ->wherePivot('status', 'active')
                    ->exists();
    }

    /** Record a failed login attempt. */
    public function recordFailedLogin(): void
    {
        $this->increment('failed_login_attempts');

        // Lock after 5 failed attempts for 15 minutes
        if ($this->failed_login_attempts >= 5) {
            $this->update(['locked_until' => now()->addMinutes(15)]);
        }
    }

    /** Reset failed login tracking on successful login. */
    public function recordSuccessfulLogin(): void
    {
        $this->update([
            'failed_login_attempts' => 0,
            'locked_until'          => null,
            'last_login_at'         => now(),
        ]);
    }
}
