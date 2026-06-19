<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LevelSeeder extends Seeder
{
    /**
     * Seed NCE academic levels.
     * NCE is a 3-year programme: 100L (Year 1), 200L (Year 2), 300L (Year 3).
     * 400L is added for Post-Graduate Diploma students.
     */
    public function run(): void
    {
        $levels = [
            [
                'code'       => '100L',
                'name'       => 'Year 1 (NCE I)',
                'numeric_order' => 1,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code'       => '200L',
                'name'       => 'Year 2 (NCE II)',
                'numeric_order' => 2,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code'       => '300L',
                'name'       => 'Year 3 (NCE III)',
                'numeric_order' => 3,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code'       => '400L',
                'name'       => 'Post-Graduate Diploma (PGD)',
                'numeric_order' => 4,
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('levels')->insert($levels);
    }
}
