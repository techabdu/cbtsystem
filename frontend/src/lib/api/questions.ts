import client from './client';
import {
    ApiResponse,
    PaginatedResponse,
    QuestionFilters,
    CreateQuestionData,
    UpdateQuestionData,
    BulkUploadData,
    BulkUploadResult,
    QuestionStats,
} from '@/lib/types/api';
import { Question } from '@/lib/types/models';

/**
 * Get paginated list of questions (role-aware: lecturers see only their courses' questions).
 */
export const getQuestions = async (filters?: QuestionFilters): Promise<PaginatedResponse<Question>> => {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                params.append(key, String(value));
            }
        });
    }
    const response = await client.get<PaginatedResponse<Question>>(`/questions?${params.toString()}`);
    return response.data;
};

/**
 * Get a single question by ID.
 */
export const getQuestion = async (id: number): Promise<ApiResponse<Question>> => {
    const response = await client.get<ApiResponse<Question>>(`/questions/${id}`);
    return response.data;
};

/**
 * Get question statistics.
 */
export const getQuestionStats = async (): Promise<ApiResponse<QuestionStats>> => {
    const response = await client.get<ApiResponse<QuestionStats>>('/questions/stats');
    return response.data;
};

/**
 * Create a new question.
 */
export const createQuestion = async (data: CreateQuestionData): Promise<ApiResponse<Question>> => {
    const response = await client.post<ApiResponse<Question>>('/questions', data);
    return response.data;
};

/**
 * Update an existing question.
 */
export const updateQuestion = async (id: number, data: UpdateQuestionData): Promise<ApiResponse<Question>> => {
    const response = await client.put<ApiResponse<Question>>(`/questions/${id}`, data);
    return response.data;
};

/**
 * Delete a question (soft-delete).
 */
export const deleteQuestion = async (id: number): Promise<ApiResponse> => {
    const response = await client.delete<ApiResponse>(`/questions/${id}`);
    return response.data;
};

/**
 * Restore a soft-deleted question.
 */
export const restoreQuestion = async (id: number): Promise<ApiResponse<Question>> => {
    const response = await client.post<ApiResponse<Question>>(`/questions/${id}/restore`);
    return response.data;
};

/**
 * Verify a question (admin or different lecturer).
 */
export const verifyQuestion = async (id: number): Promise<ApiResponse<Question>> => {
    const response = await client.patch<ApiResponse<Question>>(`/questions/${id}/verify`);
    return response.data;
};

/**
 * Bulk upload questions from JSON data.
 */
export const bulkUploadQuestions = async (data: BulkUploadData): Promise<ApiResponse<BulkUploadResult>> => {
    const response = await client.post<ApiResponse<BulkUploadResult>>('/questions/bulk-upload', data);
    return response.data;
};
