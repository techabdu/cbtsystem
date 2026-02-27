<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fix column name mismatches between migrations and application code:
     *  - levels.order          → levels.numeric_order
     *  - courses.name          → courses.title
     *  - courses.credit_units  → courses.credit_hours
     *  - courses.level         (add missing string column)
     */
    public function up(): void
    {
        // --- levels table ---
        Schema::table('levels', function (Blueprint $table) {
            $table->renameColumn('order', 'numeric_order');
        });

        // --- courses table ---
        Schema::table('courses', function (Blueprint $table) {
            $table->renameColumn('name', 'title');
            $table->renameColumn('credit_units', 'credit_hours');
            $table->string('level', 50)->nullable()->after('level_id');
        });
    }

    public function down(): void
    {
        Schema::table('levels', function (Blueprint $table) {
            $table->renameColumn('numeric_order', 'order');
        });

        Schema::table('courses', function (Blueprint $table) {
            $table->renameColumn('title', 'name');
            $table->renameColumn('credit_hours', 'credit_units');
            $table->dropColumn('level');
        });
    }
};
