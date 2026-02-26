<?php

namespace Database\Factories;

use App\Models\Course;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Exam>
 */
class ExamFactory extends Factory
{
    public function definition(): array
    {
        $start = now()->addDays(3);
        $end   = (clone $start)->addHours(2);

        return [
            'uuid'                     => (string) Str::uuid(),
            'course_id'                => Course::factory(),
            'created_by'               => User::factory()->lecturer(),
            'title'                    => $this->faker->sentence(4) . ' Exam',
            'description'              => $this->faker->sentence(),
            'instructions'             => $this->faker->sentence(),
            'exam_type'                => $this->faker->randomElement(['semester', 'practical']),
            'start_time'               => $start,
            'end_time'                 => $end,
            'duration_minutes'         => 60,
            'total_marks'              => 100.00,
            'passing_marks'            => 40.00,
            'randomize_questions'      => true,
            'randomize_options'        => true,
            'questions_per_page'       => 1,
            'allow_backtrack'          => false,
            'show_results_immediately' => false,
            'show_correct_answers'     => false,
            'requires_password'        => false,
            'status'                   => 'draft',
            'is_practice'              => false,
            'enable_proctoring'        => false,
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => 'draft']);
    }

    public function published(): static
    {
        return $this->state(['status' => 'published']);
    }

    public function hodReview(): static
    {
        return $this->state(['status' => 'hod_review']);
    }

    public function practice(): static
    {
        return $this->state(['status' => 'published', 'is_practice' => true]);
    }
}
