import apiClient from './client';
import type {
    ApiResponse,
    PaginatedResponse,
    CreateCourseData,
    UpdateCourseData,
    CourseFilters,
    EnrollStudentData,
    BulkEnrollData,
    AssignLecturerData,
    EnrolledStudent,
    CourseLecturer,
} from '@/lib/types/api';
import type { Course } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Course Management API                                               */
/* ------------------------------------------------------------------ */

/**
 * List courses with search, filter, and pagination.
 * Role-aware: admin=all, lecturer=assigned, student=enrolled.
 */
export async function getCourses(filters: CourseFilters = {}): Promise<PaginatedResponse<Course>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiClient.get<PaginatedResponse<Course>>(`/courses?${params.toString()}`);
    return response.data;
}

/**
 * Get a single course by ID (includes lecturers).
 */
export async function getCourse(id: number): Promise<ApiResponse<{ course: Course }>> {
    const response = await apiClient.get<ApiResponse<{ course: Course }>>(`/courses/${id}`);
    return response.data;
}

/**
 * Create a new course.
 */
export async function createCourse(data: CreateCourseData): Promise<ApiResponse<{ course: Course }>> {
    const response = await apiClient.post<ApiResponse<{ course: Course }>>('/courses', data);
    return response.data;
}

/**
 * Update an existing course.
 */
export async function updateCourse(id: number, data: UpdateCourseData): Promise<ApiResponse<{ course: Course }>> {
    const response = await apiClient.put<ApiResponse<{ course: Course }>>(`/courses/${id}`, data);
    return response.data;
}

/**
 * Delete a course (soft delete).
 */
export async function deleteCourse(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/courses/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted course.
 */
export async function restoreCourse(id: number): Promise<ApiResponse<{ course: Course }>> {
    const response = await apiClient.post<ApiResponse<{ course: Course }>>(`/courses/${id}/restore`);
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Course Students (Enrollment)                                        */
/* ------------------------------------------------------------------ */

/**
 * Get enrolled students for a course.
 */
export async function getCourseStudents(
    courseId: number,
    filters: { search?: string; enrollment_status?: string; per_page?: number; page?: number } = {}
): Promise<PaginatedResponse<EnrolledStudent>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiClient.get<PaginatedResponse<EnrolledStudent>>(
        `/courses/${courseId}/students?${params.toString()}`
    );
    return response.data;
}

/**
 * Enroll a student in a course.
 */
export async function enrollStudent(courseId: number, data: EnrollStudentData): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post<ApiResponse<unknown>>(`/courses/${courseId}/enroll`, data);
    return response.data;
}

/**
 * Unenroll (drop) a student from a course.
 */
export async function unenrollStudent(courseId: number, studentId: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/courses/${courseId}/enroll/${studentId}`);
    return response.data;
}

/**
 * Bulk enroll multiple students.
 */
export async function bulkEnrollStudents(courseId: number, data: BulkEnrollData): Promise<ApiResponse<{
    enrolled: number;
    skipped: number;
    errors: Array<{ student_id: number; error: string }>;
}>> {
    const response = await apiClient.post<ApiResponse<{
        enrolled: number;
        skipped: number;
        errors: Array<{ student_id: number; error: string }>;
    }>>(`/courses/${courseId}/enroll/bulk`, data);
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Course Lecturers                                                    */
/* ------------------------------------------------------------------ */

/**
 * Get lecturers assigned to a course.
 */
export async function getCourseLecturers(courseId: number): Promise<ApiResponse<{ lecturers: CourseLecturer[] }>> {
    const response = await apiClient.get<ApiResponse<{ lecturers: CourseLecturer[] }>>(`/courses/${courseId}/lecturers`);
    return response.data;
}

/**
 * Assign a lecturer to a course.
 */
export async function assignLecturer(courseId: number, data: AssignLecturerData): Promise<ApiResponse<unknown>> {
    const response = await apiClient.post<ApiResponse<unknown>>(`/courses/${courseId}/lecturers`, data);
    return response.data;
}

/**
 * Unassign a lecturer from a course.
 */
export async function unassignLecturer(courseId: number, lecturerId: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/courses/${courseId}/lecturers/${lecturerId}`);
    return response.data;
}
