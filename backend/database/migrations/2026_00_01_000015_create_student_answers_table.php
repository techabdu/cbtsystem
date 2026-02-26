<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Student Answers (CRITICAL: high-write, auto-save, versioning).
     */
    public function up(): void
    {
        Schema::create('student_answers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('session_id')
                  ->constrained('exam_sessions')
                  ->onDelete('cascade');

            // Not FK — may reference questions across DB in offline sync scenario
            $table->unsignedBigInteger('question_id');

            // Answer Content
            $table->text('answer_text')->nullable();      // Essay / fill-in-blank
            $table->json('selected_option')->nullable();  // MCQ: single or array

            // Metadata
            $table->boolean('is_flagged')->default(false);
            $table->integer('time_spent_seconds')->nullable();

            // Versioning (each auto-save increments version)
            $table->integer('version')->default(1);
            $table->boolean('is_final')->default(false);

            // Manual Grading fields
            $table->text('grader_feedback')->nullable();
            $table->foreignId('graded_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('graded_at')->nullable();

            // Scoring (populated after submission)
            $table->boolean('is_correct')->nullable();
            $table->decimal('points_awarded', 5, 2)->nullable();

            // Timestamps (non-standard: no updated_at — versioning tracks changes)
            $table->timestamp('first_answered_at')->nullable();
            $table->timestamp('last_updated_at')->useCurrent();

            // Unique per session + question + version
            $table->unique(['session_id', 'question_id', 'version'], 'unique_answer_version');

            // Indexes
            $table->index('session_id', 'idx_answers_session');
            $table->index('question_id', 'idx_answers_question');
            $table->index(['session_id', 'is_final'], 'idx_answers_final');
            $table->index('last_updated_at', 'idx_answers_updated');
            $table->index(['session_id', 'question_id', 'is_final'], 'idx_answers_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_answers');
    }
};
