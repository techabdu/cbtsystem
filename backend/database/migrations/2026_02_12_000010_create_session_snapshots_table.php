<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Session Snapshots (auto-save state backups for crash recovery).
     */
    public function up(): void
    {
        Schema::create('session_snapshots', function (Blueprint $table) {
            $table->id();

            $table->foreignId('session_id')
                  ->constrained('exam_sessions')
                  ->onDelete('cascade');

            // Complete State
            $table->json('snapshot_data'); // Full session state including all answers

            // Metadata
            $table->enum('snapshot_type', ['auto_save', 'manual', 'recovery', 'checkpoint']);

            $table->timestamp('created_at')->useCurrent();

            // Indexes
            $table->index('session_id', 'idx_snapshots_session');
            $table->index(['session_id', 'created_at'], 'idx_snapshots_created');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('session_snapshots');
    }
};
