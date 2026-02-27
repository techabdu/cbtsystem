<?php

namespace App\Http\Controllers\Api\V1\Analytics;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Services\Analytics\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function __construct(
        private AnalyticsService $analyticsService
    ) {}

    /* ------------------------------------------------------------------ */
    /*  Student Performance                                                */
    /* ------------------------------------------------------------------ */

    /**
     * GET /api/v1/analytics/student/performance
     *
     * Returns the authenticated student's performance analytics.
     */
    public function studentPerformance(Request $request): JsonResponse
    {
        $data = $this->analyticsService->getStudentPerformance($request->user());
        return ResponseHelper::success($data, 'Student performance analytics retrieved.');
    }

    /* ------------------------------------------------------------------ */
    /*  Lecturer Dashboard                                                 */
    /* ------------------------------------------------------------------ */

    /**
     * GET /api/v1/analytics/lecturer/dashboard
     *
     * Returns dashboard analytics for the authenticated lecturer.
     */
    public function lecturerDashboard(Request $request): JsonResponse
    {
        $data = $this->analyticsService->getLecturerDashboard($request->user());
        return ResponseHelper::success($data, 'Lecturer dashboard analytics retrieved.');
    }

    /* ------------------------------------------------------------------ */
    /*  Course Analytics                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * GET /api/v1/analytics/courses/{id}
     *
     * Detailed analytics for a specific course (lecturer/admin).
     */
    public function courseAnalytics(Request $request, int $id): JsonResponse
    {
        $data = $this->analyticsService->getCourseAnalytics($id, $request->user());
        return ResponseHelper::success($data, 'Course analytics retrieved.');
    }

    /* ------------------------------------------------------------------ */
    /*  Exam Analytics                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * GET /api/v1/analytics/exams/{id}
     *
     * Detailed analytics for a specific exam (lecturer/admin).
     */
    public function examAnalytics(Request $request, int $id): JsonResponse
    {
        $data = $this->analyticsService->getExamAnalytics($id, $request->user());
        return ResponseHelper::success($data, 'Exam analytics retrieved.');
    }

    /* ------------------------------------------------------------------ */
    /*  System Analytics (Admin)                                            */
    /* ------------------------------------------------------------------ */

    /**
     * GET /api/v1/analytics/system
     *
     * System-wide analytics for admin dashboard.
     */
    public function systemAnalytics(Request $request): JsonResponse
    {
        $data = $this->analyticsService->getSystemAnalytics($request->user());
        return ResponseHelper::success($data, 'System analytics retrieved.');
    }
}
