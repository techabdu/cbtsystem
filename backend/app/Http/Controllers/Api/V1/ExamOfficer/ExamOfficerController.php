<?php

namespace App\Http\Controllers\Api\V1\ExamOfficer;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Resources\ExamResource;
use App\Models\Exam;
use App\Models\Department;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamOfficerController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/officer/department-exams                               */
    /* ------------------------------------------------------------------ */

    /**
     * Return all exams for the authenticated user's department.
     *
     * Requires the `is_department_exam_officer` flag to be true.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function departmentExams(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isDepartmentExamOfficer()) {
            return ResponseHelper::error(
                'Access denied. You are not a Department Exam Officer.',
                403
            );
        }

        if (! $user->department_id) {
            return ResponseHelper::error(
                'Your account is not assigned to a department.',
                422
            );
        }

        $perPage = min((int) ($request->per_page ?? 20), 100);

        // Get all exams for courses in this department
        $paginator = Exam::query()
            ->whereHas('course', fn ($q) => $q->where('department_id', $user->department_id))
            ->with(['course', 'creator'])
            ->withCount('examQuestions')
            ->latest()
            ->paginate($perPage);

        return ResponseHelper::paginated(
            paginator: $paginator,
            message: 'Department exams retrieved successfully.',
            resourceClass: ExamResource::class,
        );
    }

    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/officer/school-exams                                   */
    /* ------------------------------------------------------------------ */

    /**
     * Return all exams for all departments in the authenticated user's school.
     *
     * Requires the `is_school_exam_officer` flag to be true.
     *
     * @param  Request  $request
     * @return JsonResponse
     */
    public function schoolExams(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->isSchoolExamOfficer()) {
            return ResponseHelper::error(
                'Access denied. You are not a School Exam Officer.',
                403
            );
        }

        // Resolve school_id via the user's department relationship
        $schoolId = $user->school_id ?? optional($user->department)->school_id;

        if (! $schoolId) {
            return ResponseHelper::error(
                'Your account is not associated with a school.',
                422
            );
        }

        $perPage = min((int) ($request->per_page ?? 20), 100);

        // Get department IDs for this school
        $departmentIds = Department::where('school_id', $schoolId)->pluck('id');

        // Get all exams for courses in departments of this school
        $paginator = Exam::query()
            ->whereHas('course', fn ($q) => $q->whereIn('department_id', $departmentIds))
            ->with(['course', 'creator'])
            ->withCount('examQuestions')
            ->latest()
            ->paginate($perPage);

        return ResponseHelper::paginated(
            paginator: $paginator,
            message: 'School exams retrieved successfully.',
            resourceClass: ExamResource::class,
        );
    }
}
