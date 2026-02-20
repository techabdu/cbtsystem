<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\Api\V1\Auth\ActivateAccountController;
use App\Http\Controllers\Api\V1\Auth\LoginController;
use App\Http\Controllers\Api\V1\Auth\LogoutController;
use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\User\UserController;
use App\Http\Controllers\Api\V1\Department\DepartmentController;
use App\Http\Controllers\Api\V1\Course\CourseController;
use App\Http\Controllers\Api\V1\Course\EnrollmentController;
use App\Http\Controllers\Api\V1\Course\CourseLecturerController;
use App\Http\Controllers\Api\V1\Combination\CombinationController;
use App\Http\Controllers\Api\V1\Level\LevelController;
use App\Http\Controllers\Api\V1\StudentCourseController;

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
        Route::post('/activate', ActivateAccountController::class)->name('auth.activate');
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
        /*  Department Management                                           */
        /* -------------------------------------------------------------- */

        /* Active departments list (for dropdowns, any authenticated user) */
        Route::get('/departments/active', [DepartmentController::class, 'allActive'])->name('departments.active');

        /* Admin CRUD */
        Route::prefix('departments')->middleware('role:admin')->group(function () {
            Route::get('/', [DepartmentController::class, 'index'])->name('departments.index');
            Route::post('/', [DepartmentController::class, 'store'])->name('departments.store');
            Route::get('/{id}', [DepartmentController::class, 'show'])->name('departments.show');
            Route::put('/{id}', [DepartmentController::class, 'update'])->name('departments.update');
            Route::delete('/{id}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
            Route::post('/{id}/restore', [DepartmentController::class, 'restore'])->name('departments.restore');
        });

        /* -------------------------------------------------------------- */
        /*  Combination Management                                          */
        /* -------------------------------------------------------------- */

        /* Active combinations list (for dropdowns, any authenticated user) */
        Route::get('/combinations/active', [CombinationController::class, 'allActive'])->name('combinations.active');

        /* Admin CRUD */
        Route::prefix('combinations')->middleware('role:admin')->group(function () {
            Route::get('/', [CombinationController::class, 'index'])->name('combinations.index');
            Route::post('/', [CombinationController::class, 'store'])->name('combinations.store');
            Route::get('/{id}', [CombinationController::class, 'show'])->name('combinations.show');
            Route::put('/{id}', [CombinationController::class, 'update'])->name('combinations.update');
            Route::delete('/{id}', [CombinationController::class, 'destroy'])->name('combinations.destroy');
            Route::post('/{id}/restore', [CombinationController::class, 'restore'])->name('combinations.restore');
        });

        /* -------------------------------------------------------------- */
        /*  Level Management                                                */
        /* -------------------------------------------------------------- */

        /* Active levels list (for dropdowns, any authenticated user) */
        Route::get('/levels/active', [LevelController::class, 'allActive'])->name('levels.active');

        /* Admin CRUD */
        Route::prefix('levels')->middleware('role:admin')->group(function () {
            Route::get('/', [LevelController::class, 'index'])->name('levels.index');
            Route::post('/', [LevelController::class, 'store'])->name('levels.store');
            Route::get('/{id}', [LevelController::class, 'show'])->name('levels.show');
            Route::put('/{id}', [LevelController::class, 'update'])->name('levels.update');
            Route::delete('/{id}', [LevelController::class, 'destroy'])->name('levels.destroy');
            Route::post('/{id}/restore', [LevelController::class, 'restore'])->name('levels.restore');
        });

        /* -------------------------------------------------------------- */
        /*  Course Management                                              */
        /* -------------------------------------------------------------- */

        /* Course listing — all roles (role-aware: admin=all, lecturer=assigned, student=enrolled) */
        Route::get('/courses', [CourseController::class, 'index'])->name('courses.index');
        Route::get('/courses/{id}', [CourseController::class, 'show'])->name('courses.show');

        /* Course CRUD — Admin Only */
        Route::prefix('courses')->middleware('role:admin')->group(function () {
            Route::post('/', [CourseController::class, 'store'])->name('courses.store');
            Route::put('/{id}', [CourseController::class, 'update'])->name('courses.update');
            Route::delete('/{id}', [CourseController::class, 'destroy'])->name('courses.destroy');
            Route::post('/{id}/restore', [CourseController::class, 'restore'])->name('courses.restore');
        });

        /* Course sub-resources — Admin & Lecturer */
        Route::prefix('courses')->middleware('role:admin,lecturer')->group(function () {
            Route::get('/{id}/students', [CourseController::class, 'students'])->name('courses.students');
            Route::get('/{id}/lecturers', [CourseController::class, 'lecturers'])->name('courses.lecturers');
        });

        /* Enrollment management — Admin Only */
        Route::prefix('courses')->middleware('role:admin')->group(function () {
            Route::post('/{id}/enroll', [EnrollmentController::class, 'enroll'])->name('courses.enroll');
            Route::delete('/{id}/enroll/{studentId}', [EnrollmentController::class, 'unenroll'])->name('courses.unenroll');
            Route::post('/{id}/enroll/bulk', [EnrollmentController::class, 'bulkEnroll'])->name('courses.enroll.bulk');
        });

        /* Lecturer assignment — Admin Only */
        Route::prefix('courses')->middleware('role:admin')->group(function () {
            Route::post('/{id}/lecturers', [CourseLecturerController::class, 'assign'])->name('courses.lecturers.assign');
            Route::delete('/{id}/lecturers/{lecturerId}', [CourseLecturerController::class, 'unassign'])->name('courses.lecturers.unassign');
        });

        /* -------------------------------------------------------------- */
        /*  Student Course Enrollment                                       */
        /* -------------------------------------------------------------- */
        Route::prefix('student/courses')->middleware('role:student')->group(function () {
            Route::get('/available', [StudentCourseController::class, 'availableCourses'])->name('student.courses.available');
            Route::get('/enrolled', [StudentCourseController::class, 'myCourses'])->name('student.courses.enrolled');
            Route::post('/enroll', [StudentCourseController::class, 'enroll'])->name('student.courses.enroll');
            Route::post('/unenroll', [StudentCourseController::class, 'unenroll'])->name('student.courses.unenroll');
        });

        // --- Future routes will be added here ---
        // Route::prefix('questions')->group(function () { ... });
        // Route::prefix('exams')->group(function () { ... });
        // Route::prefix('exam-sessions')->group(function () { ... });
    });
});
