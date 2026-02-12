<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Notifications (user notifications with delivery tracking).
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->string('title', 255);
            $table->text('message');
            $table->string('type', 50); // e.g., 'exam_reminder', 'result_published', 'system_alert'

            // Related Entity
            $table->string('related_entity_type', 50)->nullable();
            $table->unsignedBigInteger('related_entity_id')->nullable();

            // Status
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();

            // Delivery
            $table->json('sent_via')->nullable(); // Array: ['email', 'in_app', 'sms']

            $table->timestamp('created_at')->useCurrent();

            // Indexes
            $table->index('user_id', 'idx_notifications_user');
            $table->index(['user_id', 'is_read'], 'idx_notifications_read');
            $table->index('created_at', 'idx_notifications_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
