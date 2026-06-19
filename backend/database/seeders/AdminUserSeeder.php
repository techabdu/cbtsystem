<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    // WARNING: This seeder is for DEVELOPMENT ONLY. Never run in production.
    // Admin accounts are created without passwords — use the activation flow.
    public function run(): void
    {
        $now = now();
        $devPassword = Hash::make(env('SEED_ADMIN_PASSWORD', Str::random(24)));

        $admins = [
            [
                'uuid'               => Str::uuid()->toString(),
                'email'              => 'admin@fctzuba.edu.ng',
                'password'           => $devPassword,
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
                'password'           => $devPassword,
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
                'password'           => $devPassword,
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

        if (app()->environment('local', 'testing')) {
            $this->command->info('Admin accounts seeded. Set SEED_ADMIN_PASSWORD in .env or use activation flow.');
        }
    }
}
