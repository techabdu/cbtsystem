import client from './client';
import {
    PaginatedResponse,
    StudentCourseFilters,
    ApiResponse,
    AvailableCoursesResponse
} from '@/lib/types/api';
import { Course } from '@/lib/types/models';

/**
 * Get available courses for the student based on their combination.
 */
export const getAvailableCourses = async (filters?: StudentCourseFilters): Promise<AvailableCoursesResponse> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                params.append(key, String(value));
            }
        });
    }
    const response = await client.get<AvailableCoursesResponse>(`/student/courses/available?${params.toString()}`);
    return response.data;
};

/**
 * Get courses the student is currently enrolled in.
 */
export const getEnrolledCourses = async (filters?: StudentCourseFilters): Promise<PaginatedResponse<Course>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                params.append(key, String(value));
            }
        });
    }
    const response = await client.get<PaginatedResponse<Course>>(`/student/courses/enrolled?${params.toString()}`);
    return response.data;
};

/**
 * Enroll in a course.
 */
export const enrollInCourse = async (courseId: number): Promise<ApiResponse> => {
    const response = await client.post<ApiResponse>('/student/courses/enroll', { course_id: courseId });
    return response.data;
};

/**
 * Unenroll from a course.
 */
export const unenrollFromCourse = async (courseId: number): Promise<ApiResponse> => {
    const response = await client.post<ApiResponse>('/student/courses/unenroll', { course_id: courseId });
    return response.data;
};
