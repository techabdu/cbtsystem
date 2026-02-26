<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class StudentSeeder extends Seeder
{
    /**
     * Seed 3 students per NCE combination.
     * Each student is at a different academic level (100L, 200L, 300L).
     *
     * Matric number format: FCTZUBA/{YEAR}/{COMBO_CODE}/{LEVEL_NUM}
     * e.g. FCTZUBA/2023/MTH-PHY/001
     */
    public function run(): void
    {
        $combinations = DB::table('combinations')
            ->where('is_active', true)
            ->get(['id', 'code', 'name', 'first_department_id', 'second_department_id', 'is_double_major']);

        $levels = DB::table('levels')->orderBy('order')->pluck('id', 'code');

        $password = Hash::make('Student@123');
        $now      = now();
        $users    = [];

        // Nigerian name pools
        $maleFirst   = ['Ahmed', 'Abdullahi', 'Aliyu', 'Babatunde', 'Bashir', 'Chukwuemeka', 'David',
                         'Emeka', 'Felix', 'Hassan', 'Ibrahim', 'Ismaila', 'John', 'Kabir', 'Lawal',
                         'Mahmud', 'Mohammed', 'Musa', 'Nnamdi', 'Obioma', 'Oluwaseun', 'Peter',
                         'Rashid', 'Samuel', 'Sani', 'Solomon', 'Sunday', 'Tochukwu', 'Usman', 'Victor',
                         'Yakubu', 'Yusuf', 'Zubairu'];
        $femaleFirst = ['Adaeze', 'Aisha', 'Amina', 'Blessing', 'Chidinma', 'Chioma', 'Fatima',
                         'Funmilayo', 'Gloria', 'Ifeanyi', 'Josephine', 'Laila', 'Mary', 'Ngozi',
                         'Nkechi', 'Omowunmi', 'Patience', 'Rita', 'Sarah', 'Taiwo', 'Yetunde', 'Zainab'];
        $lastNames   = ['Abdullahi', 'Adeyemi', 'Ahmed', 'Aliyu', 'Bello', 'Chukwu', 'Danladi',
                         'Eze', 'Garba', 'Hassan', 'Ibrahim', 'Jibrin', 'Lawal', 'Madu', 'Mohammed',
                         'Musa', 'Nwosu', 'Odeh', 'Okafor', 'Okeke', 'Okereke', 'Okonkwo', 'Orji',
                         'Suleiman', 'Umar', 'Usman', 'Yakubu', 'Yusuf'];

        $studentSerial = 1;
        $femaleToggle  = false;

        $levelCodes = ['100L', '200L', '300L']; // 3 students per combo, one per level

        foreach ($combinations as $combo) {
            $comboSlug = str_replace('/', '-', $combo->code);

            foreach ($levelCodes as $levelIdx => $levelCode) {
                if (! isset($levels[$levelCode])) {
                    continue;
                }

                $levelId  = $levels[$levelCode];
                $year     = 2025 - $levelIdx; // 100L joined 2025, 200L joined 2024, 300L joined 2023
                $serial   = str_pad($studentSerial, 4, '0', STR_PAD_LEFT);
                $matricNo = "FCTZUBA/{$year}/{$comboSlug}/{$serial}";
                $email    = strtolower("stu.{$comboSlug}.{$levelCode}@fctzuba.edu.ng");

                // Alternate gender for variety
                $femaleToggle = ! $femaleToggle;
                $firstName    = $femaleToggle
                    ? $femaleFirst[$studentSerial % count($femaleFirst)]
                    : $maleFirst[$studentSerial % count($maleFirst)];
                $lastName     = $lastNames[$studentSerial % count($lastNames)];

                $users[] = [
                    'uuid'               => Str::uuid()->toString(),
                    'email'              => $email,
                    'password'           => $password,
                    'first_name'         => $firstName,
                    'last_name'          => $lastName,
                    'middle_name'        => null,
                    'student_id'         => $matricNo,
                    'staff_id'           => null,
                    'role'               => 'student',
                    'school_id'          => null,
                    'department_id'      => null,
                    'combination_id'     => $combo->id,
                    'level_id'           => $levelId,
                    'is_hod'             => false,
                    'is_school_exam_officer'     => false,
                    'is_department_exam_officer' => false,
                    'is_active'          => true,
                    'is_verified'        => true,
                    'email_verified_at'  => $now,
                    'password_changed_at' => $now,
                    'metadata'           => json_encode([
                        'combination' => $combo->code,
                        'level'       => $levelCode,
                        'entry_year'  => $year,
                    ]),
                    'created_at'         => $now,
                    'updated_at'         => $now,
                ];

                $studentSerial++;
            }
        }

        // Insert in chunks
        foreach (array_chunk($users, 50) as $chunk) {
            DB::table('users')->insert($chunk);
        }
    }
}
