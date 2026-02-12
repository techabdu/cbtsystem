<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Course Enrollments (Student ↔ Course pivot).
     */
    public function up(): void
    {
        Schema::create('course_enrollments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->foreignId('course_id')
                  ->constrained('courses')
                  ->onDelete('cascade');

            $table->date('enrollment_date')->default(now()->toDateString());
            $table->enum('status', ['active', 'dropped', 'completed'])->default('active');

            $table->timestamps();

            // Constraints
            $table->unique(['student_id', 'course_id'], 'unique_enrollment');

            // Indexes
            $table->index('student_id', 'idx_enrollments_student');
            $table->index('course_id', 'idx_enrollments_course');
            $table->index('status', 'idx_enrollments_status');
            $table->index(['student_id', 'status'], 'idx_enrollments_student_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_enrollments');
    }
};
