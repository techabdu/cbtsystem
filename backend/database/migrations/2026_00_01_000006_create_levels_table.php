<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Levels table.
     * NCE programme: 100L, 200L, 300L (3-year programme).
     * Some PGD students may be at 400L.
     */
    public function up(): void
    {
        Schema::create('levels', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();      // e.g. "100L"
            $table->string('name', 100);               // e.g. "Year 1 (NCE I)"
            $table->integer('order')->unsigned();      // Sort order: 1, 2, 3...
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('order', 'idx_levels_order');
            $table->index('is_active', 'idx_levels_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('levels');
    }
};
