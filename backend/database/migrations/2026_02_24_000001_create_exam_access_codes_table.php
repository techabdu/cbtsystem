<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove per-exam access_code (wrong model — should be per-student)
        Schema::table('exams', function (Blueprint $table) {
            $table->dropUnique(['access_code']);
            $table->dropColumn('access_code');
        });

        // Create per-student, per-semester access codes
        Schema::create('exam_access_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->onDelete('cascade');
            $table->string('access_code', 32)->unique();
            $table->string('semester', 20);         // e.g. "first", "second"
            $table->string('academic_year', 20);     // e.g. "2025/2026"
            $table->boolean('is_active')->default(true);
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            // A student gets one code per semester per academic year
            $table->unique(['student_id', 'semester', 'academic_year'], 'unique_student_semester_year');
            $table->index(['access_code', 'is_active']);
            $table->index(['student_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_access_codes');

        Schema::table('exams', function (Blueprint $table) {
            $table->string('access_code', 32)->nullable()->unique()->after('exam_password_hash');
        });
    }
};
