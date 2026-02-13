<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    /**
     * Return the currently authenticated user.
     *
     * GET /api/v1/auth/me
     */
    public function me(Request $request)
    {
        $user = $request->user()->load('department');

        return ResponseHelper::success(
            data: ['user' => new UserResource($user)]
        );
    }

    /**
     * Update the authenticated user's profile.
     *
     * PUT /api/v1/auth/profile
     */
    public function updateProfile(UpdateProfileRequest $request)
    {
        $user = $request->user();
        $user->update($request->validated());

        return ResponseHelper::success(
            data: ['user' => new UserResource($user->fresh())],
            message: 'Profile updated successfully'
        );
    }

    /**
     * Rotate the current Sanctum token (token refresh).
     *
     * POST /api/v1/auth/refresh
     */
    public function refresh(Request $request)
    {
        $result = $this->authService->refresh($request->user());

        return ResponseHelper::success(
            data: [
                'user'       => new UserResource($request->user()),
                'token'      => $result['token'],
                'expires_in' => $result['expires_in'],
            ],
            message: 'Token refreshed successfully'
        );
    }
}

