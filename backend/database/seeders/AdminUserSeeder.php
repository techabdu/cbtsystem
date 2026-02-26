<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the three administrator accounts:
     *   1. System Admin      — admin@fctzuba.edu.ng   (role = admin)
     *   2. Edu Portal Admin  — eduportal@fctzuba.edu.ng (role = edu_portal)
     *   3. CBT Center Admin  — cbt@fctzuba.edu.ng     (role = cbt)
     */
    public function run(): void
    {
        $now = now();

        $admins = [
            [
                'uuid'               => Str::uuid()->toString(),
                'email'              => 'admin@fctzuba.edu.ng',
                'password'           => Hash::make('Admin@123456'),
                'first_name'         => 'System',
                'last_name'          => 'Administrator',
                'middle_name'        => null,
                'staff_id'           => 'ADMIN001',
                'student_id'         => null,
                'role'               => 'admin',
                'is_active'          => true,
                'is_verified'        => true,
                'email_verified_at'  => $now,
                'password_changed_at' => $now,
                'metadata'           => json_encode(['seeded' => true]),
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
            [
                'uuid'               => Str::uuid()->toString(),
                'email'              => 'eduportal@fctzuba.edu.ng',
                'password'           => Hash::make('EduPortal@123'),
                'first_name'         => 'Edu',
                'last_name'          => 'Portal',
                'middle_name'        => 'Manager',
                'staff_id'           => 'EDU001',
                'student_id'         => null,
                'role'               => 'edu_portal',
                'is_active'          => true,
                'is_verified'        => true,
                'email_verified_at'  => $now,
                'password_changed_at' => $now,
                'metadata'           => json_encode(['seeded' => true]),
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
            [
                'uuid'               => Str::uuid()->toString(),
                'email'              => 'cbt@fctzuba.edu.ng',
                'password'           => Hash::make('CbtAdmin@123'),
                'first_name'         => 'CBT',
                'last_name'          => 'Center',
                'middle_name'        => 'Admin',
                'staff_id'           => 'CBT001',
                'student_id'         => null,
                'role'               => 'cbt',
                'is_active'          => true,
                'is_verified'        => true,
                'email_verified_at'  => $now,
                'password_changed_at' => $now,
                'metadata'           => json_encode(['seeded' => true]),
                'created_at'         => $now,
                'updated_at'         => $now,
            ],
        ];

        DB::table('users')->insert($admins);
    }
}
