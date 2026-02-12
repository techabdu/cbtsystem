<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemSettingsSeeder extends Seeder
{
    /**
     * Seed default system settings.
     */
    public function run(): void
    {
        $settings = [
            [
                'key' => 'auto_save_interval',
                'value' => '5',
                'value_type' => 'integer',
                'description' => 'Auto-save interval in seconds during exams',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'max_concurrent_exams',
                'value' => '5000',
                'value_type' => 'integer',
                'description' => 'Maximum concurrent exam sessions allowed',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'session_timeout_minutes',
                'value' => '120',
                'value_type' => 'integer',
                'description' => 'Session timeout duration in minutes',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'enable_proctoring',
                'value' => 'false',
                'value_type' => 'boolean',
                'description' => 'Enable proctoring features globally',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'max_violation_count',
                'value' => '10',
                'value_type' => 'integer',
                'description' => 'Maximum violations before auto-flagging a session',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'snapshot_interval',
                'value' => '5',
                'value_type' => 'integer',
                'description' => 'Session snapshot interval in minutes',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'max_snapshots_per_session',
                'value' => '50',
                'value_type' => 'integer',
                'description' => 'Maximum number of snapshots to keep per session',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'system_name',
                'value' => 'CBT System',
                'value_type' => 'string',
                'description' => 'Name of the system displayed in the UI',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'support_email',
                'value' => 'support@cbt.edu',
                'value_type' => 'string',
                'description' => 'Support email address displayed in the UI',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'default_exam_duration',
                'value' => '60',
                'value_type' => 'integer',
                'description' => 'Default exam duration in minutes when creating a new exam',
                'is_public' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'allow_student_registration',
                'value' => 'true',
                'value_type' => 'boolean',
                'description' => 'Whether students can self-register',
                'is_public' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('system_settings')->insert($settings);
    }
}
