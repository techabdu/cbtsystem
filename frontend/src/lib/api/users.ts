import apiClient from './client';
import { API_BASE_URL } from '@/lib/constants';
import type { ApiResponse, PaginatedResponse, CreateUserData, UpdateUserData, UserFilters } from '@/lib/types/api';
import type { User } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  User Management API (Admin)                                        */
/* ------------------------------------------------------------------ */

/**
 * List users with search, filter, and pagination.
 */
export async function getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    // Build query string, removing empty values
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiClient.get<PaginatedResponse<User>>(`/users?${params.toString()}`);
    return response.data;
}

/**
 * Get a single user by ID.
 */
export async function getUser(id: number): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(`/users/${id}`);
    return response.data;
}

/**
 * Create a new user (admin creates lecturers/admins/students).
 */
export async function createUser(data: CreateUserData): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>('/users', data);
    return response.data;
}

/**
 * Update an existing user.
 */
export async function updateUser(id: number, data: UpdateUserData): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(`/users/${id}`, data);
    return response.data;
}

/**
 * Soft-delete a user.
 */
export async function deleteUser(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/users/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted user.
 */
export async function restoreUser(id: number): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.post<ApiResponse<{ user: User }>>(`/users/${id}/restore`);
    return response.data;
}

/**
 * Toggle a user's active status.
 */
export async function toggleUserActive(id: number): Promise<ApiResponse<{ user: User }>> {
    const response = await apiClient.patch<ApiResponse<{ user: User }>>(`/users/${id}/toggle-active`);
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Bulk Upload                                                         */
/* ------------------------------------------------------------------ */

export interface BulkUploadUsersResult {
    created: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
}

/**
 * Download an Excel template file by name (e.g. 'bulk-students-template').
 * Uses fetch so CORS headers apply and the download works cross-origin.
 */
export async function downloadTemplate(name: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/templates/${name}`, {
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error(`Failed to download template: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Bulk upload users from an Excel file (.xlsx / .xls).
 */
export async function bulkUploadUsers(file: File): Promise<BulkUploadUsersResult> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<BulkUploadUsersResult>>('/users/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
}
