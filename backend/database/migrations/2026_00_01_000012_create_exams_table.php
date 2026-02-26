<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * CBT System — Exams table (COMPLETE — all columns in one migration).
     *
     * Workflow statuses:
     *   draft → pending_review → verified → published → ongoing → completed → archived
     *
     * Results workflow statuses (results_status):
     *   pending → grading_in_progress → grading_submitted → results_verified → results_published
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

            // Scheduling
            $table->timestamp('start_time')->nullable();
            $table->timestamp('end_time')->nullable();
            $table->integer('duration_minutes');

            // Marks
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
            $table->json('allowed_student_ids')->nullable();

            // Workflow Status (exam creation lifecycle)
            $table->string('status', 30)->default('draft');
            // Allowed: draft | pending_review | verified | published | ongoing | completed | archived

            // Practice flag
            $table->boolean('is_practice')->default(false);

            // Results Workflow Status
            $table->string('results_status', 30)->nullable();
            // Allowed: pending | grading_in_progress | grading_submitted | results_verified | results_published

            // Proctoring (future)
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
            $table->index(['is_practice', 'status', 'deleted_at'], 'idx_exams_practice');
            $table->index(['results_status', 'deleted_at'], 'idx_exams_results_status');
        });

        // CHECK constraint for valid exam time (MySQL only)
        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE exams ADD CONSTRAINT valid_exam_time CHECK (end_time > start_time OR end_time IS NULL)');
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('exams');
    }
};
