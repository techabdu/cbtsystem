<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Stage 4.4: Performance optimization indexes.
     *
     * Adds composite indexes identified via EXPLAIN analysis of the most
     * frequent high-write query patterns in SessionService and GradingService.
     */
    public function up(): void
    {
        Schema::table('student_answers', function (Blueprint $table) {
            // Covers: "get latest final version" pattern in saveAnswer()
            // Query: WHERE session_id = ? AND question_id = ? AND is_final = true ORDER BY version DESC
            $table->index(
                ['session_id', 'question_id', 'is_final', 'version'],
                'idx_answers_version'
            );

            // Covers: grading summary queries in GradingService::gradeSession()
            // Query: WHERE session_id = ? AND is_final = true AND is_correct IS NULL
            $table->index(
                ['session_id', 'is_final', 'is_correct'],
                'idx_answers_grading'
            );
        });

        Schema::table('exam_sessions', function (Blueprint $table) {
            // Covers: timeout check on every endpoint call
            // Query: WHERE id = ? AND scheduled_end_time < NOW() AND status = 'in_progress'
            $table->index(
                ['status', 'scheduled_end_time'],
                'idx_sessions_timeout'
            );
        });
    }

    public function down(): void
    {
        Schema::table('student_answers', function (Blueprint $table) {
            $table->dropIndex('idx_answers_version');
            $table->dropIndex('idx_answers_grading');
        });

        Schema::table('exam_sessions', function (Blueprint $table) {
            $table->dropIndex('idx_sessions_timeout');
        });
    }
};
