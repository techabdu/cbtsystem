<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Users table (complete, all columns in one migration).
     *
     * Roles: admin | edu_portal | cbt | lecturer | student
     * Lecturer sub-roles (boolean flags):
     *   is_hod                   — Head of Department
     *   is_school_exam_officer   — Manages exams at school level
     *   is_department_exam_officer — Manages exams at department level
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Authentication
            $table->string('email')->unique();
            $table->string('password')->nullable(); // Nullable: admin pre-creates, user activates

            // Profile
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('student_id', 50)->unique()->nullable(); // Matric number (students only)
            $table->string('staff_id', 50)->unique()->nullable();   // File number (lecturers/admins)

            // Contact
            $table->string('phone', 20)->nullable();
            $table->string('avatar_url', 500)->nullable();

            // Role — string (not enum) to support all 5 roles
            $table->string('role', 30); // admin | edu_portal | cbt | lecturer | student

            // Lecturer sub-roles (only meaningful when role = 'lecturer')
            $table->boolean('is_hod')->default(false);
            $table->boolean('is_school_exam_officer')->default(false);
            $table->boolean('is_department_exam_officer')->default(false);

            // Assignments
            $table->foreignId('school_id')
                  ->nullable()
                  ->constrained('schools')
                  ->nullOnDelete();
            $table->foreignId('department_id')
                  ->nullable()
                  ->constrained('departments')
                  ->nullOnDelete();
            $table->foreignId('combination_id')  // Students: their NCE subject combination
                  ->nullable()
                  ->constrained('combinations')
                  ->nullOnDelete();
            $table->foreignId('level_id')        // Students: their current academic level
                  ->nullable()
                  ->constrained('levels')
                  ->nullOnDelete();

            // Account Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);

            // Security fields
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('password_changed_at')->nullable();
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();

            // Metadata
            $table->json('metadata')->nullable();
            $table->rememberToken();

            $table->timestamps();
            $table->softDeletes();

            // Composite Indexes
            $table->index(['email', 'deleted_at'], 'idx_users_email');
            $table->index(['role', 'deleted_at'], 'idx_users_role');
            $table->index(['student_id', 'deleted_at'], 'idx_users_student_id');
            $table->index(['staff_id', 'deleted_at'], 'idx_users_staff_id');
            $table->index(['role', 'is_active', 'deleted_at'], 'idx_users_active_role');
            $table->index(['department_id', 'role', 'deleted_at'], 'idx_users_dept_role');
            $table->index(['combination_id', 'deleted_at'], 'idx_users_combination');
            $table->index(['school_id', 'role', 'deleted_at'], 'idx_users_school_role');
            $table->index(['is_hod', 'department_id', 'deleted_at'], 'idx_users_hod');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
