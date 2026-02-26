<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CombinationSeeder extends Seeder
{
    /**
     * Seed FCT COE Zuba NCE subject combinations.
     * NCE students study two subjects (first + second department).
     * Double Majors study one subject deeply (first_dept = second_dept).
     */
    public function run(): void
    {
        $d = DB::table('departments')->pluck('id', 'code');
        $now = now();

        // Helper: builds a combination record
        $combo = function (string $code, string $name, string $d1, string $d2) use ($d, $now) {
            if (! isset($d[$d1]) || ! isset($d[$d2])) {
                return null; // Skip if department doesn't exist
            }
            return [
                'code'                 => $code,
                'name'                 => $name,
                'first_department_id'  => $d[$d1],
                'second_department_id' => $d[$d2],
                'is_double_major'      => ($d[$d1] === $d[$d2]),
                'is_active'            => true,
                'created_at'           => $now,
                'updated_at'           => $now,
            ];
        };

        $combinations = array_filter([
            // ── School of Sciences combinations ────────────────────────────
            $combo('MTH/PHY',  'Mathematics / Physics',                          'MTH', 'PHY'),
            $combo('MTH/CHM',  'Mathematics / Chemistry',                        'MTH', 'CHM'),
            $combo('MTH/CSC',  'Mathematics / Computer Science',                 'MTH', 'CSC'),
            $combo('BIO/CHM',  'Biology / Chemistry',                            'BIO', 'CHM'),
            $combo('BIO/PHY',  'Biology / Physics',                              'BIO', 'PHY'),
            $combo('BIO/INT',  'Biology / Integrated Science',                   'BIO', 'INT'),
            $combo('CHM/PHY',  'Chemistry / Physics',                            'CHM', 'PHY'),
            $combo('CHM/INT',  'Chemistry / Integrated Science',                 'CHM', 'INT'),
            $combo('CSC/PHY',  'Computer Science / Physics',                     'CSC', 'PHY'),
            $combo('AGR/BIO',  'Agricultural Science / Biology',                 'AGR', 'BIO'),
            $combo('PHE/DM',   'Physical & Health Education (Double Major)',      'PHE', 'PHE'),

            // ── School of Arts & Social Sciences combinations ──────────────
            $combo('ECO/SS',   'Economics / Social Studies',                     'ECO', 'SS'),
            $combo('GEO/SS',   'Geography / Social Studies',                     'GEO', 'SS'),
            $combo('HIS/SS',   'History / Social Studies',                       'HIS', 'SS'),
            $combo('CRS/SS',   'Christian Religious Studies / Social Studies',   'CRS', 'SS'),
            $combo('CRS/HIS',  'Christian Religious Studies / History',          'CRS', 'HIS'),
            $combo('ISL/ARA',  'Islamic Studies / Arabic',                       'ISL', 'ARA'),

            // ── School of Languages combinations ───────────────────────────
            $combo('ENG/FRE',  'English / French',                               'ENG', 'FRE'),
            $combo('ENG/HIS',  'English / History',                              'ENG', 'HIS'),
            $combo('ENG/SS',   'English / Social Studies',                       'ENG', 'SS'),
            $combo('ENG/CRS',  'English / Christian Religious Studies',          'ENG', 'CRS'),
            $combo('ARA/ISL',  'Arabic / Islamic Studies',                       'ARA', 'ISL'),
            $combo('ARA/HAU',  'Arabic / Hausa',                                 'ARA', 'HAU'),
            $combo('ARA/HIS',  'Arabic / History',                               'ARA', 'HIS'),
            $combo('ARA/SS',   'Arabic / Social Studies',                        'ARA', 'SS'),
            $combo('IGB/ENG',  'Igbo / English',                                 'IGB', 'ENG'),
            $combo('HAU/ISL',  'Hausa / Islamic Studies',                        'HAU', 'ISL'),

            // ── School of Vocational & Technical Education combinations ─────
            $combo('BUS/DM',   'Business Education (Double Major)',               'BUS', 'BUS'),
            $combo('HOME/DM',  'Home Economics Education (Double Major)',         'HOME', 'HOME'),
            $combo('FINE/DM',  'Fine & Applied Arts Education (Double Major)',    'FINE', 'FINE'),
            $combo('TECH/DM',  'Technical Education (Double Major)',              'TECH', 'TECH'),

            // ── School of Education combinations ───────────────────────────
            $combo('ECCE/DM',  'Early Childhood Care & Education (Double Major)', 'ECCE', 'ECCE'),
            $combo('PES/DM',   'Primary Education Studies (Double Major)',         'PES',  'PES'),
        ]);

        if (! empty($combinations)) {
            DB::table('combinations')->insert(array_values($combinations));
        }
    }
}
