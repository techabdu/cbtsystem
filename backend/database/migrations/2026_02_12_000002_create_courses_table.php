<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Courses table for academic course management.
     */
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('department_id')
                  ->constrained('departments')
                  ->onDelete('restrict');

            $table->string('code', 50)->unique(); // e.g., 'CS101', 'MTH202'
            $table->string('title', 255);
            $table->text('description')->nullable();

            $table->integer('credit_hours')->nullable();
            $table->string('semester', 20)->nullable();      // e.g., 'Fall 2025'
            $table->string('academic_year', 20)->nullable();  // e.g., '2025/2026'
            $table->string('level', 20)->nullable();          // e.g., '100L', '200L'

            $table->boolean('is_active')->default(true);

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['department_id', 'deleted_at'], 'idx_courses_department');
            $table->index(['code', 'deleted_at'], 'idx_courses_code');
            $table->index(['semester', 'deleted_at'], 'idx_courses_semester');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
