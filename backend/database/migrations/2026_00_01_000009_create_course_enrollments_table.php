<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Course Enrollments table.
     * Tracks which students are enrolled in which courses.
     */
    public function up(): void
    {
        Schema::create('course_enrollments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('course_id')
                  ->constrained('courses')
                  ->onDelete('cascade');

            $table->foreignId('student_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->enum('status', ['enrolled', 'dropped', 'completed'])->default('enrolled');
            $table->timestamp('enrolled_at')->useCurrent();
            $table->timestamp('dropped_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->json('metadata')->nullable();

            $table->timestamps();

            $table->unique(['course_id', 'student_id'], 'unique_enrollment');
            $table->index(['student_id', 'status'], 'idx_enroll_student_status');
            $table->index(['course_id', 'status'], 'idx_enroll_course_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('course_enrollments');
    }
};
