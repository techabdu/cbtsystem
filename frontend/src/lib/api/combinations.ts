import apiClient from './client';
import type { ApiResponse, PaginatedResponse, CreateCombinationData, UpdateCombinationData, CombinationFilters } from '@/lib/types/api';
import type { Combination } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Combination Management API (Admin)                                */
/* ------------------------------------------------------------------ */

/**
 * List combinations with search, filter, and pagination.
 */
export async function getCombinations(filters: CombinationFilters = {}): Promise<PaginatedResponse<Combination>> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
            params.append(key, String(value));
        }
    });

    const response = await apiClient.get<PaginatedResponse<Combination>>(`/combinations?${params.toString()}`);
    return response.data;
}

/**
 * Get all active combinations (for dropdowns — non-paginated).
 */
export async function getActiveCombinations(): Promise<ApiResponse<{ combinations: Combination[] }>> {
    const response = await apiClient.get<ApiResponse<{ combinations: Combination[] }>>('/combinations/active');
    return response.data;
}

/**
 * Get a single combination by ID.
 */
export async function getCombination(id: number): Promise<ApiResponse<{ combination: Combination }>> {
    const response = await apiClient.get<ApiResponse<{ combination: Combination }>>(`/combinations/${id}`);
    return response.data;
}

/**
 * Create a new combination.
 */
export async function createCombination(data: CreateCombinationData): Promise<ApiResponse<{ combination: Combination }>> {
    const response = await apiClient.post<ApiResponse<{ combination: Combination }>>('/combinations', data);
    return response.data;
}

/**
 * Update an existing combination.
 */
export async function updateCombination(id: number, data: UpdateCombinationData): Promise<ApiResponse<{ combination: Combination }>> {
    const response = await apiClient.put<ApiResponse<{ combination: Combination }>>(`/combinations/${id}`, data);
    return response.data;
}

/**
 * Delete a combination.
 */
export async function deleteCombination(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/combinations/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted combination.
 */
export async function restoreCombination(id: number): Promise<ApiResponse<{ combination: Combination }>> {
    const response = await apiClient.post<ApiResponse<{ combination: Combination }>>(`/combinations/${id}/restore`);
    return response.data;
}
