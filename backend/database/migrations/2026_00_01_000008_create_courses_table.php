<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * CBT System — Courses table.
     * Each course belongs to a department and optionally a level.
     */
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('department_id')
                  ->constrained('departments')
                  ->onDelete('cascade');

            $table->foreignId('level_id')
                  ->nullable()
                  ->constrained('levels')
                  ->nullOnDelete();

            // Course Identity
            $table->string('code', 20)->unique();   // e.g. "MTH 111"
            $table->string('name', 200);
            $table->text('description')->nullable();

            // Scheduling
            $table->string('semester', 20)->nullable();   // "first" | "second"
            $table->string('academic_year', 20)->nullable(); // "2025/2026"
            $table->integer('credit_units')->default(2);

            // Status
            $table->boolean('is_active')->default(true);

            // Metadata
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['department_id', 'deleted_at'], 'idx_courses_dept');
            $table->index(['level_id', 'deleted_at'], 'idx_courses_level');
            $table->index(['semester', 'deleted_at'], 'idx_courses_semester');
            $table->index(['is_active', 'deleted_at'], 'idx_courses_active');
            $table->index(['department_id', 'level_id', 'semester', 'deleted_at'], 'idx_courses_scope');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
