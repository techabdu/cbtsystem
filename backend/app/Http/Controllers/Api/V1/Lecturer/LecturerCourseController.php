<?php

namespace App\Http\Controllers\Api\V1\Lecturer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LecturerCourseController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  GET /lecturer/my-courses                                            */
    /*  Return all courses assigned to the authenticated lecturer           */
    /* ------------------------------------------------------------------ */

    public function myCourses(Request $request): JsonResponse
    {
        $user = $request->user();

        $courses = $user->taughtCourses()
            ->with('department')
            ->withCount(['students', 'questions', 'exams'])
            ->orderBy('code')
            ->get();

        return ResponseHelper::success([
            'courses' => CourseResource::collection($courses),
            'total'   => $courses->count(),
        ]);
    }
}
