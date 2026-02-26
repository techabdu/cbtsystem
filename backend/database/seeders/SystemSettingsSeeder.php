<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SystemSettingsSeeder extends Seeder
{
    /**
     * Seed system-wide settings for FCT COE Zuba CBT System.
     */
    public function run(): void
    {
        $now = now();

        $settings = [
            // ── Institution ────────────────────────────────────────────────
            ['key' => 'institution_name',        'value' => 'FCT College of Education, Zuba',    'type' => 'string',  'group' => 'institution', 'description' => 'Full institution name',                  'is_public' => true],
            ['key' => 'institution_short_name',  'value' => 'FCT COE Zuba',                       'type' => 'string',  'group' => 'institution', 'description' => 'Short/abbreviated institution name',    'is_public' => true],
            ['key' => 'institution_website',     'value' => 'https://fctcoezuba.edu.ng',           'type' => 'string',  'group' => 'institution', 'description' => 'Official institution website',          'is_public' => true],
            ['key' => 'academic_year',           'value' => '2025/2026',                           'type' => 'string',  'group' => 'institution', 'description' => 'Current academic year',                 'is_public' => true],
            ['key' => 'current_semester',        'value' => 'first',                               'type' => 'string',  'group' => 'institution', 'description' => 'Current semester (first or second)',    'is_public' => true],

            // ── Enrollment Window ─────────────────────────────────────────
            ['key' => 'enrollment_open',         'value' => 'true',                                'type' => 'boolean', 'group' => 'enrollment',  'description' => 'Whether course self-enrollment is open', 'is_public' => true],
            ['key' => 'enrollment_start_date',   'value' => '2025-09-01',                          'type' => 'string',  'group' => 'enrollment',  'description' => 'Enrollment window start date',          'is_public' => true],
            ['key' => 'enrollment_end_date',     'value' => '2025-10-31',                          'type' => 'string',  'group' => 'enrollment',  'description' => 'Enrollment window end date',            'is_public' => true],

            // ── Exam Settings ─────────────────────────────────────────────
            ['key' => 'exam_auto_submit_grace_seconds', 'value' => '60',   'type' => 'integer', 'group' => 'exam', 'description' => 'Grace period (seconds) after timeout before auto-submit', 'is_public' => false],
            ['key' => 'exam_session_timeout_minutes',   'value' => '30',   'type' => 'integer', 'group' => 'exam', 'description' => 'Minutes of inactivity before session is flagged interrupted', 'is_public' => false],
            ['key' => 'exam_snapshot_interval',         'value' => '10',   'type' => 'integer', 'group' => 'exam', 'description' => 'Auto-snapshot every N answers',                             'is_public' => false],
            ['key' => 'max_exam_violations',            'value' => '5',    'type' => 'integer', 'group' => 'exam', 'description' => 'Violation count threshold before flagging a session',        'is_public' => false],

            // ── Security ──────────────────────────────────────────────────
            ['key' => 'password_min_length',     'value' => '8',       'type' => 'integer', 'group' => 'security', 'description' => 'Minimum password length',                     'is_public' => true],
            ['key' => 'max_login_attempts',      'value' => '5',       'type' => 'integer', 'group' => 'security', 'description' => 'Max failed login attempts before lockout',     'is_public' => false],
            ['key' => 'lockout_duration_minutes','value' => '15',      'type' => 'integer', 'group' => 'security', 'description' => 'Account lockout duration in minutes',          'is_public' => false],

            // ── Maintenance ───────────────────────────────────────────────
            ['key' => 'maintenance_mode',        'value' => 'false',   'type' => 'boolean', 'group' => 'system',   'description' => 'Put system in maintenance mode',               'is_public' => true],
            ['key' => 'maintenance_message',     'value' => 'The system is currently undergoing maintenance. Please try again later.', 'type' => 'string', 'group' => 'system', 'description' => 'Message shown during maintenance', 'is_public' => true],
        ];

        foreach ($settings as &$setting) {
            $setting['created_at'] = $now;
            $setting['updated_at'] = $now;
        }
        unset($setting);

        DB::table('system_settings')->insert($settings);
    }
}
