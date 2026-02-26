<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Exam Feedback.
     * HOD/admin feedback on exam submissions during the review workflow.
     * Matches ExamFeedback model: user_id, recipient_id, stage, comments, resolved.
     */
    public function up(): void
    {
        Schema::create('exam_feedback', function (Blueprint $table) {
            $table->id();

            $table->foreignId('exam_id')
                  ->constrained('exams')
                  ->onDelete('cascade');

            $table->foreignId('user_id')       // Reviewer (HOD / Dept Officer / etc.)
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->foreignId('recipient_id')  // Who receives the feedback (usually creator)
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->string('stage', 100)->nullable(); // e.g. "pre_exam_hod_review", "post_exam_grading_review"
            $table->text('comments')->nullable();
            $table->boolean('resolved')->default(false);
            $table->json('metadata')->nullable();

            $table->timestamps(); // Needed by ExamFeedback Eloquent model (softdel not needed for audit records)

            $table->index(['exam_id', 'stage'], 'idx_feedback_exam_stage');
            $table->index('user_id', 'idx_feedback_user');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_feedback');
    }
};
