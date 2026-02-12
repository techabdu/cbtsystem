<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Auth\AuthService;
use Illuminate\Http\Request;

class LogoutController extends Controller
{
    public function __construct(
        private readonly AuthService $authService
    ) {}

    /**
     * Invalidate the current token.
     *
     * POST /api/v1/auth/logout
     */
    public function __invoke(Request $request)
    {
        $this->authService->logout($request->user());

        return ResponseHelper::success(
            message: 'Logout successful'
        );
    }
}
