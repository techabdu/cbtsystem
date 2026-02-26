<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchoolSeeder extends Seeder
{
    /**
     * Seed FCT College of Education, Zuba — 6 real schools.
     */
    public function run(): void
    {
        $schools = [
            [
                'uuid'        => Str::uuid()->toString(),
                'code'        => 'SCI',
                'name'        => 'School of Sciences',
                'description' => 'Trains educators in the natural and applied sciences — Mathematics, Physics, Chemistry, Biology, Integrated Science, Agricultural Science, Computer Science, and Physical & Health Education.',
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'uuid'        => Str::uuid()->toString(),
                'code'        => 'SASS',
                'name'        => 'School of Arts & Social Sciences',
                'description' => 'Trains educators in Economics, Geography, History, Social Studies, Political Science, Christian Religious Studies, and Islamic Studies.',
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'uuid'        => Str::uuid()->toString(),
                'code'        => 'LANG',
                'name'        => 'School of Languages',
                'description' => 'Trains educators in English, French, Hausa, Arabic, Igbo, and Yoruba language education.',
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'uuid'        => Str::uuid()->toString(),
                'code'        => 'SEDU',
                'name'        => 'School of Education',
                'description' => 'Provides foundational teacher education: Early Childhood Care, Primary Education, Curriculum & Instruction, Educational Psychology, and General Education.',
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'uuid'        => Str::uuid()->toString(),
                'code'        => 'VTE',
                'name'        => 'School of Vocational & Technical Education',
                'description' => 'Trains educators in Business, Fine & Applied Arts, Home Economics, Technical, and Agricultural Technical Education — emphasizing practical skills.',
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
            [
                'uuid'        => Str::uuid()->toString(),
                'code'        => 'ECCPES',
                'name'        => 'School of Early Childhood Care & Primary Education Studies',
                'description' => 'Specialised school for early childhood education practitioners and primary school educators including Basic & Special Education.',
                'is_active'   => true,
                'created_at'  => now(),
                'updated_at'  => now(),
            ],
        ];

        DB::table('schools')->insert($schools);
    }
}
