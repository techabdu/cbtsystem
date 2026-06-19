<?php

namespace App\Services\Level;
use App\Exceptions\BusinessRuleException;

use App\Models\ActivityLog;
use App\Models\Level;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class LevelService
{
    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Get a paginated, filterable list of levels.
     *
     * @param  array  $filters  Accepted keys: search, is_active, trashed, per_page, sort_by, sort_dir
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = Level::withCount(['students', 'courses']);

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
        $sortBy = $filters['sort_by'] ?? 'numeric_order';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $allowedSorts = ['name', 'code', 'numeric_order', 'created_at', 'students_count', 'courses_count'];

        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  All Active (non-paginated, for dropdowns)                         */
    /* ------------------------------------------------------------------ */

    /**
     * Get all active levels ordered by numeric_order (for frontend dropdowns).
     *
     * @return Collection
     */
    public function allActive(): Collection
    {
        return Cache::remember('levels.active', 3600, fn () =>
            Level::active()
                ->ordered()
                ->get()
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                              */
    /* ------------------------------------------------------------------ */

    /**
     * Find a level by ID.
     *
     * @param  int  $id
     * @return Level
     */
    public function find(int $id): Level
    {
        return Level::withCount(['students', 'courses'])
                    ->findOrFail($id);
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new level.
     *
     * @param  array  $data  Validated request data.
     * @param  User   $admin The admin performing the action.
     * @return Level
     */
    public function create(array $data, User $admin): Level
    {
        $level = Level::create([
            'code'          => strtoupper($data['code']),
            'name'          => $data['name'],
            'numeric_order' => $data['numeric_order'],
            'is_active'     => $data['is_active'] ?? true,
        ]);

        $this->logActivity($admin, 'level_created', $level->id, newValues: [
            'code' => $level->code,
            'name' => $level->name,
        ]);

        return $level;
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Update an existing level.
     *
     * @param  Level  $level
     * @param  array  $data  Validated request data.
     * @param  User   $admin
     * @return Level
     */
    public function update(Level $level, array $data, User $admin): Level
    {
        $oldValues = $level->only(array_keys($data));

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $level->update($data);

        $this->logActivity($admin, 'level_updated', $level->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $level->fresh();
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete a level.
     *
     * @param  Level  $level
     * @param  User   $admin
     * @return void
     *
     * @throws \RuntimeException If level has active students assigned.
     */
    public function delete(Level $level, User $admin): void
    {
        if ($level->students()->where('is_active', true)->exists()) {
            throw new BusinessRuleException(
                'Cannot delete a level that has active students assigned. Reassign students first.'
            );
        }

        $level->update(['is_active' => false]);

        $this->logActivity($admin, 'level_deleted', $level->id, oldValues: [
            'code' => $level->code,
            'name' => $level->name,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted level.
     *
     * @param  int   $id
     * @param  User  $admin
     * @return Level
     */
    public function restore(int $id, User $admin): Level
    {
        $level = Level::findOrFail($id);
        $level->update(['is_active' => true]);

        $this->logActivity($admin, 'level_restored', $level->id);

        return $level->fresh();
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
            entityType: 'level',
            entityId: $entityId,
            extra: [
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata'   => ['admin_id' => $admin->id],
            ],
        );
    }
}
