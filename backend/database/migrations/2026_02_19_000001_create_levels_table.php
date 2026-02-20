<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * If the levels table already exists (from a prior migration),
     * add the missing `numeric_order` column and update the schema.
     * If it doesn't exist, create it from scratch.
     */
    public function up(): void
    {
        if (Schema::hasTable('levels')) {
            // Alter existing table — add missing columns
            Schema::table('levels', function (Blueprint $table) {
                if (! Schema::hasColumn('levels', 'numeric_order')) {
                    $table->unsignedInteger('numeric_order')->default(0)->after('name');
                }
                // Ensure indexes exist
                if (! Schema::hasColumn('levels', 'deleted_at')) {
                    $table->softDeletes();
                }
            });

            return;
        }

        // Fresh creation
        Schema::create('levels', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 100);
            $table->unsignedInteger('numeric_order');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['numeric_order', 'deleted_at'], 'idx_levels_order');
            $table->index(['is_active', 'deleted_at'], 'idx_levels_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('levels', 'numeric_order')) {
            Schema::table('levels', function (Blueprint $table) {
                $table->dropColumn('numeric_order');
            });
        }
    }
};
