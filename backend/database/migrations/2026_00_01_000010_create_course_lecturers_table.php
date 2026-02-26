<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Course Lecturers table.
     * Pivot: which lecturers are assigned to which courses (by HOD).
     */
    public function up(): void
    {
        Schema::create('course_lecturers', function (Blueprint $table) {
            $table->id();

            $table->foreignId('course_id')
                  ->constrained('courses')
                  ->onDelete('cascade');

            $table->foreignId('lecturer_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->string('role', 50)->default('lecturer'); // lecturer | co-lecturer
            $table->timestamp('assigned_at')->useCurrent();

            $table->timestamps();

            $table->unique(['course_id', 'lecturer_id'], 'unique_course_lecturer');
            $table->index(['lecturer_id', 'course_id'], 'idx_cl_lecturer');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_lecturers');
    }
};
