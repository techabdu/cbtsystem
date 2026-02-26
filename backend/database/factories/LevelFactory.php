<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Level>
 */
class LevelFactory extends Factory
{
    private static int $order = 100;

    public function definition(): array
    {
        $order = self::$order;
        self::$order += 100;

        return [
            'code'          => $order . 'L',
            'name'          => 'Year ' . ($order / 100),
            'numeric_order' => $order,
            'is_active'     => true,
        ];
    }
}
