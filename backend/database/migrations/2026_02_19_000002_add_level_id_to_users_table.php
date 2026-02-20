<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Level_id already exists on users table from a prior migration.
     * This migration is a no-op guard.
     */
    public function up(): void
    {
        if (Schema::hasColumn('users', 'level_id')) {
            return; // Already exists
        }

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('level_id')
                  ->nullable()
                  ->after('combination_id')
                  ->constrained('levels')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('users', 'level_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign(['level_id']);
                $table->dropColumn('level_id');
            });
        }
    }
};
