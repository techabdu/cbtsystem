<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Departments table.
     * Each department belongs to a school.
     * FCT COE Zuba has 34 departments across 6 schools.
     */
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')
                  ->nullable()
                  ->constrained('schools')
                  ->nullOnDelete();
            $table->string('code', 20)->unique();
            $table->string('name', 200)->unique();
            $table->string('description', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['school_id', 'deleted_at'], 'idx_depts_school');
            $table->index(['code', 'deleted_at'], 'idx_depts_code');
            $table->index(['is_active', 'deleted_at'], 'idx_depts_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
