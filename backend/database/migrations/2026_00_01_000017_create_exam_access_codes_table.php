<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Exam Access Codes.
     * Per-student, per-semester codes that unlock exam entry at the offline lab.
     * Students pay → receive one code valid for ALL exams that semester.
     */
    public function up(): void
    {
        Schema::create('exam_access_codes', function (Blueprint $table) {
            $table->id();

            $table->foreignId('student_id')
                  ->constrained('users')
                  ->onDelete('cascade');

            $table->string('access_code', 32)->unique();
            $table->string('semester', 20);          // "first" | "second"
            $table->string('academic_year', 20);     // "2025/2026"
            $table->boolean('is_active')->default(true);
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('expires_at')->nullable();

            $table->timestamps();

            // One code per student per semester per year
            $table->unique(
                ['student_id', 'semester', 'academic_year'],
                'unique_student_semester_year'
            );
            $table->index(['access_code', 'is_active'], 'idx_access_code_active');
            $table->index(['student_id', 'is_active'], 'idx_access_code_student');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_access_codes');
    }
};
