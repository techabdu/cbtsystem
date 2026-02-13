<?php

namespace App\Http\Controllers\Api\V1\User;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\CreateUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Services\User\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(
        private UserService $userService
    ) {}

    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/users                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * List users with search, filter, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $paginator = $this->userService->list($request->only([
            'role', 'search', 'is_active', 'per_page', 'trashed', 'sort_by', 'sort_dir',
        ]));

        return ResponseHelper::paginated(
            paginator: $paginator,
            message: 'Users retrieved successfully',
            resourceClass: UserResource::class,
        );
    }

    /* ------------------------------------------------------------------ */
    /*  POST /api/v1/users                                                 */
    /* ------------------------------------------------------------------ */

    /**
     * Create a new user (admin creates lecturers/admins/students).
     */
    public function store(CreateUserRequest $request): JsonResponse
    {
        $user = $this->userService->create(
            data: $request->validated(),
            admin: $request->user(),
        );

        return ResponseHelper::success(
            data: ['user' => new UserResource($user)],
            message: 'User created successfully',
            statusCode: 201,
        );
    }

    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/users/{id}                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Show a single user.
     */
    public function show(int $id): JsonResponse
    {
        $user = $this->userService->find($id);

        return ResponseHelper::success(
            data: ['user' => new UserResource($user)],
            message: 'User retrieved successfully',
        );
    }

    /* ------------------------------------------------------------------ */
    /*  PUT /api/v1/users/{id}                                             */
    /* ------------------------------------------------------------------ */

    /**
     * Update a user.
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        $user = $this->userService->find($id);

        $updated = $this->userService->update(
            user: $user,
            data: $request->validated(),
            admin: $request->user(),
        );

        return ResponseHelper::success(
            data: ['user' => new UserResource($updated)],
            message: 'User updated successfully',
        );
    }

    /* ------------------------------------------------------------------ */
    /*  DELETE /api/v1/users/{id}                                          */
    /* ------------------------------------------------------------------ */

    /**
     * Soft-delete a user.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $user = $this->userService->find($id);

        try {
            $this->userService->delete(
                user: $user,
                admin: $request->user(),
            );
        } catch (\RuntimeException $e) {
            return ResponseHelper::error(
                message: $e->getMessage(),
                statusCode: 422,
                errorCode: 'SELF_DELETE',
            );
        }

        return ResponseHelper::success(
            message: 'User deleted successfully',
        );
    }

    /* ------------------------------------------------------------------ */
    /*  POST /api/v1/users/{id}/restore                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Restore a soft-deleted user.
     */
    public function restore(Request $request, int $id): JsonResponse
    {
        $user = $this->userService->restore($id, $request->user());

        return ResponseHelper::success(
            data: ['user' => new UserResource($user)],
            message: 'User restored successfully',
        );
    }

    /* ------------------------------------------------------------------ */
    /*  PATCH /api/v1/users/{id}/toggle-active                             */
    /* ------------------------------------------------------------------ */

    /**
     * Toggle a user's active status.
     */
    public function toggleActive(Request $request, int $id): JsonResponse
    {
        $user = $this->userService->find($id);

        try {
            $updated = $this->userService->toggleActive(
                user: $user,
                admin: $request->user(),
            );
        } catch (\RuntimeException $e) {
            return ResponseHelper::error(
                message: $e->getMessage(),
                statusCode: 422,
                errorCode: 'SELF_DEACTIVATE',
            );
        }

        return ResponseHelper::success(
            data: ['user' => new UserResource($updated)],
            message: $updated->is_active ? 'User activated successfully' : 'User deactivated successfully',
        );
    }
}
