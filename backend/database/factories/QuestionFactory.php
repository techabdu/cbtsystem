<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Question>
 */
class QuestionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'uuid'          => (string) Str::uuid(),
            'course_id'     => Course::factory(),
            'created_by'    => User::factory()->lecturer(),
            'question_text' => $this->faker->sentence() . '?',
            'question_type' => 'multiple_choice',
            'options'       => [
                ['key' => 'A', 'value' => $this->faker->words(3, true)],
                ['key' => 'B', 'value' => $this->faker->words(3, true)],
                ['key' => 'C', 'value' => $this->faker->words(3, true)],
                ['key' => 'D', 'value' => $this->faker->words(3, true)],
            ],
            'correct_answer'   => 'A',
            'points'           => 1.00,
            'difficulty_level' => 'medium',
            'is_active'        => true,
            'is_verified'      => false,
        ];
    }

    public function trueFalse(): static
    {
        return $this->state([
            'question_type'  => 'true_false',
            'options'        => [
                ['key' => 'True', 'value' => 'True'],
                ['key' => 'False', 'value' => 'False'],
            ],
            'correct_answer' => 'True',
        ]);
    }

    public function essay(): static
    {
        return $this->state([
            'question_type'  => 'essay',
            'options'        => null,
            'correct_answer' => null,
        ]);
    }

    public function fillInBlank(): static
    {
        return $this->state([
            'question_type'  => 'fill_in_blank',
            'options'        => null,
            'correct_answer' => 'sample answer',
        ]);
    }

    public function verified(): static
    {
        return $this->state([
            'is_verified' => true,
            'verified_at' => now(),
        ]);
    }
}
