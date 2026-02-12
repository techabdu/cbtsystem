<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Student Answers (CRITICAL: high-write, auto-save, versioning).
     */
    public function up(): void
    {
        Schema::create('student_answers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('session_id')
                  ->constrained('exam_sessions')
                  ->onDelete('cascade');

            $table->unsignedBigInteger('question_id'); // References questions (may be cross-DB in offline mode)

            // Answer Content
            $table->text('answer_text')->nullable();       // For essay/fill-in-blank
            $table->json('selected_option')->nullable();   // For MCQ: single value or array

            // Metadata
            $table->boolean('is_flagged')->default(false); // Marked for review
            $table->integer('time_spent_seconds')->nullable();

            // Versioning (for auto-save)
            $table->integer('version')->default(1);
            $table->boolean('is_final')->default(false);

            // Scoring (populated after submission)
            $table->boolean('is_correct')->nullable();
            $table->decimal('points_awarded', 5, 2)->nullable();

            // Timestamps
            $table->timestamp('first_answered_at')->nullable();
            $table->timestamp('last_updated_at')->useCurrent();

            // Constraints — unique per session+question+version
            $table->unique(['session_id', 'question_id', 'version'], 'unique_answer_version');

            // Indexes
            $table->index('session_id', 'idx_answers_session');
            $table->index('question_id', 'idx_answers_question');
            $table->index(['session_id', 'is_final'], 'idx_answers_final');
            $table->index('last_updated_at', 'idx_answers_updated');
            $table->index(['session_id', 'question_id', 'is_final'], 'idx_answers_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_answers');
    }
};
