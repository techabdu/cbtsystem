<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Combinations table.
     * NCE students study two subjects (first + second department).
     * Some are "double major" (same department studied in depth).
     */
    public function up(): void
    {
        Schema::create('combinations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 200)->unique();
            $table->foreignId('first_department_id')
                  ->constrained('departments')
                  ->onDelete('restrict');
            $table->foreignId('second_department_id')
                  ->constrained('departments')
                  ->onDelete('restrict');
            $table->boolean('is_double_major')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'deleted_at'], 'idx_combos_active');
            $table->index(['first_department_id', 'deleted_at'], 'idx_combos_first_dept');
            $table->index(['second_department_id', 'deleted_at'], 'idx_combos_second_dept');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('combinations');
    }
};
