<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Session Snapshots.
     * Auto-save state backups for crash recovery.
     * Created every 10 answers and before submission.
     */
    public function up(): void
    {
        Schema::create('session_snapshots', function (Blueprint $table) {
            $table->id();

            $table->foreignId('session_id')
                  ->constrained('exam_sessions')
                  ->onDelete('cascade');

            // Column name matches the SessionSnapshot model's fillable
            $table->string('snapshot_type', 50)->default('auto_save');
            $table->json('snapshot_data'); // Full answers state
            $table->integer('question_count')->default(0);
            $table->integer('answers_count')->default(0);

            $table->timestamp('created_at')->useCurrent();
            // No updated_at — snapshots are immutable

            $table->index(['session_id', 'snapshot_type'], 'idx_snapshots_session');
            $table->index('created_at', 'idx_snapshots_created');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('session_snapshots');
    }
};
