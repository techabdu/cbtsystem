<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Exams table (exam configuration, scheduling, rules, access control).
     */
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('course_id')
                  ->constrained('courses')
                  ->onDelete('cascade');

            $table->foreignId('created_by')
                  ->constrained('users')
                  ->onDelete('restrict');

            // Exam Details
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->text('instructions')->nullable();

            // Exam Type
            $table->enum('exam_type', ['midterm', 'final', 'quiz', 'practice', 'makeup']);

            // Scheduling (nullable at DB level; always set in application code)
            $table->timestamp('start_time')->nullable();
            $table->timestamp('end_time')->nullable();
            $table->integer('duration_minutes'); // Per-student duration

            // Configuration
            $table->decimal('total_marks', 6, 2);
            $table->decimal('passing_marks', 6, 2);

            // Question Selection
            $table->boolean('randomize_questions')->default(true);
            $table->boolean('randomize_options')->default(true);
            $table->integer('questions_per_page')->default(1);

            // Rules
            $table->boolean('allow_backtrack')->default(false);
            $table->boolean('show_results_immediately')->default(false);
            $table->boolean('show_correct_answers')->default(false);

            // Access Control
            $table->boolean('requires_password')->default(false);
            $table->string('exam_password_hash', 255)->nullable();
            $table->json('allowed_student_ids')->nullable(); // Array of student IDs if restricted

            // Status
            $table->enum('status', ['draft', 'published', 'ongoing', 'completed', 'archived'])->default('draft');
            $table->boolean('is_practice')->default(false);

            // Proctoring (future feature)
            $table->boolean('enable_proctoring')->default(false);
            $table->json('proctoring_config')->nullable();

            // Metadata
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['course_id', 'deleted_at'], 'idx_exams_course');
            $table->index(['status', 'deleted_at'], 'idx_exams_status');
            $table->index(['start_time', 'deleted_at'], 'idx_exams_start_time');
            $table->index(['exam_type', 'deleted_at'], 'idx_exams_type');
            $table->index(['course_id', 'status', 'deleted_at'], 'idx_exams_published');
        });

        // Add CHECK constraint for valid exam time (MySQL only — not supported by SQLite)
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE exams ADD CONSTRAINT valid_exam_time CHECK (end_time > start_time)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
