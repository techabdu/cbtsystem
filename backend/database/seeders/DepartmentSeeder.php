<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentSeeder extends Seeder
{
    /**
     * Seed FCT College of Education, Zuba — 34 real departments across 6 schools.
     */
    public function run(): void
    {
        $schools = DB::table('schools')->pluck('id', 'code');

        $departments = [
            // ──────────────────────────────────────────────────────────────
            // School of Sciences (SCI) — 8 departments
            // ──────────────────────────────────────────────────────────────
            ['school_id' => $schools['SCI'], 'code' => 'MTH',  'name' => 'Mathematics Education'],
            ['school_id' => $schools['SCI'], 'code' => 'PHY',  'name' => 'Physics Education'],
            ['school_id' => $schools['SCI'], 'code' => 'CHM',  'name' => 'Chemistry Education'],
            ['school_id' => $schools['SCI'], 'code' => 'BIO',  'name' => 'Biology Education'],
            ['school_id' => $schools['SCI'], 'code' => 'INT',  'name' => 'Integrated Science Education'],
            ['school_id' => $schools['SCI'], 'code' => 'AGR',  'name' => 'Agricultural Science Education'],
            ['school_id' => $schools['SCI'], 'code' => 'CSC',  'name' => 'Computer Science Education'],
            ['school_id' => $schools['SCI'], 'code' => 'PHE',  'name' => 'Physical & Health Education'],

            // ──────────────────────────────────────────────────────────────
            // School of Arts & Social Sciences (SASS) — 7 departments
            // ──────────────────────────────────────────────────────────────
            ['school_id' => $schools['SASS'], 'code' => 'ECO',  'name' => 'Economics Education'],
            ['school_id' => $schools['SASS'], 'code' => 'GEO',  'name' => 'Geography Education'],
            ['school_id' => $schools['SASS'], 'code' => 'HIS',  'name' => 'History Education'],
            ['school_id' => $schools['SASS'], 'code' => 'CRS',  'name' => 'Christian Religious Studies'],
            ['school_id' => $schools['SASS'], 'code' => 'ISL',  'name' => 'Islamic Studies Education'],
            ['school_id' => $schools['SASS'], 'code' => 'SS',   'name' => 'Social Studies Education'],
            ['school_id' => $schools['SASS'], 'code' => 'POL',  'name' => 'Political Science Education'],

            // ──────────────────────────────────────────────────────────────
            // School of Languages (LANG) — 6 departments
            // ──────────────────────────────────────────────────────────────
            ['school_id' => $schools['LANG'], 'code' => 'ENG',  'name' => 'English Language Education'],
            ['school_id' => $schools['LANG'], 'code' => 'FRE',  'name' => 'French Language Education'],
            ['school_id' => $schools['LANG'], 'code' => 'HAU',  'name' => 'Hausa Language Education'],
            ['school_id' => $schools['LANG'], 'code' => 'ARA',  'name' => 'Arabic Language Education'],
            ['school_id' => $schools['LANG'], 'code' => 'IGB',  'name' => 'Igbo Language Education'],
            ['school_id' => $schools['LANG'], 'code' => 'YOR',  'name' => 'Yoruba Language Education'],

            // ──────────────────────────────────────────────────────────────
            // School of Education (SEDU) — 5 departments
            // ──────────────────────────────────────────────────────────────
            ['school_id' => $schools['SEDU'], 'code' => 'ECCE', 'name' => 'Early Childhood Care & Education'],
            ['school_id' => $schools['SEDU'], 'code' => 'PES',  'name' => 'Primary Education Studies'],
            ['school_id' => $schools['SEDU'], 'code' => 'GEDU', 'name' => 'General Education'],
            ['school_id' => $schools['SEDU'], 'code' => 'CINS', 'name' => 'Curriculum & Instruction'],
            ['school_id' => $schools['SEDU'], 'code' => 'EDPS', 'name' => 'Educational Psychology'],

            // ──────────────────────────────────────────────────────────────
            // School of Vocational & Technical Education (VTE) — 5 departments
            // ──────────────────────────────────────────────────────────────
            ['school_id' => $schools['VTE'], 'code' => 'BUS',  'name' => 'Business Education'],
            ['school_id' => $schools['VTE'], 'code' => 'FINE', 'name' => 'Fine & Applied Arts Education'],
            ['school_id' => $schools['VTE'], 'code' => 'HOME', 'name' => 'Home Economics Education'],
            ['school_id' => $schools['VTE'], 'code' => 'TECH', 'name' => 'Technical Education'],
            ['school_id' => $schools['VTE'], 'code' => 'AGRT', 'name' => 'Agricultural Technical Education'],

            // ──────────────────────────────────────────────────────────────
            // School of Early Childhood Care & Primary Education Studies (ECCPES) — 3 departments
            // ──────────────────────────────────────────────────────────────
            ['school_id' => $schools['ECCPES'], 'code' => 'BCE',  'name' => 'Basic & Special Education'],
            ['school_id' => $schools['ECCPES'], 'code' => 'ECCP', 'name' => 'Early Childhood Care Practice'],
            ['school_id' => $schools['ECCPES'], 'code' => 'PRIM', 'name' => 'Primary School Teaching Practice'],
        ];

        $now = now();
        foreach ($departments as &$dept) {
            $dept['is_active']   = true;
            $dept['created_at']  = $now;
            $dept['updated_at']  = $now;
        }
        unset($dept);

        DB::table('departments')->insert($departments);
    }
}
