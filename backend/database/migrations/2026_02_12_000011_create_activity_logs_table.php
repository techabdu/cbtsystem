<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Activity Logs (comprehensive audit trail).
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            $table->unsignedBigInteger('user_id')->nullable();
            $table->foreignId('session_id')
                  ->nullable()
                  ->constrained('exam_sessions')
                  ->nullOnDelete();

            // Action Details
            $table->string('action', 100); // e.g., 'login', 'answer_saved', 'exam_submitted'
            $table->string('entity_type', 50)->nullable(); // e.g., 'exam', 'question', 'user'
            $table->unsignedBigInteger('entity_id')->nullable();

            // Context
            $table->text('description')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            // Data
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamp('created_at')->useCurrent();

            // Indexes
            $table->index('user_id', 'idx_activity_user');
            $table->index('session_id', 'idx_activity_session');
            $table->index('action', 'idx_activity_action');
            $table->index('created_at', 'idx_activity_created');
            $table->index(['entity_type', 'entity_id'], 'idx_activity_entity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
