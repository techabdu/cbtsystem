import apiClient from './client';
import type { PaginatedResponse } from '@/lib/types/api';
import type { Exam } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Exam Officer API                                                    */
/* ------------------------------------------------------------------ */

export interface OfficerExamFilters {
    search?: string;
    status?: string;
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

/**
 * Fetch all exams in the authenticated officer's department.
 * Requires is_department_exam_officer = true on the lecturer.
 */
export async function getDepartmentExams(
    filters: OfficerExamFilters = {}
): Promise<PaginatedResponse<Exam>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            params.append(key, String(value));
        }
    });
    const response = await apiClient.get<PaginatedResponse<Exam>>(
        `/officer/department-exams?${params.toString()}`
    );
    return response.data;
}

/**
 * Fetch all exams in the authenticated officer's school.
 * Requires is_school_exam_officer = true on the lecturer.
 */
export async function getSchoolExams(
    filters: OfficerExamFilters = {}
): Promise<PaginatedResponse<Exam>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
            params.append(key, String(value));
        }
    });
    const response = await apiClient.get<PaginatedResponse<Exam>>(
        `/officer/school-exams?${params.toString()}`
    );
    return response.data;
}
