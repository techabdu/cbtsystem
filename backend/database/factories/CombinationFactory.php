<?php

namespace Database\Factories;

use App\Models\Department;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Combination>
 */
class CombinationFactory extends Factory
{
    public function definition(): array
    {
        $dept1 = Department::factory()->create();
        $dept2 = Department::factory()->create();

        return [
            'code'                 => strtoupper($this->faker->unique()->lexify('??/??')),
            'name'                 => $dept1->name . ' / ' . $dept2->name,
            'first_department_id'  => $dept1->id,
            'second_department_id' => $dept2->id,
            'is_double_major'      => false,
            'is_active'            => true,
        ];
    }
}
