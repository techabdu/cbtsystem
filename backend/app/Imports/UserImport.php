<?php

namespace App\Imports;

use App\Models\Combination;
use App\Models\Department;
use App\Models\Level;
use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class UserImport implements ToCollection, WithHeadingRow
{
    /** @var array<int, array{row: int, message: string}> */
    private array $errors = [];

    private int $created = 0;
    private int $skipped = 0;

    /**
     * Process the spreadsheet rows as a collection.
     *
     * @param  Collection  $rows
     */
    public function collection(Collection $rows): void
    {
        // Row 1 is the heading row — actual data starts at row 2
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2; // offset for heading row

            $this->processRow($row->toArray(), $rowNumber);
        }
    }

    /**
     * Process a single row: validate, look up references, create user.
     *
     * @param  array<string, mixed>  $row
     */
    private function processRow(array $row, int $rowNumber): void
    {
        // Normalize keys (WithHeadingRow lowercases + snake_cases them)
        $fullName        = trim((string) ($row['full_name']        ?? ''));
        $identifier      = trim((string) ($row['identifier']       ?? ''));
        $email           = trim((string) ($row['email']            ?? ''));
        $role            = strtolower(trim((string) ($row['role']  ?? '')));
        $combinationCode = strtoupper(trim((string) ($row['combination_code'] ?? '')));
        $levelCode       = strtoupper(trim((string) ($row['level_code']       ?? '')));
        $departmentCode  = strtoupper(trim((string) ($row['department_code']  ?? '')));
        $phone           = trim((string) ($row['phone']            ?? ''));

        // ---- Required field validation ----
        if (empty($fullName)) {
            $this->errors[] = ['row' => $rowNumber, 'message' => 'Full Name is required.'];
            $this->skipped++;
            return;
        }

        if (empty($identifier)) {
            $this->errors[] = ['row' => $rowNumber, 'message' => 'Identifier is required.'];
            $this->skipped++;
            return;
        }

        if (! in_array($role, ['student', 'lecturer'], true)) {
            $this->errors[] = ['row' => $rowNumber, 'message' => "Invalid role '{$role}'. Must be 'student' or 'lecturer'."];
            $this->skipped++;
            return;
        }

        // ---- Email validation if provided ----
        if (! empty($email) && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->errors[] = ['row' => $rowNumber, 'message' => "Invalid email address: {$email}."];
            $this->skipped++;
            return;
        }

        // ---- Check for duplicate identifier (student_id or staff_id) ----
        $idColumn = ($role === 'student') ? 'student_id' : 'staff_id';
        if (User::withTrashed()->where($idColumn, $identifier)->exists()) {
            $this->errors[] = ['row' => $rowNumber, 'message' => "Identifier '{$identifier}' already exists (skipped)."];
            $this->skipped++;
            return;
        }

        // ---- Check for duplicate email if provided ----
        if (! empty($email) && User::withTrashed()->where('email', $email)->exists()) {
            $this->errors[] = ['row' => $rowNumber, 'message' => "Email '{$email}' already exists (skipped)."];
            $this->skipped++;
            return;
        }

        // ---- Role-specific reference lookups ----
        $combinationId = null;
        $levelId       = null;
        $departmentId  = null;
        $schoolId      = null;

        if ($role === 'student') {
            // Look up combination by code, auto-derive school from its first department
            if (! empty($combinationCode)) {
                $combination = Combination::with('firstDepartment')
                    ->whereRaw('UPPER(code) = ?', [$combinationCode])
                    ->first();

                if (! $combination) {
                    $this->errors[] = ['row' => $rowNumber, 'message' => "Combination code '{$combinationCode}' not found (skipped)."];
                    $this->skipped++;
                    return;
                }

                $combinationId = $combination->id;

                // Auto-derive school from the combination's first department
                if ($combination->firstDepartment) {
                    $schoolId = $combination->firstDepartment->school_id;
                }
            }

            // Look up level by code
            if (! empty($levelCode)) {
                $level = Level::whereRaw('UPPER(code) = ?', [$levelCode])->first();

                if (! $level) {
                    $this->errors[] = ['row' => $rowNumber, 'message' => "Level code '{$levelCode}' not found (skipped)."];
                    $this->skipped++;
                    return;
                }

                $levelId = $level->id;
            }
        }

        if ($role === 'lecturer') {
            // Look up department by code, auto-derive school
            if (! empty($departmentCode)) {
                $department = Department::whereRaw('UPPER(code) = ?', [$departmentCode])->first();

                if (! $department) {
                    $this->errors[] = ['row' => $rowNumber, 'message' => "Department code '{$departmentCode}' not found (skipped)."];
                    $this->skipped++;
                    return;
                }

                $departmentId = $department->id;
                $schoolId     = $department->school_id;
            }
        }

        // ---- Parse full name into parts ----
        $nameParts  = explode(' ', $fullName, 3);
        $firstName  = $nameParts[0] ?? '';
        $lastName   = $nameParts[1] ?? $nameParts[0]; // fallback to first if no last
        $middleName = $nameParts[2] ?? null;

        // ---- Create user ----
        try {
            User::create([
                'first_name'     => $firstName,
                'last_name'      => $lastName,
                'middle_name'    => $middleName,
                'email'          => ! empty($email) ? strtolower($email) : strtolower($identifier) . '@placeholder.local',
                'password'       => null, // user activates via /auth/activate
                'role'           => $role,
                $idColumn        => $identifier,
                'combination_id' => $combinationId,
                'level_id'       => $levelId,
                'department_id'  => $departmentId,
                'school_id'      => $schoolId,
                'phone'          => ! empty($phone) ? $phone : null,
                'is_active'      => false,
                'is_verified'    => false,
            ]);

            $this->created++;
        } catch (\Throwable $e) {
            $this->errors[] = ['row' => $rowNumber, 'message' => "Failed to create user: {$e->getMessage()}"];
            $this->skipped++;
        }
    }

    /**
     * Get import results summary.
     *
     * @return array{created: int, skipped: int, errors: array<int, array{row: int, message: string}>}
     */
    public function getResults(): array
    {
        return [
            'created' => $this->created,
            'skipped' => $this->skipped,
            'errors'  => $this->errors,
        ];
    }
}
