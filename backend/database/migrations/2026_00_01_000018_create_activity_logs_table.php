<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Activity Logs.
     * Comprehensive audit trail for all user actions.
     */
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();

            $table->string('action', 100);
            $table->string('entity_type', 100)->nullable();  // e.g. "exam", "user"
            $table->unsignedBigInteger('entity_id')->nullable();
            $table->string('description', 500)->nullable();

            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamp('created_at')->useCurrent();
            // No updated_at — logs are immutable

            // Indexes
            $table->index('user_id', 'idx_logs_user');
            $table->index('action', 'idx_logs_action');
            $table->index(['entity_type', 'entity_id'], 'idx_logs_entity');
            $table->index('created_at', 'idx_logs_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
