import apiClient from './client';
import {
    ApiResponse,
    StudentPerformanceData,
    LecturerDashboardData,
    CourseAnalyticsData,
    ExamAnalyticsData,
    SystemAnalyticsData,
} from '@/lib/types/api';

/* ------------------------------------------------------------------ */
/*  Student Analytics                                                    */
/* ------------------------------------------------------------------ */

/**
 * Get the authenticated student's performance analytics.
 */
export async function getStudentPerformance(): Promise<ApiResponse<StudentPerformanceData>> {
    const response = await apiClient.get<ApiResponse<StudentPerformanceData>>(
        '/analytics/student/performance'
    );
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Lecturer Analytics                                                   */
/* ------------------------------------------------------------------ */

/**
 * Get lecturer dashboard analytics (courses, questions, exams, students).
 */
export async function getLecturerDashboard(): Promise<ApiResponse<LecturerDashboardData>> {
    const response = await apiClient.get<ApiResponse<LecturerDashboardData>>(
        '/analytics/lecturer/dashboard'
    );
    return response.data;
}

/**
 * Get detailed analytics for a specific course.
 */
export async function getCourseAnalytics(courseId: string): Promise<ApiResponse<CourseAnalyticsData>> {
    const response = await apiClient.get<ApiResponse<CourseAnalyticsData>>(
        `/analytics/courses/${courseId}`
    );
    return response.data;
}

/**
 * Get detailed analytics for a specific exam, including per-question analysis.
 */
export async function getExamAnalytics(examId: string): Promise<ApiResponse<ExamAnalyticsData>> {
    const response = await apiClient.get<ApiResponse<ExamAnalyticsData>>(
        `/analytics/exams/${examId}`
    );
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Admin Analytics                                                      */
/* ------------------------------------------------------------------ */

/**
 * Get system-wide analytics for admin dashboard.
 */
export async function getSystemAnalytics(): Promise<ApiResponse<SystemAnalyticsData>> {
    const response = await apiClient.get<ApiResponse<SystemAnalyticsData>>(
        '/analytics/system'
    );
    return response.data;
}
