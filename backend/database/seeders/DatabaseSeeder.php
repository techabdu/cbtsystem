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
     * 2. Sample users (no dependencies)
     * 3. Departments (no dependencies)
     * 4. Courses (depends on departments)
     * 5. System settings (no dependencies)
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            SampleUsersSeeder::class,
            DepartmentSeeder::class,
            CourseSeeder::class,
            SystemSettingsSeeder::class,
        ]);
    }
}
