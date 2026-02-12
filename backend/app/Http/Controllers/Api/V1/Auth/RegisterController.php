<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;

class RegisterController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    /**
     * Handle student self-registration.
     *
     * POST /api/v1/auth/register
     */
    public function __invoke(RegisterRequest $request)
    {
        $user = $this->authService->register($request->validated());

        return ResponseHelper::success(
            data: ['user' => new UserResource($user)],
            message: 'Registration successful. Please verify your email.',
            statusCode: 201
        );
    }
}
