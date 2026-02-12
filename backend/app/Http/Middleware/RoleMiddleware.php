<?php

namespace App\Http\Middleware;

use App\Helpers\ResponseHelper;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle role-based access control.
     *
     * Usage in routes:
     *   ->middleware('role:admin')
     *   ->middleware('role:admin,lecturer')
     *   ->middleware('role:student')
     *
     * @param  Request  $request
     * @param  Closure  $next
     * @param  string   ...$roles  Allowed roles
     * @return Response
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            return ResponseHelper::error(
                message: 'Unauthorized',
                statusCode: 401,
                errorCode: 'AUTH_REQUIRED'
            );
        }

        if (! in_array($user->role, $roles, true)) {
            return ResponseHelper::error(
                message: 'Forbidden — Insufficient permissions',
                statusCode: 403,
                errorCode: 'INSUFFICIENT_PERMISSIONS'
            );
        }

        return $next($request);
    }
}
