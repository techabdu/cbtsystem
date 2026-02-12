<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class SampleUsersSeeder extends Seeder
{
    /**
     * Seed sample lecturer and student users.
     */
    public function run(): void
    {
        $users = [
            // Lecturers
            [
                'uuid' => Str::uuid()->toString(),
                'email' => 'lecturer1@cbt.edu',
                'password' => Hash::make('Lecturer@123'),
                'first_name' => 'John',
                'last_name' => 'Smith',
                'middle_name' => null,
                'staff_id' => 'LEC001',
                'student_id' => null,
                'role' => 'lecturer',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
                'metadata' => json_encode(['department' => 'CS']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'email' => 'lecturer2@cbt.edu',
                'password' => Hash::make('Lecturer@123'),
                'first_name' => 'Sarah',
                'last_name' => 'Johnson',
                'middle_name' => 'A.',
                'staff_id' => 'LEC002',
                'student_id' => null,
                'role' => 'lecturer',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
                'metadata' => json_encode(['department' => 'MTH']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Students
            [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student1@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Ahmed',
                'last_name' => 'Ibrahim',
                'middle_name' => null,
                'student_id' => 'STU2025001',
                'staff_id' => null,
                'role' => 'student',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
                'metadata' => json_encode(['level' => '100L', 'department' => 'CS']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student2@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Fatima',
                'last_name' => 'Ali',
                'middle_name' => 'B.',
                'student_id' => 'STU2025002',
                'staff_id' => null,
                'role' => 'student',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
                'metadata' => json_encode(['level' => '200L', 'department' => 'CS']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student3@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Michael',
                'last_name' => 'Okafor',
                'middle_name' => null,
                'student_id' => 'STU2025003',
                'staff_id' => null,
                'role' => 'student',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
                'metadata' => json_encode(['level' => '100L', 'department' => 'ENG']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student4@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Aisha',
                'last_name' => 'Mohammed',
                'middle_name' => null,
                'student_id' => 'STU2025004',
                'staff_id' => null,
                'role' => 'student',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
                'metadata' => json_encode(['level' => '300L', 'department' => 'MTH']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student5@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'David',
                'last_name' => 'Eze',
                'middle_name' => 'C.',
                'student_id' => 'STU2025005',
                'staff_id' => null,
                'role' => 'student',
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => now(),
                'metadata' => json_encode(['level' => '100L', 'department' => 'BIO']),
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('users')->insert($users);
    }
}
