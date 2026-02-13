<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add department_id FK to users table.
     * Required for students and lecturers, nullable for admins.
     * Also adds a composite index on staff_id for identifier-based login.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('department_id')
                  ->nullable()
                  ->after('staff_id')
                  ->constrained('departments')
                  ->nullOnDelete();

            $table->index(['department_id', 'deleted_at'], 'idx_users_department');
            $table->index(['staff_id', 'deleted_at'], 'idx_users_staff_id');
        });
    }

    /**
     * Reverse the migration.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['department_id']);
            $table->dropIndex('idx_users_department');
            $table->dropIndex('idx_users_staff_id');
            $table->dropColumn('department_id');
        });
    }
};
