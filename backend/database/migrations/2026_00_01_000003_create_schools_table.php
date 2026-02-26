<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * CBT System — Schools table.
     * FCT College of Education, Zuba has 6 schools.
     */
    public function up(): void
    {
        Schema::create('schools', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('name', 200)->unique();
            $table->string('code', 20)->unique();
            $table->string('description', 500)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['code', 'deleted_at'], 'idx_schools_code');
            $table->index(['is_active', 'deleted_at'], 'idx_schools_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schools');
    }
};
