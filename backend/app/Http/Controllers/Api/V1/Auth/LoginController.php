<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    /**
     * Handle user login and return a Sanctum token.
     *
     * POST /api/v1/auth/login
     */
    public function __invoke(LoginRequest $request)
    {
        try {
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
                message: 'Login successful'
            );
        } catch (ValidationException $e) {
            return ResponseHelper::error(
                message: $e->getMessage(),
                statusCode: 401,
                errors: $e->errors(),
                errorCode: 'AUTH_FAILED'
            );
        }
    }
}
