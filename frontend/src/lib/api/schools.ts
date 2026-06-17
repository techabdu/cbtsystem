import apiClient from './client';
import type { ApiResponse, PaginatedResponse, CreateSchoolData, UpdateSchoolData, SchoolFilters } from '@/lib/types/api';
import type { School } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  School Management API (Edu Portal)                                  */
/* ------------------------------------------------------------------ */

/**
 * List schools with search, filter, and pagination.
 */
export async function getSchools(filters: SchoolFilters = {}): Promise<PaginatedResponse<School>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiClient.get<PaginatedResponse<School>>(`/schools?${params.toString()}`);
    return response.data;
}

/**
 * Get all active schools (for dropdowns — non-paginated).
 */
export async function getActiveSchools(): Promise<ApiResponse<{ schools: School[] }>> {
    const response = await apiClient.get<ApiResponse<{ schools: School[] }>>('/schools/active');
    return response.data;
}

/**
 * Get a single school by ID.
 */
export async function getSchool(id: string): Promise<ApiResponse<{ school: School }>> {
    const response = await apiClient.get<ApiResponse<{ school: School }>>(`/schools/${id}`);
    return response.data;
}

/**
 * Create a new school.
 */
export async function createSchool(data: CreateSchoolData): Promise<ApiResponse<{ school: School }>> {
    const response = await apiClient.post<ApiResponse<{ school: School }>>('/schools', data);
    return response.data;
}

/**
 * Update an existing school.
 */
export async function updateSchool(id: string, data: UpdateSchoolData): Promise<ApiResponse<{ school: School }>> {
    const response = await apiClient.put<ApiResponse<{ school: School }>>(`/schools/${id}`, data);
    return response.data;
}

/**
 * Delete a school.
 */
export async function deleteSchool(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/schools/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted school.
 */
export async function restoreSchool(id: string): Promise<ApiResponse<{ school: School }>> {
    const response = await apiClient.post<ApiResponse<{ school: School }>>(`/schools/${id}/restore`);
    return response.data;
}
