<?php

namespace App\Services\School;

use App\Models\ActivityLog;
use App\Models\School;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;

class SchoolService
{
    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter                                             */
    /* ------------------------------------------------------------------ */

    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = School::withCount('departments');

        if (! empty($filters['trashed']) && $filters['trashed'] === 'only') {
            $query->onlyTrashed();
        } elseif (! empty($filters['trashed']) && $filters['trashed'] === 'with') {
            $query->withTrashed();
        }

        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('name', 'LIKE', "%{$term}%")
                  ->orWhere('code', 'LIKE', "%{$term}%");
            });
        }

        $sortBy  = $filters['sort_by']  ?? 'name';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $allowedSorts = ['name', 'code', 'created_at', 'departments_count'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'desc' ? 'desc' : 'asc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  All (non-paginated, for dropdowns)                                 */
    /* ------------------------------------------------------------------ */

    public function allActive(): Collection
    {
        return Cache::remember('schools.active', 3600, fn () =>
            School::orderBy('name')->get(['id', 'code', 'name'])
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    public function find(int $id): School
    {
        return School::withCount('departments')->findOrFail($id);
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                             */
    /* ------------------------------------------------------------------ */

    public function create(array $data, User $admin): School
    {
        $school = School::create([
            'code' => strtoupper($data['code']),
            'name' => $data['name'],
        ]);

        $this->logActivity($admin, 'school_created', $school->id, newValues: [
            'code' => $school->code,
            'name' => $school->name,
        ]);

        return $school->loadCount('departments');
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    public function update(School $school, array $data, User $admin): School
    {
        $oldValues = $school->only(array_keys($data));

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $school->update($data);

        $this->logActivity($admin, 'school_updated', $school->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $school->fresh()->loadCount('departments');
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    public function delete(School $school, User $admin): void
    {
        if ($school->departments()->exists()) {
            throw new \RuntimeException(
                'Cannot delete a school that has departments. Remove or reassign departments first.'
            );
        }

        $school->delete();

        $this->logActivity($admin, 'school_deleted', $school->id, oldValues: [
            'code' => $school->code,
            'name' => $school->name,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    public function restore(int $id, User $admin): School
    {
        $school = School::onlyTrashed()->findOrFail($id);
        $school->restore();

        $this->logActivity($admin, 'school_restored', $school->id);

        return $school->fresh()->loadCount('departments');
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
            entityType: 'school',
            entityId: $entityId,
            extra: [
                'old_values' => $oldValues,
                'new_values' => $newValues,
                'metadata'   => ['admin_id' => $admin->id],
            ],
        );
    }
}
