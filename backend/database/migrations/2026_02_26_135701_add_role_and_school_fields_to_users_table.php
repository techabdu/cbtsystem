<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('school_id')->nullable()->constrained()->nullOnDelete();
            $table->boolean('is_school_exam_officer')->default(false)->after('is_hod');
            $table->boolean('is_department_exam_officer')->default(false)->after('is_school_exam_officer');
            $table->string('role')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['school_id']);
            $table->dropColumn('school_id');
            $table->dropColumn('is_school_exam_officer');
            $table->dropColumn('is_department_exam_officer');
        });
    }
};
