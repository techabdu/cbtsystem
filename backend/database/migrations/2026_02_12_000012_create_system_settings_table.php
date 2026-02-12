<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — System Settings (key-value configuration store).
     */
    public function up(): void
    {
        Schema::create('system_settings', function (Blueprint $table) {
            $table->id();

            $table->string('key', 100)->unique();
            $table->text('value');
            $table->enum('value_type', ['string', 'integer', 'boolean', 'json']);

            $table->text('description')->nullable();
            $table->boolean('is_public')->default(false); // Can be accessed by frontend?

            $table->timestamps();

            // Indexes
            $table->index('key', 'idx_settings_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_settings');
    }
};
