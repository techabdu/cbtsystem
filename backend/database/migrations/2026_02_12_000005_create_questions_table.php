<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * CBT System — Questions table (master question bank).
     */
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            $table->foreignId('course_id')
                  ->constrained('courses')
                  ->onDelete('cascade');

            $table->foreignId('created_by')
                  ->constrained('users')
                  ->onDelete('restrict');

            // Question Content
            $table->text('question_text');
            $table->enum('question_type', ['multiple_choice', 'true_false', 'fill_in_blank', 'essay', 'matching']);

            // For MCQ, T/F, Matching — JSON arrays
            $table->json('options')->nullable();         // [{"key": "A", "value": "Option text"}, ...]
            $table->json('correct_answer')->nullable();  // Single value or array for multiple correct

            // Media attachments
            $table->boolean('has_image')->default(false);
            $table->string('image_url', 500)->nullable();
            $table->boolean('has_audio')->default(false);
            $table->string('audio_url', 500)->nullable();

            // Configuration
            $table->decimal('points', 5, 2)->default(1.00);
            $table->enum('difficulty_level', ['easy', 'medium', 'hard'])->nullable();

            // Categorization
            $table->string('topic', 200)->nullable();
            $table->json('tags')->nullable(); // Array of tags for filtering

            // Analytics
            $table->integer('times_used')->default(0);
            $table->decimal('average_score', 5, 2)->nullable();

            // Status
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);
            $table->foreignId('verified_by')
                  ->nullable()
                  ->constrained('users')
                  ->nullOnDelete();
            $table->timestamp('verified_at')->nullable();

            // Metadata
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['course_id', 'deleted_at'], 'idx_questions_course');
            $table->index('created_by', 'idx_questions_created_by');
            $table->index(['question_type', 'deleted_at'], 'idx_questions_type');
            $table->index(['difficulty_level', 'deleted_at'], 'idx_questions_difficulty');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
