<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ExamAccessCodeSeeder extends Seeder
{
    /**
     * Seed one exam access code per student (first semester, 2025/2026 academic year).
     * Access code format: 8 random uppercase alphanumeric characters.
     */
    public function run(): void
    {
        $students = DB::table('users')
            ->where('role', 'student')
            ->where('is_active', true)
            ->pluck('id');

        $now    = now();
        $codes  = [];
        $usedCodes = [];

        foreach ($students as $studentId) {
            // Generate a unique 8-char code
            do {
                $code = strtoupper(Str::random(4) . '-' . Str::random(4));
            } while (in_array($code, $usedCodes));

            $usedCodes[] = $code;

            $codes[] = [
                'student_id'    => $studentId,
                'access_code'   => $code,
                'semester'      => 'first',
                'academic_year' => '2025/2026',
                'is_active'     => true,
                'activated_at'  => $now,
                'expires_at'    => now()->addMonths(6),
                'created_at'    => $now,
                'updated_at'    => $now,
            ];
        }

        foreach (array_chunk($codes, 50) as $chunk) {
            DB::table('exam_access_codes')->insert($chunk);
        }
    }
}
