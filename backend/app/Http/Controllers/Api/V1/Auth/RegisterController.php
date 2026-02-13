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
     * Auto-logs in the user after registration and returns a Sanctum token.
     *
     * POST /api/v1/auth/register
     */
    public function __invoke(RegisterRequest $request)
    {
        $user = $this->authService->register($request->validated());

        // Auto-login: issue a Sanctum token immediately
        $result = $this->authService->login(
            $request->validated('email'),
            $request->validated('password')
        );

        return ResponseHelper::success(
            data: [
                'user'       => new UserResource($result['user']),
                'token'      => $result['token'],
                'expires_in' => $result['expires_in'],
            ],
            message: 'Registration successful.',
            statusCode: 201
        );
    }
}
