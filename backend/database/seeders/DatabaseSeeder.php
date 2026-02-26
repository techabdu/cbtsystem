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
     *  1. Schools          (no dependencies)
     *  2. Departments      (depends on: schools)
     *  3. Combinations     (depends on: departments)
     *  4. Levels           (no dependencies)
     *  5. Admin Users      (no dependencies — admin/edu_portal/cbt roles)
     *  6. Lecturers        (depends on: schools, departments)
     *  7. Students         (depends on: combinations, levels)
     *  8. Courses          (depends on: departments, levels)
     *  9. Exam Access Codes (depends on: students/users)
     * 10. System Settings  (no dependencies)
     */
    public function run(): void
    {
        $this->call([
            SchoolSeeder::class,
            DepartmentSeeder::class,
            CombinationSeeder::class,
            LevelSeeder::class,
            AdminUserSeeder::class,
            LecturerSeeder::class,
            StudentSeeder::class,
            CourseSeeder::class,
            ExamAccessCodeSeeder::class,
            SystemSettingsSeeder::class,
        ]);
    }
}
