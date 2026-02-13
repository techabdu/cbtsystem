<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\V1\Auth\RegisterController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\User\UserController;
use App\Http\Controllers\Api\V1\Department\DepartmentController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api automatically by Laravel.
| We add /v1 for API versioning.
|
*/

Route::prefix('v1')->group(function () {

    /* ------------------------------------------------------------------ */
    /*  Authentication — Public Routes                                     */
    /* ------------------------------------------------------------------ */
    Route::prefix('auth')->group(function () {
        Route::post('/register', RegisterController::class)->name('auth.register');
        Route::post('/login', LoginController::class)->name('auth.login');
    });

    /* ------------------------------------------------------------------ */
    /*  Authentication — Protected Routes                                  */
    /* ------------------------------------------------------------------ */
    Route::middleware('auth:sanctum')->group(function () {

        // Auth routes
        Route::prefix('auth')->group(function () {
            Route::post('/logout', LogoutController::class)->name('auth.logout');
            Route::get('/me', [AuthController::class, 'me'])->name('auth.me');
            Route::put('/profile', [AuthController::class, 'updateProfile'])->name('auth.profile.update');
            Route::post('/refresh', [AuthController::class, 'refresh'])->name('auth.refresh');
        });

        /* -------------------------------------------------------------- */
        /*  User Management — Admin Only                                   */
        /* -------------------------------------------------------------- */
        Route::prefix('users')->middleware('role:admin')->group(function () {
            Route::get('/', [UserController::class, 'index'])->name('users.index');
            Route::post('/', [UserController::class, 'store'])->name('users.store');
            Route::get('/{id}', [UserController::class, 'show'])->name('users.show');
            Route::put('/{id}', [UserController::class, 'update'])->name('users.update');
            Route::delete('/{id}', [UserController::class, 'destroy'])->name('users.destroy');
            Route::post('/{id}/restore', [UserController::class, 'restore'])->name('users.restore');
            Route::patch('/{id}/toggle-active', [UserController::class, 'toggleActive'])->name('users.toggle-active');
        });

        /* -------------------------------------------------------------- */
        /*  Department Management — Admin CRUD                              */
        /* -------------------------------------------------------------- */
        Route::prefix('departments')->middleware('role:admin')->group(function () {
            Route::get('/', [DepartmentController::class, 'index'])->name('departments.index');
            Route::post('/', [DepartmentController::class, 'store'])->name('departments.store');
            Route::get('/{id}', [DepartmentController::class, 'show'])->name('departments.show');
            Route::put('/{id}', [DepartmentController::class, 'update'])->name('departments.update');
            Route::delete('/{id}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
        });

        /* Active departments list (for dropdowns, any authenticated user) */
        Route::get('/departments/active', [DepartmentController::class, 'allActive'])->name('departments.active');

        // --- Future routes will be added here ---
        // Route::prefix('courses')->group(function () { ... });
        // Route::prefix('questions')->group(function () { ... });
        // Route::prefix('exams')->group(function () { ... });
        // Route::prefix('exam-sessions')->group(function () { ... });
    });
});
