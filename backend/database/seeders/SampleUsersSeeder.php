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
        // Fetch IDs
        $depts = DB::table('departments')->pluck('id', 'code'); // ['CS' => 1, 'MTH' => 2]
        $combos = DB::table('combinations')->pluck('id', 'code'); // ['CS/MTH' => 1]

        $users = [];
        $now = now();

        // ------------------------------------------------------------------
        // Lecturers (assigned to Departments)
        // ------------------------------------------------------------------

        if (isset($depts['CS'])) {
            $users[] = [
                'uuid' => Str::uuid()->toString(),
                'email' => 'lecturer1@cbt.edu',
                'password' => Hash::make('Lecturer@123'),
                'first_name' => 'John',
                'last_name' => 'Smith',
                'middle_name' => null,
                'staff_id' => 'LEC001',
                'student_id' => null,
                'role' => 'lecturer',
                'department_id' => $depts['CS'],
                'combination_id' => null,
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => $now,
                'metadata' => json_encode(['department' => 'CS']),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        if (isset($depts['MTH'])) {
            $users[] = [
                'uuid' => Str::uuid()->toString(),
                'email' => 'lecturer2@cbt.edu',
                'password' => Hash::make('Lecturer@123'),
                'first_name' => 'Sarah',
                'last_name' => 'Johnson',
                'middle_name' => 'A.',
                'staff_id' => 'LEC002',
                'student_id' => null,
                'role' => 'lecturer',
                'department_id' => $depts['MTH'],
                'combination_id' => null,
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => $now,
                'metadata' => json_encode(['department' => 'MTH']),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // ------------------------------------------------------------------
        // Students (assigned to Combinations)
        // ------------------------------------------------------------------

        // Student 1: CS/MTH
        if (isset($combos['CS/MTH'])) {
            $users[] = [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student1@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Ahmed',
                'last_name' => 'Ibrahim',
                'middle_name' => null,
                'student_id' => 'STU2025001',
                'staff_id' => null,
                'role' => 'student',
                'department_id' => null,
                'combination_id' => $combos['CS/MTH'],
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => $now,
                'metadata' => json_encode(['level' => '100L']),
                'created_at' => $now,
                'updated_at' => $now,
            ];
            // Student 2: CS/MTH
            $users[] = [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student2@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Fatima',
                'last_name' => 'Ali',
                'middle_name' => 'B.',
                'student_id' => 'STU2025002',
                'staff_id' => null,
                'role' => 'student',
                'department_id' => null,
                'combination_id' => $combos['CS/MTH'],
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => $now,
                'metadata' => json_encode(['level' => '200L']),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Student 3: PHY/MTH
        if (isset($combos['PHY/MTH'])) {
            $users[] = [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student3@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Michael',
                'last_name' => 'Okafor',
                'middle_name' => null,
                'student_id' => 'STU2025003',
                'staff_id' => null,
                'role' => 'student',
                'department_id' => null,
                'combination_id' => $combos['PHY/MTH'],
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => $now,
                'metadata' => json_encode(['level' => '100L']),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Student 4: BIO/PHY
        if (isset($combos['BIO/PHY'])) {
            $users[] = [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student4@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'Aisha',
                'last_name' => 'Mohammed',
                'middle_name' => null,
                'student_id' => 'STU2025004',
                'staff_id' => null,
                'role' => 'student',
                'department_id' => null,
                'combination_id' => $combos['BIO/PHY'],
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => $now,
                'metadata' => json_encode(['level' => '300L']),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        // Student 5: BUS/DM (Double Major)
        if (isset($combos['BUS/DM'])) {
            $users[] = [
                'uuid' => Str::uuid()->toString(),
                'email' => 'student5@cbt.edu',
                'password' => Hash::make('Student@123'),
                'first_name' => 'David',
                'last_name' => 'Eze',
                'middle_name' => 'C.',
                'student_id' => 'STU2025005',
                'staff_id' => null,
                'role' => 'student',
                'department_id' => null,
                'combination_id' => $combos['BUS/DM'],
                'is_active' => true,
                'is_verified' => true,
                'email_verified_at' => $now,
                'metadata' => json_encode(['level' => '100L']),
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        foreach ($users as $user) {
            DB::table('users')->updateOrInsert(
                ['email' => $user['email']],
                $user
            );
        }
    }
}
