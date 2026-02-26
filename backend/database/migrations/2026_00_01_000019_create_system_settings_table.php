<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — System Settings.
     * Key-value configuration store for global system settings.
     */
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key', 100)->unique();
            $table->text('value')->nullable();
            $table->enum('type', ['string', 'integer', 'boolean', 'json', 'float'])->default('string');
            $table->string('group', 50)->default('general');
            $table->string('description', 500)->nullable();
            $table->boolean('is_public')->default(false); // Public settings visible to frontend
            $table->timestamps();

            $table->index('group', 'idx_settings_group');
            $table->index('is_public', 'idx_settings_public');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
