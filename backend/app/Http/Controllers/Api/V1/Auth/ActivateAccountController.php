<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ActivateAccountRequest;
use App\Http\Resources\UserResource;
use App\Services\Auth\AuthService;
use Illuminate\Validation\ValidationException;

class ActivateAccountController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    /**
     * Handle first-time account activation.
     * User enters their matric/file number and creates a password.
     *
     * POST /api/v1/auth/activate
     */
    public function __invoke(ActivateAccountRequest $request)
    {
        try {
            $result = $this->authService->activate(
                $request->validated('identifier'),
                $request->validated('password')
            );

            return ResponseHelper::success(
                data: [
                    'user'       => new UserResource($result['user']),
                    'token'      => $result['token'],
                    'expires_in' => $result['expires_in'],
                ],
                message: 'Account activated successfully. Welcome!',
                statusCode: 200
            );
        } catch (ValidationException $e) {
            return ResponseHelper::error(
                message: $e->getMessage(),
                statusCode: 422,
                errors: $e->errors(),
                errorCode: 'ACTIVATION_FAILED'
            );
        }
    }
}
