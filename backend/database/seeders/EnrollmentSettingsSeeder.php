<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EnrollmentSettingsSeeder extends Seeder
{
    /**
     * Ensure enrollment window settings are present.
     * These are also in SystemSettingsSeeder — this seeder is kept for independent usage.
     */
    public function run(): void
    {
        $settings = [
            'enrollment_open'       => 'true',
            'enrollment_start_date' => '2025-09-01',
            'enrollment_end_date'   => '2025-10-31',
        ];

        $now = now();

        foreach ($settings as $key => $value) {
            DB::table('system_settings')->updateOrInsert(
                ['key' => $key],
                [
                    'value'      => $value,
                    'type'       => 'string',
                    'group'      => 'enrollment',
                    'is_public'  => true,
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }
}
