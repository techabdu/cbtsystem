<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    /**
     * Seed sample departments.
     */
    public function run(): void
    {
        $departments = [
            [
                'code' => 'CS',
                'name' => 'Computer Science',
                'description' => 'Department of Computer Science covering software engineering, AI, data science, and systems.',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'ENG',
                'name' => 'Engineering',
                'description' => 'Department of Engineering covering civil, mechanical, electrical, and chemical engineering.',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'MTH',
                'name' => 'Mathematics',
                'description' => 'Department of Mathematics covering pure math, applied math, and statistics.',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'PHY',
                'name' => 'Physics',
                'description' => 'Department of Physics covering classical mechanics, quantum physics, and thermodynamics.',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'BIO',
                'name' => 'Biology',
                'description' => 'Department of Biology covering microbiology, genetics, ecology, and biochemistry.',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'BUS',
                'name' => 'Business Administration',
                'description' => 'Department of Business Administration covering management, finance, marketing, and entrepreneurship.',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('departments')->insert($departments);
    }
}
