<?php

namespace App\Services\Department;

use App\Models\ActivityLog;
use App\Models\Department;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

class DepartmentService
{
    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Get a paginated, filterable list of departments.
     *
     * @param  array  $filters  Accepted keys: search, is_active, trashed, per_page, sort_by, sort_dir
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = Department::withCount('courses');

        // --- Include soft-deleted ---
        if (! empty($filters['trashed']) && $filters['trashed'] === 'only') {
            $query->onlyTrashed();
        } elseif (! empty($filters['trashed']) && $filters['trashed'] === 'with') {
            $query->withTrashed();
        }

        // --- Active status filter ---
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // --- Search (code, name) ---
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('name', 'LIKE', "%{$term}%")
                  ->orWhere('code', 'LIKE', "%{$term}%");
            });
        }

        // --- Sorting ---
        $sortBy = $filters['sort_by'] ?? 'name';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $allowedSorts = ['name', 'code', 'created_at', 'courses_count'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  All (non-paginated, for dropdowns)                                 */
    /* ------------------------------------------------------------------ */

    /**
     * Get all active departments (for frontend dropdowns).
     *
     * @return Collection
     */
    public function allActive(): Collection
    {
        return Department::active()
            ->orderBy('name')
            ->get(['id', 'code', 'name']);
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    /**
     * Find a department by ID.
     *
     * @param  int  $id
     * @return Department
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function find(int $id): Department
    {
        return Department::withCount('courses')->findOrFail($id);
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new department.
     *
     * @param  array  $data  Validated request data.
     * @param  User   $admin The admin performing the action.
     * @return Department
     */
    public function create(array $data, User $admin): Department
    {
        $department = Department::create([
            'code'        => strtoupper($data['code']),
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'is_active'   => $data['is_active'] ?? true,
        ]);

        $this->logActivity($admin, 'department_created', $department->id, newValues: [
            'code' => $department->code,
            'name' => $department->name,
        ]);

        return $department->loadCount('courses');
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Update an existing department.
     *
     * @param  Department  $department
     * @param  array       $data  Validated request data.
     * @param  User        $admin
     * @return Department
     */
    public function update(Department $department, array $data, User $admin): Department
    {
        $oldValues = $department->only(array_keys($data));

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $department->update($data);

        $this->logActivity($admin, 'department_updated', $department->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $department->fresh()->loadCount('courses');
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete a department.
     *
     * @param  Department  $department
     * @param  User        $admin
     * @return void
     *
     * @throws \RuntimeException If department has active courses.
     */
    public function delete(Department $department, User $admin): void
    {
        if ($department->courses()->where('is_active', true)->exists()) {
            throw new \RuntimeException(
                'Cannot delete a department that has active courses. Deactivate or reassign courses first.'
            );
        }

        $department->update(['is_active' => false]);
        $department->delete();

        $this->logActivity($admin, 'department_deleted', $department->id, oldValues: [
            'code' => $department->code,
            'name' => $department->name,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted department.
     *
     * @param  int   $id
     * @param  User  $admin
     * @return Department
     */
    public function restore(int $id, User $admin): Department
    {
        $department = Department::onlyTrashed()->findOrFail($id);
        $department->restore();
        $department->update(['is_active' => true]);

        $this->logActivity($admin, 'department_restored', $department->id);

        return $department->fresh()->loadCount('courses');
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private function logActivity(
        User $admin,
        string $action,
        int $entityId,
        array $oldValues = [],
        array $newValues = [],
    ): void {
        ActivityLog::log(
            action: $action,
            entityType: 'department',
            entityId: $entityId,
            extra: [
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata'   => ['admin_id' => $admin->id],
            ],
        );
    }
}
