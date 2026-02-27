<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Exam Questions pivot table.
     * Links questions to exams with ordering and per-question marks override.
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

            $table->integer('question_order')->unsigned()->default(0);
            $table->decimal('points', 5, 2)->nullable(); // Per-question marks override

            $table->timestamp('created_at')->useCurrent();
            // No updated_at: pivot records are immutable once created

            $table->unique(['exam_id', 'question_id'], 'unique_exam_question');
            $table->index(['exam_id', 'question_order'], 'idx_eq_exam_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_questions');
    }
};
