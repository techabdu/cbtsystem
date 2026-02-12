<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Users table with full authentication, profile, role, and security fields.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->uuid('uuid')->unique();

            // Authentication
            $table->string('email')->unique();
            $table->string('password'); // Laravel convention: 'password' column (hashed via Hash::make)

            // Profile
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('student_id', 50)->unique()->nullable(); // Students only
            $table->string('staff_id', 50)->unique()->nullable();   // Lecturers/Admins only

            // Contact
            $table->string('phone', 20)->nullable();
            $table->string('avatar_url', 500)->nullable();

            // Role & Status
            $table->enum('role', ['admin', 'lecturer', 'student']);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);

            // Security
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('password_changed_at')->nullable();
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();

            // Metadata
            $table->json('metadata')->nullable();

            // Remember token (Laravel auth)
            $table->rememberToken();

            // Audit
            $table->timestamps(); // created_at, updated_at
            $table->softDeletes(); // deleted_at

            // Composite Indexes
            $table->index(['email', 'deleted_at'], 'idx_users_email');
            $table->index(['role', 'deleted_at'], 'idx_users_role');
            $table->index(['student_id', 'deleted_at'], 'idx_users_student_id');
            $table->index(['role', 'is_active', 'deleted_at'], 'idx_users_active_role');
        });

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('users');
    }
};
