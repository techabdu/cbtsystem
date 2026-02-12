<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid'              => (string) Str::uuid(),
            'first_name'        => fake()->firstName(),
            'last_name'         => fake()->lastName(),
            'email'             => fake()->unique()->safeEmail(),
            'password'          => static::$password ??= Hash::make('password'),
            'role'              => 'student',
            'is_active'         => true,
            'is_verified'       => true,
            'email_verified_at' => now(),
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
            'is_verified'       => false,
        ]);
    }

    /**
     * Create an admin user.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role'     => 'admin',
            'staff_id' => 'STAFF/' . fake()->unique()->numerify('####'),
        ]);
    }

    /**
     * Create a lecturer user.
     */
    public function lecturer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role'     => 'lecturer',
            'staff_id' => 'STAFF/' . fake()->unique()->numerify('####'),
        ]);
    }

    /**
     * Create a student user.
     */
    public function student(): static
    {
        return $this->state(fn (array $attributes) => [
            'role'       => 'student',
            'student_id' => '2024/CS/' . fake()->unique()->numerify('###'),
        ]);
    }
}
