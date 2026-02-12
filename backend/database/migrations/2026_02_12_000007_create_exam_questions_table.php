<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Exam Questions pivot (links questions to specific exams).
     */
    public function up(): void
    {
        Schema::create('exam_questions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('exam_id')
                  ->constrained('exams')
                  ->onDelete('cascade');

            $table->foreignId('question_id')
                  ->constrained('questions')
                  ->onDelete('cascade');

            // Order and scoring
            $table->integer('question_order');
            $table->decimal('points', 5, 2); // Can override question's default points

            // Question variation
            $table->boolean('is_required')->default(true);

            $table->timestamp('created_at')->useCurrent();

            // Constraints
            $table->unique(['exam_id', 'question_id'], 'unique_exam_question');

            // Indexes
            $table->index('exam_id', 'idx_exam_questions_exam');
            $table->index('question_id', 'idx_exam_questions_question');
            $table->index(['exam_id', 'question_order'], 'idx_exam_questions_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exam_questions');
    }
};
