<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     *
     * Order matters — seeders must run in dependency order:
     * 1. Admin user (no dependencies)
     * 2. Departments (no dependencies)
     * 3. Combinations (depends on departments)
     * 4. Sample users (depends on departments & combinations)
     * 5. Courses (depends on departments)
     * 6. System settings (no dependencies)
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            DepartmentSeeder::class,
            CombinationSeeder::class,
            LevelSeeder::class,
            SampleUsersSeeder::class,
            CourseSeeder::class,
            SystemSettingsSeeder::class,
        ]);
    }
}
