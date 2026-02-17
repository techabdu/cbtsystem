<?php

namespace Database\Seeders;

use App\Models\SystemSetting;
use Illuminate\Database\Seeder;

class EnrollmentSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key' => 'enrollment_start_date',
                'value' => now()->subDays(1)->format('Y-m-d H:i:s'),
                'value_type' => 'string',
                'description' => 'Start date for student course enrollment',
                'is_public' => true,
            ],
            [
                'key' => 'enrollment_end_date',
                'value' => now()->addDays(30)->format('Y-m-d H:i:s'),
                'value_type' => 'string',
                'description' => 'End date for student course enrollment',
                'is_public' => true,
            ],
        ];

        foreach ($settings as $data) {
            SystemSetting::updateOrCreate(
                ['key' => $data['key']],
                $data
            );
        }
    }
}
