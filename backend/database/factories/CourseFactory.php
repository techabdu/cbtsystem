<?php

namespace Database\Factories;

use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'uuid'          => (string) Str::uuid(),
            'department_id' => Department::factory(),
            'code'          => strtoupper($this->faker->unique()->bothify('??###')),
            'title'         => $this->faker->words(4, true) . ' Course',
            'description'   => $this->faker->sentence(),
            'credit_hours'  => $this->faker->numberBetween(1, 4),
            'semester'      => $this->faker->randomElement(['First', 'Second']),
            'academic_year' => '2025/2026',
            'level'         => $this->faker->randomElement(['100L', '200L', '300L', '400L']),
            'is_active'     => true,
        ];
    }
}
