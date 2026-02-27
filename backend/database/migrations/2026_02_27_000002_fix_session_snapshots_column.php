<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stage 4.4: Align session_snapshots on MySQL installations.
     *
     * The original migration (000016) has been updated to create `snapshot_type`
     * directly. This migration handles the rename for MySQL databases that were
     * already created with the old `type` ENUM column.
     *
     * On SQLite (tests): 000016 now creates the correct schema, so this is a no-op.
     * On MySQL (production): converts `type` → `snapshot_type` if needed.
     */
    public function up(): void
    {
        // SQLite (test env): 000016 already creates `snapshot_type` correctly — nothing to do
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        // MySQL only: if `type` column still exists, migrate it to `snapshot_type`
        if (! Schema::hasColumn('session_snapshots', 'type')) {
            return; // Already migrated or fresh install via updated 000016
        }

        // Add snapshot_type if not yet present
        if (! Schema::hasColumn('session_snapshots', 'snapshot_type')) {
            Schema::table('session_snapshots', function (Blueprint $table) {
                $table->string('snapshot_type', 50)->default('auto_save')->after('session_id');
            });
        }

        // Copy data
        DB::statement("UPDATE session_snapshots SET snapshot_type = CASE
            WHEN `type` = 'auto'       THEN 'auto_save'
            WHEN `type` = 'manual'     THEN 'checkpoint'
            WHEN `type` = 'pre_submit' THEN 'checkpoint'
            ELSE 'auto_save'
        END");

        // Swap index + drop old column (with FK handling)
        DB::statement('ALTER TABLE session_snapshots DROP FOREIGN KEY session_snapshots_session_id_foreign');
        DB::statement('ALTER TABLE session_snapshots ADD INDEX idx_snapshots_sid (session_id)');
        DB::statement('ALTER TABLE session_snapshots DROP INDEX idx_snapshots_session');
        DB::statement('ALTER TABLE session_snapshots DROP COLUMN `type`');
        DB::statement('ALTER TABLE session_snapshots ADD INDEX idx_snapshots_session (session_id, snapshot_type)');
        DB::statement('ALTER TABLE session_snapshots ADD CONSTRAINT session_snapshots_session_id_foreign FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE session_snapshots DROP INDEX idx_snapshots_sid');
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        if (! Schema::hasColumn('session_snapshots', 'snapshot_type')
            || Schema::hasColumn('session_snapshots', 'type')) {
            return;
        }

        Schema::table('session_snapshots', function (Blueprint $table) {
            $table->string('type', 20)->default('auto')->after('session_id');
        });

        DB::statement("UPDATE session_snapshots SET `type` = CASE
            WHEN snapshot_type = 'auto_save'  THEN 'auto'
            WHEN snapshot_type = 'checkpoint' THEN 'pre_submit'
            ELSE 'auto'
        END");

        DB::statement('ALTER TABLE session_snapshots DROP FOREIGN KEY session_snapshots_session_id_foreign');
        DB::statement('ALTER TABLE session_snapshots ADD INDEX idx_snapshots_sid (session_id)');
        DB::statement('ALTER TABLE session_snapshots DROP INDEX idx_snapshots_session');
        DB::statement('ALTER TABLE session_snapshots DROP COLUMN snapshot_type');
        DB::statement('ALTER TABLE session_snapshots ADD INDEX idx_snapshots_session (session_id, `type`)');
        DB::statement('ALTER TABLE session_snapshots ADD CONSTRAINT session_snapshots_session_id_foreign FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE session_snapshots DROP INDEX idx_snapshots_sid');
    }
};
