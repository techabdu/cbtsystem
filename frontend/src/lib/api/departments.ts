import apiClient from './client';
import type { ApiResponse, PaginatedResponse, CreateDepartmentData, UpdateDepartmentData, DepartmentFilters } from '@/lib/types/api';
import type { Department } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Department Management API (Admin)                                   */
/* ------------------------------------------------------------------ */

/**
 * List departments with search, filter, and pagination.
 */
export async function getDepartments(filters: DepartmentFilters = {}): Promise<PaginatedResponse<Department>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiClient.get<PaginatedResponse<Department>>(`/departments?${params.toString()}`);
    return response.data;
}

/**
 * Get all active departments (for dropdowns — non-paginated).
 */
export async function getActiveDepartments(): Promise<ApiResponse<{ departments: Department[] }>> {
    const response = await apiClient.get<ApiResponse<{ departments: Department[] }>>('/departments/active');
    return response.data;
}

/**
 * Get a single department by ID.
 */
export async function getDepartment(id: number): Promise<ApiResponse<{ department: Department }>> {
    const response = await apiClient.get<ApiResponse<{ department: Department }>>(`/departments/${id}`);
    return response.data;
}

/**
 * Create a new department.
 */
export async function createDepartment(data: CreateDepartmentData): Promise<ApiResponse<{ department: Department }>> {
    const response = await apiClient.post<ApiResponse<{ department: Department }>>('/departments', data);
    return response.data;
}

/**
 * Update an existing department.
 */
export async function updateDepartment(id: number, data: UpdateDepartmentData): Promise<ApiResponse<{ department: Department }>> {
    const response = await apiClient.put<ApiResponse<{ department: Department }>>(`/departments/${id}`, data);
    return response.data;
}

/**
 * Delete a department.
 */
export async function deleteDepartment(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/departments/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted department.
 */
export async function restoreDepartment(id: number): Promise<ApiResponse<{ department: Department }>> {
    const response = await apiClient.post<ApiResponse<{ department: Department }>>(`/departments/${id}/restore`);
    return response.data;
}
