<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\Level;
use Illuminate\Database\Seeder;

class LevelSeeder extends Seeder
{
    /**
     * Seed default academic levels and back-fill existing courses.
     *
     * Handles both fresh installs and existing data (updates
     * existing levels with numeric_order and proper code format).
     */
    public function run(): void
    {
        $levels = [
            ['code' => '100L', 'name' => '100 Level', 'numeric_order' => 1, 'description' => 'Year 1 / NCE 1'],
            ['code' => '200L', 'name' => '200 Level', 'numeric_order' => 2, 'description' => 'Year 2 / NCE 2'],
            ['code' => '300L', 'name' => '300 Level', 'numeric_order' => 3, 'description' => 'Year 3 / NCE 3'],
            ['code' => '400L', 'name' => '400 Level', 'numeric_order' => 4, 'description' => 'Year 4'],
            ['code' => '500L', 'name' => '500 Level', 'numeric_order' => 5, 'description' => 'Year 5'],
            ['code' => '600L', 'name' => '600 Level', 'numeric_order' => 6, 'description' => 'Year 6'],
        ];

        foreach ($levels as $level) {
            // Try to find by the new code (e.g. '100L')
            $existing = Level::withTrashed()->where('code', $level['code'])->first();

            if ($existing) {
                // Update with numeric_order if missing
                $existing->update(array_filter([
                    'name'          => $level['name'],
                    'numeric_order' => $level['numeric_order'],
                    'description'   => $level['description'],
                ]));
                continue;
            }

            // Try to find by legacy code (e.g. '100' without 'L')
            $legacyCode = str_replace('L', '', $level['code']);
            $legacy = Level::withTrashed()->where('code', $legacyCode)->first();

            if ($legacy) {
                // Update legacy record: rename code and add numeric_order
                $legacy->update([
                    'code'          => $level['code'],
                    'name'          => $level['name'],
                    'numeric_order' => $level['numeric_order'],
                    'description'   => $level['description'],
                    'is_active'     => true,
                ]);
                continue;
            }

            // Create new
            Level::create($level);
        }

        $this->command->info('✅ 6 default levels seeded/updated.');

        // --- Back-fill existing courses that have a string `level` but no `level_id` ---
        $this->backfillCourseLevels();
    }

    /**
     * Convert existing courses.level string (e.g. '100L') to level_id FK.
     */
    private function backfillCourseLevels(): void
    {
        $coursesToFix = Course::whereNotNull('level')
                              ->whereNull('level_id')
                              ->get();

        if ($coursesToFix->isEmpty()) {
            $this->command->info('   No courses need level back-fill.');
            return;
        }

        $levelMap = Level::pluck('id', 'code'); // ['100L' => 1, '200L' => 2, ...]

        $updated = 0;
        foreach ($coursesToFix as $course) {
            $levelId = $levelMap[$course->level] ?? null;
            if ($levelId) {
                $course->update(['level_id' => $levelId]);
                $updated++;
            }
        }

        $this->command->info("   ✅ Back-filled {$updated} course(s) with level_id.");
    }
}
