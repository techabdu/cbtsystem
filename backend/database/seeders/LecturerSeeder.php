<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LecturerSeeder extends Seeder
{
    /**
     * Seed 5 lecturers for every department (34 depts × 5 = 170 lecturers).
     *
     * Per department:
     *   Lecturer #1 — HOD (is_hod = true)
     *   Lecturer #2 — School Exam Officer (is_school_exam_officer = true)
     *   Lecturer #3 — Department Exam Officer (is_department_exam_officer = true)
     *   Lecturer #4 — Regular lecturer
     *   Lecturer #5 — Regular lecturer
     *
     * Staff ID format: {SCHOOL_CODE}-{DEPT_CODE}-{ROLE_SUFFIX}
     *   e.g.  SCI-MTH-HOD  | SCI-MTH-SEO | SCI-MTH-DEO | SCI-MTH-L01 | SCI-MTH-L02
     */
    public function run(): void
    {
        $departments = DB::table('departments')
            ->join('schools', 'departments.school_id', '=', 'schools.id')
            ->select(
                'departments.id as dept_id',
                'departments.code as dept_code',
                'departments.name as dept_name',
                'schools.id as school_id',
                'schools.code as school_code'
            )
            ->get();

        $password = Hash::make(env('SEED_LECTURER_PASSWORD', Str::random(24)));
        $now      = now();
        $users    = [];

        // Nigerian name pools for realistic data
        $firstNames = [
            'Abdullahi', 'Adaeze', 'Ahmed', 'Aisha', 'Amina', 'Babatunde', 'Bashir',
            'Blessing', 'Chidinma', 'Chioma', 'David', 'Emeka', 'Fatima', 'Felix',
            'Funmilayo', 'Gloria', 'Hassan', 'Ibrahim', 'Ifeanyi', 'Ismaila',
            'John', 'Josephine', 'Kabir', 'Kwame', 'Laila', 'Mahmud', 'Mary',
            'Mohammed', 'Musa', 'Ngozi', 'Nnamdi', 'Nkechi', 'Obioma', 'Okafor',
            'Oluwaseun', 'Omowunmi', 'Patience', 'Peter', 'Rashid', 'Rita',
            'Samuel', 'Sani', 'Sarah', 'Solomon', 'Sunday', 'Taiwo', 'Tochukwu',
            'Usman', 'Victor', 'Yakubu', 'Yetunde', 'Zainab', 'Zubairu',
        ];

        $lastNames = [
            'Abdullahi', 'Adeyemi', 'Agbo', 'Ahmed', 'Aliyu', 'Amaechi',
            'Bello', 'Chukwu', 'Danladi', 'Eze', 'Garba', 'Hassan',
            'Ibrahim', 'Idris', 'Ige', 'Ismaila', 'Jibrin', 'Kadiri',
            'Lawal', 'Lawan', 'Madu', 'Maikano', 'Mohammed', 'Musa',
            'Nwosu', 'Odeh', 'Okafor', 'Okeke', 'Okereke', 'Okonkwo',
            'Omotayo', 'Onuoha', 'Orji', 'Osagie', 'Suleiman', 'Umar',
            'Usman', 'Yakubu', 'Yusuf', 'Zurmi',
        ];

        $nameIndex = 0;
        $getName   = function () use ($firstNames, $lastNames, &$nameIndex) {
            $first = $firstNames[$nameIndex % count($firstNames)];
            $last  = $lastNames[($nameIndex + 7) % count($lastNames)];
            $nameIndex++;
            return ['first' => $first, 'last' => $last];
        };

        foreach ($departments as $dept) {
            $schoolCode = $dept->school_code;
            $deptCode   = $dept->dept_code;

            // Lecturer sub-role definitions for the 5 slots
            $slots = [
                1 => ['suffix' => 'HOD', 'is_hod' => true, 'is_school_exam_officer' => false, 'is_department_exam_officer' => false],
                2 => ['suffix' => 'SEO', 'is_hod' => false, 'is_school_exam_officer' => true,  'is_department_exam_officer' => false],
                3 => ['suffix' => 'DEO', 'is_hod' => false, 'is_school_exam_officer' => false, 'is_department_exam_officer' => true],
                4 => ['suffix' => 'L01', 'is_hod' => false, 'is_school_exam_officer' => false, 'is_department_exam_officer' => false],
                5 => ['suffix' => 'L02', 'is_hod' => false, 'is_school_exam_officer' => false, 'is_department_exam_officer' => false],
            ];

            foreach ($slots as $slotNum => $slot) {
                $name    = $getName();
                $staffId = "{$schoolCode}-{$deptCode}-{$slot['suffix']}";
                $email   = strtolower("{$deptCode}.{$slot['suffix']}@fctzuba.edu.ng");

                $users[] = [
                    'uuid'                         => Str::uuid()->toString(),
                    'email'                        => $email,
                    'password'                     => $password,
                    'first_name'                   => $name['first'],
                    'last_name'                    => $name['last'],
                    'middle_name'                  => null,
                    'staff_id'                     => $staffId,
                    'student_id'                   => null,
                    'role'                         => 'lecturer',
                    'school_id'                    => $dept->school_id,
                    'department_id'                => $dept->dept_id,
                    'combination_id'               => null,
                    'level_id'                     => null,
                    'is_hod'                       => $slot['is_hod'],
                    'is_school_exam_officer'       => $slot['is_school_exam_officer'],
                    'is_department_exam_officer'   => $slot['is_department_exam_officer'],
                    'is_active'                    => true,
                    'is_verified'                  => true,
                    'email_verified_at'            => $now,
                    'password_changed_at'          => $now,
                    'metadata'                     => json_encode(['department' => $deptCode, 'school' => $schoolCode]),
                    'created_at'                   => $now,
                    'updated_at'                   => $now,
                ];
            }
        }

        // Insert in chunks to avoid max_allowed_packet issues
        foreach (array_chunk($users, 50) as $chunk) {
            DB::table('users')->insert($chunk);
        }
    }
}
