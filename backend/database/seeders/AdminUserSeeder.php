<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the admin user.
     */
    public function run(): void
    {
        DB::table('users')->insert([
            'uuid' => Str::uuid()->toString(),
            'email' => 'admin@cbt.edu',
            'password' => Hash::make('Admin@123456'),
            'first_name' => 'System',
            'last_name' => 'Administrator',
            'staff_id' => 'ADMIN001',
            'role' => 'admin',
            'is_active' => true,
            'is_verified' => true,
            'email_verified_at' => now(),
            'password_changed_at' => now(),
            'metadata' => json_encode(['seeded' => true, 'type' => 'system_admin']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
