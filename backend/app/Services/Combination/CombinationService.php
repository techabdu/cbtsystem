<?php

namespace App\Services\Combination;

use App\Models\ActivityLog;
use App\Models\Combination;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class CombinationService
{
    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Get a paginated, filterable list of combinations.
     *
     * @param  array  $filters  Accepted keys: search, is_active, trashed, per_page, sort_by, sort_dir
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = Combination::with(['firstDepartment', 'secondDepartment'])
                            ->withCount('students');

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
        $allowedSorts = ['name', 'code', 'created_at', 'students_count'];
        
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  All (non-paginated, for dropdowns)                                */
    /* ------------------------------------------------------------------ */

    /**
     * Get all active combinations (for frontend dropdowns).
     *
     * @return Collection
     */
    public function allActive(): Collection
    {
        return Cache::remember('combinations.active', 3600, fn () =>
            Combination::active()
                ->with(['firstDepartment:id,code,name', 'secondDepartment:id,code,name'])
                ->orderBy('name')
                ->get(['id', 'code', 'name', 'first_department_id', 'second_department_id'])
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Find a combination by ID.
     *
     * @param  int  $id
     * @return Combination
     */
    public function find(int $id): Combination
    {
        return Combination::with(['firstDepartment', 'secondDepartment'])
                          ->withCount('students')
                          ->findOrFail($id);
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new combination.
     *
     * @param  array  $data  Validated request data.
     * @param  User   $admin The admin performing the action.
     * @return Combination
     */
    public function create(array $data, User $admin): Combination
    {
        // Detect double major if both departments are same
        $data['is_double_major'] = $data['first_department_id'] === $data['second_department_id'];

        $combination = Combination::create([
            'code'                 => strtoupper($data['code']),
            'name'                 => $data['name'],
            'first_department_id'  => $data['first_department_id'],
            'second_department_id' => $data['second_department_id'],
            'is_double_major'      => $data['is_double_major'],
            'is_active'            => $data['is_active'] ?? true,
        ]);

        $this->logActivity($admin, 'combination_created', $combination->id, newValues: [
            'code' => $combination->code,
            'name' => $combination->name,
        ]);

        return $combination->load(['firstDepartment', 'secondDepartment']);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Update an existing combination.
     *
     * @param  Combination  $combination
     * @param  array        $data  Validated request data.
     * @param  User         $admin
     * @return Combination
     */
    public function update(Combination $combination, array $data, User $admin): Combination
    {
        $oldValues = $combination->only(array_keys($data));

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }
        
        if (isset($data['first_department_id']) && isset($data['second_department_id'])) {
             $data['is_double_major'] = $data['first_department_id'] === $data['second_department_id'];
        }

        $combination->update($data);

        $this->logActivity($admin, 'combination_updated', $combination->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $combination->fresh()->load(['firstDepartment', 'secondDepartment']);
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete a combination.
     *
     * @param  Combination  $combination
     * @param  User         $admin
     * @return void
     *
     * @throws \RuntimeException If combination has active students.
     */
    public function delete(Combination $combination, User $admin): void
    {
        if ($combination->students()->where('is_active', true)->exists()) {
            throw new \RuntimeException(
                'Cannot delete a combination that has active students assigned. Reassign students first.'
            );
        }

        $combination->update(['is_active' => false]);
        $combination->delete();

        $this->logActivity($admin, 'combination_deleted', $combination->id, oldValues: [
            'code' => $combination->code,
            'name' => $combination->name,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted combination.
     *
     * @param  int   $id
     * @param  User  $admin
     * @return Combination
     */
    public function restore(int $id, User $admin): Combination
    {
        $combination = Combination::onlyTrashed()->findOrFail($id);
        $combination->restore();
        $combination->update(['is_active' => true]);

        $this->logActivity($admin, 'combination_restored', $combination->id);

        return $combination->fresh()->load(['firstDepartment', 'secondDepartment']);
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                           */
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
            entityType: 'combination',
            entityId: $entityId,
            extra: [
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata'   => ['admin_id' => $admin->id],
            ],
        );
    }
}
