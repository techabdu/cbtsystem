<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SchoolSeeder extends Seeder
{
    public function run(): void
    {
        $schools = [
            [
                'uuid' => Str::uuid()->toString(),
                'name' => 'School of Sciences',
                'code' => 'SCI',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'name' => 'School of Engineering',
                'code' => 'SENG',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'name' => 'School of Business',
                'code' => 'SBUS',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ];

        DB::table('schools')->insert($schools);
    }
}
