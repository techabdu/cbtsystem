import apiClient from './client';
import { ApiResponse, HodAssignCourseData, HodAssignment } from '@/lib/types/api';
import { User, Course } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  HOD — Course-Lecturer Assignment API                               */
/* ------------------------------------------------------------------ */

/** Get all lecturers in the HOD's department */
export async function getHodLecturers(): Promise<ApiResponse<{ lecturers: User[]; department_id: number }>> {
    const response = await apiClient.get('/hod/department-lecturers');
    return response.data;
}

/** Get all courses in the HOD's department */
export async function getHodCourses(): Promise<ApiResponse<{ courses: Course[]; department_id: number }>> {
    const response = await apiClient.get('/hod/department-courses');
    return response.data;
}

/** Get all course-lecturer assignments in the HOD's department */
export async function getHodAssignments(): Promise<ApiResponse<{ courses: HodAssignment[]; department_id: number }>> {
    const response = await apiClient.get('/hod/assignments');
    return response.data;
}

/** Assign a lecturer to a course */
export async function hodAssignCourse(data: HodAssignCourseData): Promise<ApiResponse<{ assignment: unknown }>> {
    const response = await apiClient.post('/hod/assign-course', data);
    return response.data;
}

/** Unassign a lecturer from a course */
export async function hodUnassignCourse(lecturerId: number, courseId: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete(`/hod/unassign-course/${lecturerId}/${courseId}`);
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Lecturer — Own Courses API                                         */
/* ------------------------------------------------------------------ */

/** Get courses assigned to the current lecturer */
export async function getLecturerMyCourses(): Promise<ApiResponse<{ courses: Course[]; total: number }>> {
    const response = await apiClient.get('/lecturer/my-courses');
    return response.data;
}
