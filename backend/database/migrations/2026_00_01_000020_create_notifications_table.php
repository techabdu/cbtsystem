<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Notifications.
     * In-app notification inbox for all user roles.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->string('title', 200);
            $table->text('message');
            $table->string('type', 50)->default('info'); // info | warning | success | error
            $table->string('action_url', 500)->nullable();
            $table->string('sent_via', 50)->default('in_app'); // in_app | email | sms
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->index(['user_id', 'is_read'], 'idx_notif_user_read');
            $table->index(['user_id', 'type'], 'idx_notif_user_type');
            $table->index('created_at', 'idx_notif_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
