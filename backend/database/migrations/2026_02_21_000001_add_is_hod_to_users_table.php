<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add is_hod flag to users table.
     * Designates one lecturer per department as Head of Department.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_hod')
                  ->default(false)
                  ->after('role')
                  ->comment('Head of Department flag — only one per department');

            // Composite index for quick HOD lookups by department
            $table->index(['department_id', 'is_hod'], 'idx_users_dept_hod');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_dept_hod');
            $table->dropColumn('is_hod');
        });
    }
};
