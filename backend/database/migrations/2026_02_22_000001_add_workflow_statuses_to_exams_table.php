<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE exams MODIFY COLUMN status ENUM('draft','pending_review','verified','published','ongoing','completed','archived') NOT NULL DEFAULT 'draft'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE exams MODIFY COLUMN status ENUM('draft','published','ongoing','completed','archived') NOT NULL DEFAULT 'draft'");
        }
    }
};
