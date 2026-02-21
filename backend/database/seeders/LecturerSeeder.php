<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class LecturerSeeder extends Seeder
{
    /**
     * Seed 5 lecturers per department (30 total).
     * The first lecturer in each department is designated as HOD.
     * Password: Lecturer@123
     */
    public function run(): void
    {
        $depts = DB::table('departments')->pluck('id', 'code');
        $now   = now();

        // [dept_code => [lecturers]]
        // First entry in each dept array is the HOD (is_hod = true)
        $lecturersByDept = [
            'CS' => [
                ['staff_id' => 'CS01', 'email' => 'cs.lec1@cbt.edu',  'first_name' => 'Emeka',     'last_name' => 'Nwosu',      'middle_name' => 'C.',  'is_hod' => true],
                ['staff_id' => 'CS02', 'email' => 'cs.lec2@cbt.edu',  'first_name' => 'Tunde',     'last_name' => 'Adeyemi',    'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'CS03', 'email' => 'cs.lec3@cbt.edu',  'first_name' => 'Ngozi',     'last_name' => 'Obi',        'middle_name' => 'A.',  'is_hod' => false],
                ['staff_id' => 'CS04', 'email' => 'cs.lec4@cbt.edu',  'first_name' => 'Chukwudi',  'last_name' => 'Eze',        'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'CS05', 'email' => 'cs.lec5@cbt.edu',  'first_name' => 'Blessing',  'last_name' => 'Okonkwo',   'middle_name' => 'N.',  'is_hod' => false],
            ],
            'ENG' => [
                ['staff_id' => 'ENG01', 'email' => 'eng.lec1@cbt.edu', 'first_name' => 'Yusuf',    'last_name' => 'Abdullahi',  'middle_name' => 'B.',  'is_hod' => true],
                ['staff_id' => 'ENG02', 'email' => 'eng.lec2@cbt.edu', 'first_name' => 'Segun',    'last_name' => 'Afolabi',    'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'ENG03', 'email' => 'eng.lec3@cbt.edu', 'first_name' => 'Amina',    'last_name' => 'Bello',      'middle_name' => 'R.',  'is_hod' => false],
                ['staff_id' => 'ENG04', 'email' => 'eng.lec4@cbt.edu', 'first_name' => 'Olumide',  'last_name' => 'Adeyinka',   'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'ENG05', 'email' => 'eng.lec5@cbt.edu', 'first_name' => 'Chioma',   'last_name' => 'Uzor',       'middle_name' => 'S.',  'is_hod' => false],
            ],
            'MTH' => [
                ['staff_id' => 'MTH01', 'email' => 'mth.lec1@cbt.edu', 'first_name' => 'Babatunde', 'last_name' => 'Ogundimu', 'middle_name' => 'O.',  'is_hod' => true],
                ['staff_id' => 'MTH02', 'email' => 'mth.lec2@cbt.edu', 'first_name' => 'Ifeanyi',   'last_name' => 'Nwachukwu','middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'MTH03', 'email' => 'mth.lec3@cbt.edu', 'first_name' => 'Halima',    'last_name' => 'Sule',      'middle_name' => 'M.',  'is_hod' => false],
                ['staff_id' => 'MTH04', 'email' => 'mth.lec4@cbt.edu', 'first_name' => 'Obinna',    'last_name' => 'Okeke',     'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'MTH05', 'email' => 'mth.lec5@cbt.edu', 'first_name' => 'Rukayat',   'last_name' => 'Salami',    'middle_name' => 'F.',  'is_hod' => false],
            ],
            'PHY' => [
                ['staff_id' => 'PHY01', 'email' => 'phy.lec1@cbt.edu', 'first_name' => 'Adaeze',   'last_name' => 'Igwe',       'middle_name' => 'C.',  'is_hod' => true],
                ['staff_id' => 'PHY02', 'email' => 'phy.lec2@cbt.edu', 'first_name' => 'Musa',     'last_name' => 'Garba',      'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'PHY03', 'email' => 'phy.lec3@cbt.edu', 'first_name' => 'Olawale',  'last_name' => 'Fashola',    'middle_name' => 'T.',  'is_hod' => false],
                ['staff_id' => 'PHY04', 'email' => 'phy.lec4@cbt.edu', 'first_name' => 'Eniola',   'last_name' => 'Adeleke',    'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'PHY05', 'email' => 'phy.lec5@cbt.edu', 'first_name' => 'Chidinma', 'last_name' => 'Okafor',     'middle_name' => 'U.',  'is_hod' => false],
            ],
            'BIO' => [
                ['staff_id' => 'BIO01', 'email' => 'bio.lec1@cbt.edu', 'first_name' => 'Taiwo',    'last_name' => 'Oladele',    'middle_name' => 'A.',  'is_hod' => true],
                ['staff_id' => 'BIO02', 'email' => 'bio.lec2@cbt.edu', 'first_name' => 'Aliyu',    'last_name' => 'Musa',       'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'BIO03', 'email' => 'bio.lec3@cbt.edu', 'first_name' => 'Uchenna',  'last_name' => 'Nwofor',     'middle_name' => 'K.',  'is_hod' => false],
                ['staff_id' => 'BIO04', 'email' => 'bio.lec4@cbt.edu', 'first_name' => 'Seun',     'last_name' => 'Adesanya',   'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'BIO05', 'email' => 'bio.lec5@cbt.edu', 'first_name' => 'Mariam',   'last_name' => 'Lawal',      'middle_name' => 'I.',  'is_hod' => false],
            ],
            'BUS' => [
                ['staff_id' => 'BUS01', 'email' => 'bus.lec1@cbt.edu', 'first_name' => 'Kunle',    'last_name' => 'Adebowale',  'middle_name' => 'O.',  'is_hod' => true],
                ['staff_id' => 'BUS02', 'email' => 'bus.lec2@cbt.edu', 'first_name' => 'Suleiman', 'last_name' => 'Dahiru',     'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'BUS03', 'email' => 'bus.lec3@cbt.edu', 'first_name' => 'Ifeoma',   'last_name' => 'Obiora',     'middle_name' => 'G.',  'is_hod' => false],
                ['staff_id' => 'BUS04', 'email' => 'bus.lec4@cbt.edu', 'first_name' => 'Tobi',     'last_name' => 'Olawale',    'middle_name' => null,  'is_hod' => false],
                ['staff_id' => 'BUS05', 'email' => 'bus.lec5@cbt.edu', 'first_name' => 'Hauwa',    'last_name' => 'Ibrahim',    'middle_name' => 'F.',  'is_hod' => false],
            ],
        ];

        $hashedPassword = Hash::make('Lecturer@123');

        foreach ($lecturersByDept as $deptCode => $lecturers) {
            if (! isset($depts[$deptCode])) {
                continue;
            }

            $deptId = $depts[$deptCode];

            foreach ($lecturers as $lec) {
                DB::table('users')->updateOrInsert(
                    ['email' => $lec['email']],
                    [
                        'uuid'                  => Str::uuid()->toString(),
                        'email'                 => $lec['email'],
                        'password'              => $hashedPassword,
                        'first_name'            => $lec['first_name'],
                        'last_name'             => $lec['last_name'],
                        'middle_name'           => $lec['middle_name'],
                        'staff_id'              => $lec['staff_id'],
                        'student_id'            => null,
                        'role'                  => 'lecturer',
                        'department_id'         => $deptId,
                        'combination_id'        => null,
                        'is_hod'                => $lec['is_hod'],
                        'is_active'             => true,
                        'is_verified'           => true,
                        'email_verified_at'     => $now,
                        'password_changed_at'   => $now,
                        'metadata'              => json_encode(['department' => $deptCode]),
                        'created_at'            => $now,
                        'updated_at'            => $now,
                    ]
                );
            }
        }
    }
}
