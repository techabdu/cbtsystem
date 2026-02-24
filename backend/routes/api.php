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
use App\Http\Controllers\Api\V1\Question\QuestionController;
use App\Http\Controllers\Api\V1\Hod\HodController;
use App\Http\Controllers\Api\V1\Lecturer\LecturerCourseController;
use App\Http\Controllers\Api\V1\Exam\ExamController;
use App\Http\Controllers\Api\V1\Exam\StudentExamController;
use App\Http\Controllers\Api\V1\Exam\PracticeExamController;
use App\Http\Controllers\Api\V1\Notification\NotificationController;
use App\Http\Controllers\Api\V1\ExamSession\OfflineEntryController;
use App\Http\Controllers\Api\V1\ExamSession\ExamSessionController;

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
    /*  Offline Exam Entry — Public (no auth required)                     */
    /* ------------------------------------------------------------------ */
    Route::post('/offline-exams/start', [OfflineEntryController::class, 'start'])->name('offline-exams.start');

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

        /* -------------------------------------------------------------- */
        /*  Question Bank — Admin & Lecturer                               */
        /* -------------------------------------------------------------- */
        Route::prefix('questions')->middleware('role:admin,lecturer')->group(function () {
            Route::get('/', [QuestionController::class, 'index'])->name('questions.index');
            Route::get('/stats', [QuestionController::class, 'stats'])->name('questions.stats');
            Route::post('/', [QuestionController::class, 'store'])->name('questions.store');
            Route::post('/bulk-upload', [QuestionController::class, 'bulkUpload'])->name('questions.bulk-upload');
            Route::get('/{id}', [QuestionController::class, 'show'])->name('questions.show');
            Route::put('/{id}', [QuestionController::class, 'update'])->name('questions.update');
            Route::delete('/{id}', [QuestionController::class, 'destroy'])->name('questions.destroy');
            Route::post('/{id}/restore', [QuestionController::class, 'restore'])->name('questions.restore');
            Route::patch('/{id}/verify', [QuestionController::class, 'verify'])->name('questions.verify');
        });

        /* -------------------------------------------------------------- */
        /*  HOD Course Assignment — Lecturer with is_hod flag              */
        /* -------------------------------------------------------------- */
        Route::prefix('hod')->middleware('role:lecturer')->group(function () {
            Route::get('/department-lecturers', [HodController::class, 'departmentLecturers'])->name('hod.lecturers');
            Route::get('/department-courses', [HodController::class, 'departmentCourses'])->name('hod.courses');
            Route::get('/assignments', [HodController::class, 'assignments'])->name('hod.assignments');
            Route::post('/assign-course', [HodController::class, 'assignCourse'])->name('hod.assign');
            Route::delete('/unassign-course/{lecturerId}/{courseId}', [HodController::class, 'unassignCourse'])->name('hod.unassign');
        });

        /* -------------------------------------------------------------- */
        /*  Lecturer — Own Course Management                               */
        /* -------------------------------------------------------------- */
        Route::prefix('lecturer')->middleware('role:lecturer')->group(function () {
            Route::get('/my-courses', [LecturerCourseController::class, 'myCourses'])->name('lecturer.my-courses');
        });

        /* -------------------------------------------------------------- */
        /*  Exam Management — Admin & Lecturer                             */
        /* -------------------------------------------------------------- */
        Route::prefix('exams')->middleware('role:admin,lecturer')->group(function () {
            Route::get('/', [ExamController::class, 'index'])->name('exams.index');
            Route::get('/stats', [ExamController::class, 'stats'])->name('exams.stats');
            Route::post('/', [ExamController::class, 'store'])->name('exams.store');
            Route::get('/{id}', [ExamController::class, 'show'])->name('exams.show');
            Route::put('/{id}', [ExamController::class, 'update'])->name('exams.update');
            Route::delete('/{id}', [ExamController::class, 'destroy'])->name('exams.destroy');
            Route::post('/{id}/restore', [ExamController::class, 'restore'])->name('exams.restore');
            Route::post('/{id}/questions', [ExamController::class, 'addQuestions'])->name('exams.questions.add');
            Route::delete('/{id}/questions/{questionId}', [ExamController::class, 'removeQuestion'])->name('exams.questions.remove');
            Route::post('/{id}/submit-for-review', [ExamController::class, 'submitForReview'])->name('exams.submit-for-review');
            Route::post('/{id}/verify', [ExamController::class, 'verifyExam'])->name('exams.verify');
            Route::post('/{id}/reject', [ExamController::class, 'rejectExam'])->name('exams.reject');
            Route::post('/{id}/publish', [ExamController::class, 'publish'])->name('exams.publish');
            Route::get('/{id}/results', [ExamController::class, 'results'])->name('exams.results');
        });

        /* -------------------------------------------------------------- */
        /*  Student Exam Viewing                                           */
        /* -------------------------------------------------------------- */
        Route::prefix('student/exams')->middleware('role:student')->group(function () {
            Route::get('/', [StudentExamController::class, 'index'])->name('student.exams.index');
            Route::get('/{id}', [StudentExamController::class, 'show'])->name('student.exams.show');
        });

        /* -------------------------------------------------------------- */
        /*  Student Practice Exams                                         */
        /* -------------------------------------------------------------- */
        Route::prefix('student/practice-exams')->middleware('role:student')->group(function () {
            Route::get('/', [PracticeExamController::class, 'index'])->name('student.practice.index');
            Route::get('/{id}', [PracticeExamController::class, 'show'])->name('student.practice.show');
            Route::post('/{id}/submit', [PracticeExamController::class, 'submit'])->name('student.practice.submit');
        });

        /* -------------------------------------------------------------- */
        /*  Notifications — All authenticated users                        */
        /* -------------------------------------------------------------- */
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
            Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unread-count');
            Route::patch('/{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.mark-read');
            Route::patch('/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.mark-all-read');
            Route::delete('/{id}', [NotificationController::class, 'destroy'])->name('notifications.destroy');
        });

        /* -------------------------------------------------------------- */
        /*  Exam Sessions — Active exam taking                             */
        /* -------------------------------------------------------------- */
        Route::prefix('exam-sessions')->group(function () {
            Route::get('/{id}/status', [ExamSessionController::class, 'status'])->name('exam-sessions.status');
            Route::get('/{id}/questions', [ExamSessionController::class, 'questions'])->name('exam-sessions.questions');
            Route::get('/{id}/questions/{index}', [ExamSessionController::class, 'question'])->name('exam-sessions.question');
            Route::post('/{id}/answers', [ExamSessionController::class, 'saveAnswer'])->name('exam-sessions.save-answer');
            Route::post('/{id}/answers/batch', [ExamSessionController::class, 'saveAnswersBatch'])->name('exam-sessions.save-answers-batch');
            Route::post('/{id}/flag', [ExamSessionController::class, 'toggleFlag'])->name('exam-sessions.toggle-flag');
            Route::post('/{id}/submit', [ExamSessionController::class, 'submit'])->name('exam-sessions.submit');
        });
    });
});
