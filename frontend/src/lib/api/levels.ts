import apiClient from './client';
import type { ApiResponse, PaginatedResponse, CreateLevelData, UpdateLevelData, LevelFilters } from '@/lib/types/api';
import type { Level } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Level Management API (Admin)                                        */
/* ------------------------------------------------------------------ */

/**
 * List levels with search, filter, and pagination.
 */
export async function getLevels(filters: LevelFilters = {}): Promise<PaginatedResponse<Level>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiClient.get<PaginatedResponse<Level>>(`/levels?${params.toString()}`);
    return response.data;
}

/**
 * Get all active levels (for dropdowns — non-paginated).
 */
export async function getActiveLevels(): Promise<ApiResponse<{ levels: Level[] }>> {
    const response = await apiClient.get<ApiResponse<{ levels: Level[] }>>('/levels/active');
    return response.data;
}

/**
 * Get a single level by ID.
 */
export async function getLevel(id: number): Promise<ApiResponse<{ level: Level }>> {
    const response = await apiClient.get<ApiResponse<{ level: Level }>>(`/levels/${id}`);
    return response.data;
}

/**
 * Create a new level.
 */
export async function createLevel(data: CreateLevelData): Promise<ApiResponse<{ level: Level }>> {
    const response = await apiClient.post<ApiResponse<{ level: Level }>>('/levels', data);
    return response.data;
}

/**
 * Update an existing level.
 */
export async function updateLevel(id: number, data: UpdateLevelData): Promise<ApiResponse<{ level: Level }>> {
    const response = await apiClient.put<ApiResponse<{ level: Level }>>(`/levels/${id}`, data);
    return response.data;
}

/**
 * Delete a level.
 */
export async function deleteLevel(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/levels/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted level.
 */
export async function restoreLevel(id: number): Promise<ApiResponse<{ level: Level }>> {
    const response = await apiClient.post<ApiResponse<{ level: Level }>>(`/levels/${id}/restore`);
    return response.data;
}
