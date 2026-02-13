<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('combinations', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();           // e.g. CS/MTH
            $table->string('name', 200);                     // e.g. Computer Science / Mathematics

            $table->foreignId('first_department_id')
                  ->constrained('departments')
                  ->cascadeOnUpdate()
                  ->restrictOnDelete();

            $table->foreignId('second_department_id')
                  ->constrained('departments')
                  ->cascadeOnUpdate()
                  ->restrictOnDelete();

            $table->boolean('is_double_major')->default(false); // true = both FKs point to same dept
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Prevent duplicate pairings (A+B already covers B+A handled in app logic)
            $table->unique(['first_department_id', 'second_department_id'], 'combo_dept_pair_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('combinations');
    }
};
