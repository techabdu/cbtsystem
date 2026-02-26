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
            'level_id'      => \App\Models\Level::factory(),
            'code'          => strtoupper($this->faker->unique()->bothify('??###')),
            'name'          => $this->faker->words(4, true) . ' Course',
            'description'   => $this->faker->sentence(),
            'credit_units'  => $this->faker->numberBetween(1, 4),
            'semester'      => $this->faker->randomElement(['first', 'second']),
            'academic_year' => '2025/2026',
            'is_active'     => true,
        ];
    }
}
