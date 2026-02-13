<?php

namespace App\Http\Controllers\Api\V1\Course;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\Course\CreateCourseRequest;
use App\Http\Requests\Course\UpdateCourseRequest;
use App\Http\Resources\CourseResource;
use App\Services\Course\CourseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function __construct(
        private readonly CourseService $courseService,
    ) {}

    /* ------------------------------------------------------------------ */
    /*  List (paginated)                                                   */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Role-based: lecturers see only their courses, students see enrolled courses
        if ($user->role === 'lecturer') {
            $courses = $this->courseService->listForLecturer($user, $request->all());
        } elseif ($user->role === 'student') {
            $courses = $this->courseService->listForStudent($user, $request->all());
        } else {
            $courses = $this->courseService->list($request->all());
        }

        return ResponseHelper::paginated($courses, 'Courses retrieved', CourseResource::class);
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    public function show(int $id): JsonResponse
    {
        $course = $this->courseService->find($id);

        // Load lecturers for the detail view
        $course->load('lecturers');

        return ResponseHelper::success([
            'course' => new CourseResource($course),
        ], 'Course retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                              */
    /* ------------------------------------------------------------------ */

    public function store(CreateCourseRequest $request): JsonResponse
    {
        $course = $this->courseService->create(
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'course' => new CourseResource($course),
        ], 'Course created successfully', 201);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    public function update(UpdateCourseRequest $request, int $id): JsonResponse
    {
        $course = $this->courseService->find($id);

        $course = $this->courseService->update(
            $course,
            $request->validated(),
            $request->user(),
        );

        return ResponseHelper::success([
            'course' => new CourseResource($course),
        ], 'Course updated successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Delete                                                             */
    /* ------------------------------------------------------------------ */

    public function destroy(int $id): JsonResponse
    {
        $course = $this->courseService->find($id);

        try {
            $this->courseService->delete($course, auth()->user());
        } catch (\RuntimeException $e) {
            return ResponseHelper::error($e->getMessage(), 422);
        }

        return ResponseHelper::success(null, 'Course deleted successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    public function restore(Request $request, int $id): JsonResponse
    {
        $course = $this->courseService->restore($id, $request->user());

        return ResponseHelper::success([
            'course' => new CourseResource($course),
        ], 'Course restored successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Students — list enrolled students                                  */
    /* ------------------------------------------------------------------ */

    public function students(Request $request, int $id): JsonResponse
    {
        $course = $this->courseService->find($id);
        $students = $this->courseService->getStudents($course, $request->all());

        return ResponseHelper::paginated($students, 'Enrolled students retrieved');
    }

    /* ------------------------------------------------------------------ */
    /*  Lecturers — list assigned lecturers                                */
    /* ------------------------------------------------------------------ */

    public function lecturers(int $id): JsonResponse
    {
        $course = $this->courseService->find($id);
        $lecturers = $this->courseService->getLecturers($course);

        $data = $lecturers->map(fn($lecturer) => [
            'id'        => $lecturer->id,
            'full_name' => $lecturer->full_name,
            'email'     => $lecturer->email,
            'staff_id'  => $lecturer->staff_id,
            'role'      => $lecturer->pivot->role,
        ]);

        return ResponseHelper::success([
            'lecturers' => $data,
        ], 'Course lecturers retrieved');
    }
}
