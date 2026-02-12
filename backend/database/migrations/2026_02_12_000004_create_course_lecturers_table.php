<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Course Lecturers (Lecturer ↔ Course assignment pivot).
     */
    public function up(): void
    {
        Schema::create('course_lecturers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('lecturer_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->foreignId('course_id')
                  ->constrained('courses')
                  ->onDelete('cascade');

            $table->enum('role', ['lecturer', 'coordinator', 'assistant'])->default('lecturer');

            $table->timestamps();

            // Constraints
            $table->unique(['lecturer_id', 'course_id'], 'unique_assignment');

            // Indexes
            $table->index('lecturer_id', 'idx_course_lecturers_lecturer');
            $table->index('course_id', 'idx_course_lecturers_course');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_lecturers');
    }
};
