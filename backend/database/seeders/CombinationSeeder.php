<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Department;

class CombinationSeeder extends Seeder
{
    /**
     * Seed sample combinations.
     */
    public function run(): void
    {
        // Get department IDs by code
        $deptIds = Department::pluck('id', 'code'); // ['CS' => 1, 'MTH' => 2, ...]

        // Helper to get ID safely
        $getId = fn($code) => $deptIds[$code] ?? null;

        $combinations = [
            [
                'code' => 'CS/MTH',
                'name' => 'Computer Science / Mathematics',
                'first_dept' => 'CS',
                'second_dept' => 'MTH',
            ],
            [
                'code' => 'PHY/MTH',
                'name' => 'Physics / Mathematics',
                'first_dept' => 'PHY',
                'second_dept' => 'MTH',
            ],
            [
                'code' => 'BIO/PHY',
                'name' => 'Biology / Physics',
                'first_dept' => 'BIO',
                'second_dept' => 'PHY',
            ],
            [
                'code' => 'BUS/DM', // Business Education Double Major
                'name' => 'Business Education (Double Major)',
                'first_dept' => 'BUS',
                'second_dept' => 'BUS',
            ],
        ];

        $dataToInsert = [];
        $now = now();

        foreach ($combinations as $combo) {
            $firstId = $getId($combo['first_dept']);
            $secondId = $getId($combo['second_dept']);

            if ($firstId && $secondId) {
                // Check if already exists to prevent duplicate key errors on re-seed
                $exists = DB::table('combinations')
                            ->where('code', $combo['code'])
                            ->exists();

                if (! $exists) {
                    $dataToInsert[] = [
                        'code' => $combo['code'],
                        'name' => $combo['name'],
                        'first_department_id' => $firstId,
                        'second_department_id' => $secondId,
                        'is_double_major' => ($firstId === $secondId),
                        'is_active' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }
            }
        }

        if (! empty($dataToInsert)) {
            DB::table('combinations')->insert($dataToInsert);
        }
    }
}
