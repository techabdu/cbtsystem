<?php

namespace App\Services\User;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Hash;

class UserService
{
    /* ------------------------------------------------------------------ */
    /*  List / Search / Filter                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Get a paginated, filterable, searchable list of users.
     *
     * @param  array  $filters  Accepted keys: role, search, is_active, per_page, trashed
     * @return LengthAwarePaginator
     */
    public function list(array $filters = []): LengthAwarePaginator
    {
        $query = User::query();

        // --- Role filter ---
        if (! empty($filters['role'])) {
            $query->where('role', $filters['role']);
        }

        // --- Active status filter ---
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        // --- Include soft-deleted ---
        if (! empty($filters['trashed']) && $filters['trashed'] === 'only') {
            $query->onlyTrashed();
        } elseif (! empty($filters['trashed']) && $filters['trashed'] === 'with') {
            $query->withTrashed();
        }

        // --- Search (name, email, student_id, staff_id) ---
        if (! empty($filters['search'])) {
            $term = $filters['search'];
            $query->where(function ($q) use ($term) {
                $q->where('first_name', 'LIKE', "%{$term}%")
                  ->orWhere('last_name', 'LIKE', "%{$term}%")
                  ->orWhere('email', 'LIKE', "%{$term}%")
                  ->orWhere('student_id', 'LIKE', "%{$term}%")
                  ->orWhere('staff_id', 'LIKE', "%{$term}%");
            });
        }

        // --- Sorting ---
        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';
        $allowedSorts = ['created_at', 'first_name', 'last_name', 'email', 'role'];
        if (in_array($sortBy, $allowedSorts, true)) {
            $query->orderBy($sortBy, $sortDir === 'asc' ? 'asc' : 'desc');
        }

        $perPage = min((int) ($filters['per_page'] ?? 20), 100);

        return $query->paginate($perPage);
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    /**
     * Find a user by ID (including soft-deleted for admin view).
     *
     * @param  int  $id
     * @return User
     *
     * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
     */
    public function find(int $id): User
    {
        return User::withTrashed()->findOrFail($id);
    }

    /* ------------------------------------------------------------------ */
    /*  Create                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Admin creates a new user (lecturer or admin).
     *
     * @param  array  $data  Validated request data.
     * @param  User   $admin The admin performing the action.
     * @return User
     */
    public function create(array $data, User $admin): User
    {
        $user = User::create([
            'first_name'  => $data['first_name'],
            'last_name'   => $data['last_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'email'       => $data['email'],
            'password'    => $data['password'], // 'hashed' cast handles bcrypt
            'role'        => $data['role'],
            'staff_id'    => $data['staff_id'] ?? null,
            'student_id'  => $data['student_id'] ?? null,
            'phone'       => $data['phone'] ?? null,
            'is_active'   => $data['is_active'] ?? true,
            'is_verified' => $data['is_verified'] ?? false,
        ]);

        $this->logActivity(
            admin: $admin,
            action: 'user_created',
            entityId: $user->id,
            newValues: ['email' => $user->email, 'role' => $user->role],
        );

        return $user;
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Admin updates an existing user.
     *
     * @param  User   $user  The user to update.
     * @param  array  $data  Validated request data.
     * @param  User   $admin The admin performing the action.
     * @return User
     */
    public function update(User $user, array $data, User $admin): User
    {
        $oldValues = $user->only(array_keys($data));

        // Hash password only if it is provided
        if (! empty($data['password'])) {
            $data['password'] = $data['password']; // 'hashed' cast handles it
        } else {
            unset($data['password']);
        }

        $user->update($data);

        $this->logActivity(
            admin: $admin,
            action: 'user_updated',
            entityId: $user->id,
            oldValues: $oldValues,
            newValues: $data,
        );

        return $user->fresh();
    }

    /* ------------------------------------------------------------------ */
    /*  Soft Delete                                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete (deactivate) a user.
     *
     * @param  User  $user  The user to soft-delete.
     * @param  User  $admin The admin performing the action.
     * @return void
     *
     * @throws \RuntimeException If admin tries to delete themselves.
     */
    public function delete(User $user, User $admin): void
    {
        if ($user->id === $admin->id) {
            throw new \RuntimeException('You cannot delete your own account.');
        }

        $user->update(['is_active' => false]);
        $user->delete(); // soft-delete

        $this->logActivity(
            admin: $admin,
            action: 'user_deleted',
            entityId: $user->id,
            oldValues: ['email' => $user->email, 'role' => $user->role],
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted user.
     *
     * @param  int   $id
     * @param  User  $admin
     * @return User
     */
    public function restore(int $id, User $admin): User
    {
        $user = User::onlyTrashed()->findOrFail($id);
        $user->restore();
        $user->update(['is_active' => true]);

        $this->logActivity(
            admin: $admin,
            action: 'user_restored',
            entityId: $user->id,
        );

        return $user->fresh();
    }

    /* ------------------------------------------------------------------ */
    /*  Toggle Active Status                                               */
    /* ------------------------------------------------------------------ */

    /**
     * Toggle the is_active flag on a user.
     *
     * @param  User  $user
     * @param  User  $admin
     * @return User
     */
    public function toggleActive(User $user, User $admin): User
    {
        if ($user->id === $admin->id) {
            throw new \RuntimeException('You cannot deactivate your own account.');
        }

        $user->update(['is_active' => ! $user->is_active]);

        $this->logActivity(
            admin: $admin,
            action: $user->is_active ? 'user_activated' : 'user_deactivated',
            entityId: $user->id,
        );

        return $user->fresh();
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Log an admin action on a user entity.
     */
    private function logActivity(
        User $admin,
        string $action,
        int $entityId,
        array $oldValues = [],
        array $newValues = [],
    ): void {
        ActivityLog::log(
            action: $action,
            entityType: 'user',
            entityId: $entityId,
            extra: [
                'admin_id'   => $admin->id,
                'old_values' => $oldValues,
                'new_values' => $newValues,
            ],
        );
    }
}
