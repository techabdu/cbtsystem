<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stage 4.4: Align exam_questions column name with the ExamQuestion model.
     *
     * Migration 000013 created: `order` INT
     * The ExamQuestion model uses: `question_order` in $fillable, and all service/
     * controller code also references `question_order`.
     *
     * Renames `order` → `question_order` on MySQL.
     * SQLite (tests): the 000013 schema will be updated directly.
     * Idempotent: skips if column already named correctly.
     */
    public function up(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return; // SQLite test env uses the corrected base migration
        }

        if (Schema::hasColumn('exam_questions', 'question_order')) {
            return; // Already migrated
        }

        DB::statement('ALTER TABLE exam_questions CHANGE `order` question_order INT UNSIGNED NOT NULL DEFAULT 0');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (! Schema::hasColumn('exam_questions', 'question_order')) {
            return;
        }

        DB::statement('ALTER TABLE exam_questions CHANGE question_order `order` INT UNSIGNED NOT NULL DEFAULT 0');
    }
};
