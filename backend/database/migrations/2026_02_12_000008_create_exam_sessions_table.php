<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Exam Sessions (CRITICAL: individual student exam attempts).
     * High-importance table: session tracking, timing, progress, recovery, integrity, violations.
     */
    public function up(): void
    {
        Schema::create('exam_sessions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('exam_id')
                  ->constrained('exams')
                  ->onDelete('cascade');

            $table->foreignId('student_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            // Session Tracking
            $table->string('session_token', 255)->unique();

            // Timing
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('scheduled_end_time')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('actual_end_time')->nullable();

            // Question Order (personalized per student)
            $table->json('question_sequence'); // Array of question IDs in randomized order

            // Progress Tracking
            $table->integer('current_question_index')->default(0);
            $table->integer('questions_answered')->default(0);
            $table->json('questions_flagged')->nullable(); // Array of question IDs marked for review

            // Status
            $table->enum('status', [
                'not_started',
                'in_progress',
                'submitted',
                'auto_submitted',
                'interrupted',
            ])->default('in_progress');

            // Recovery Data
            $table->timestamp('last_activity_at')->useCurrent();
            $table->json('recovery_data')->nullable(); // Complete session state for crash recovery

            // Scoring (populated after submission/grading)
            $table->decimal('total_score', 6, 2)->nullable();
            $table->decimal('percentage', 5, 2)->nullable();

            // Integrity / Device Info
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('device_fingerprint', 255)->nullable();

            // Violation Flags
            $table->boolean('has_violations')->default(false);
            $table->integer('violation_count')->default(0);
            $table->json('violations')->nullable(); // Array of violation events

            $table->timestamps();

            // Constraints — one session per student per exam
            $table->unique(['exam_id', 'student_id'], 'unique_session');

            // Indexes
            $table->index('exam_id', 'idx_sessions_exam');
            $table->index('student_id', 'idx_sessions_student');
            $table->index('status', 'idx_sessions_status');
            $table->index('session_token', 'idx_sessions_token');
            $table->index('last_activity_at', 'idx_sessions_activity');
            $table->index(['exam_id', 'status'], 'idx_sessions_exam_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_sessions');
    }
};
