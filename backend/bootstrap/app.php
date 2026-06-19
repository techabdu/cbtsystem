<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use Illuminate\Auth\AuthenticationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register custom middleware aliases
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
        ]);

        // Sanctum stateful middleware for SPA authentication
        $middleware->statefulApi();

        // Apply security headers to all API responses
        $middleware->appendToGroup('api', [
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        // Use Redis for rate limiting when available
        if (env('CACHE_STORE', env('CACHE_DRIVER', 'file')) === 'redis') {
            $middleware->throttleWithRedis();
        }
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Return JSON for API authentication failures (instead of redirect)
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Unauthenticated — please log in.',
                    'error_code' => 'AUTH_REQUIRED',
                    'meta'       => ['timestamp' => now()->toIso8601String()],
                ], 401);
            }
        });

        // Return JSON for authorization (policy / Gate) failures. Laravel's
        // prepareException() converts AuthorizationException into Symfony's
        // AccessDeniedHttpException before render callbacks run, so we match the
        // post-conversion type (same reason the 404 handler below works).
        $exceptions->render(function (\Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success'    => false,
                    'message'    => $e->getMessage() ?: 'This action is unauthorized.',
                    'error_code' => 'FORBIDDEN',
                    'meta'       => ['timestamp' => now()->toIso8601String()],
                ], 403);
            }
        });

        // Business-rule violations are thrown by the service layer as
        // App\Exceptions\BusinessRuleException. Convert them to a clean 422
        // envelope so they never surface as raw 500s — covering every
        // controller, including those without an explicit try/catch.
        // (A dedicated type is used rather than the broad \RuntimeException so
        // framework exceptions like ThrottleRequestsException / HttpException
        // are never accidentally intercepted.)
        $exceptions->render(function (\App\Exceptions\BusinessRuleException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success'    => false,
                    'message'    => $e->getMessage() ?: 'The request could not be processed.',
                    'error_code' => 'BUSINESS_RULE_VIOLATION',
                    'meta'       => ['timestamp' => now()->toIso8601String()],
                ], 422);
            }
        });

        // Return JSON for API 404s
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Resource not found.',
                    'error_code' => 'NOT_FOUND',
                    'meta'       => ['timestamp' => now()->toIso8601String()],
                ], 404);
            }
        });

        // Return JSON for API 405 Method Not Allowed
        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'success'    => false,
                    'message'    => 'Method not allowed.',
                    'error_code' => 'METHOD_NOT_ALLOWED',
                    'meta'       => ['timestamp' => now()->toIso8601String()],
                ], 405);
            }
        });
    })->create();
