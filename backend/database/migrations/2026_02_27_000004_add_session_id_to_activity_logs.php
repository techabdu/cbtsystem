<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Stage 4.4: Add session_id to activity_logs.
     *
     * The SessionService logs exam submission activity with a session_id
     * reference, but the original activity_logs migration did not include
     * this column. Adding it as nullable to preserve backwards compatibility.
     */
    public function up(): void
    {
        if (Schema::hasColumn('activity_logs', 'session_id')) {
            return; // Already present
        }

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('session_id')
                  ->nullable()
                  ->after('user_id');

            $table->index('session_id', 'idx_actlogs_session');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('activity_logs', 'session_id')) {
            return;
        }

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('idx_actlogs_session');
            $table->dropColumn('session_id');
        });
    }
};
