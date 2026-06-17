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
export const getQuestion = async (id: string): Promise<ApiResponse<Question>> => {
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
export const updateQuestion = async (id: string, data: UpdateQuestionData): Promise<ApiResponse<Question>> => {
    const response = await client.put<ApiResponse<Question>>(`/questions/${id}`, data);
    return response.data;
};

/**
 * Delete a question (soft-delete).
 */
export const deleteQuestion = async (id: string): Promise<ApiResponse> => {
    const response = await client.delete<ApiResponse>(`/questions/${id}`);
    return response.data;
};

/**
 * Restore a soft-deleted question.
 */
export const restoreQuestion = async (id: string): Promise<ApiResponse<Question>> => {
    const response = await client.post<ApiResponse<Question>>(`/questions/${id}/restore`);
    return response.data;
};

/**
 * Verify a question (admin or different lecturer).
 */
export const verifyQuestion = async (id: string): Promise<ApiResponse<Question>> => {
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

/* ------------------------------------------------------------------ */
/*  File-based Bulk Upload                                             */
/* ------------------------------------------------------------------ */

export interface BulkUploadQuestionsFileResult {
    created: number;
    skipped: number;
    errors: Array<{ row: number; message: string }>;
}

/**
 * Bulk upload questions from an Excel file (.xlsx / .xls).
 * Uses the dedicated Excel import endpoint (not the JSON bulk-upload).
 */
export const bulkUploadQuestionsFile = async (file: File): Promise<BulkUploadQuestionsFileResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await client.post<ApiResponse<BulkUploadQuestionsFileResult>>(
        '/questions/bulk-upload-excel',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
};

/* ------------------------------------------------------------------ */
/*  Question Image Upload                                               */
/* ------------------------------------------------------------------ */

/**
 * Upload an image for a question. Replaces any existing image.
 * Accepted formats: jpg, png, gif, webp (max 2 MB enforced server-side).
 */
export const uploadQuestionImage = async (
    questionId: string,
    file: File
): Promise<ApiResponse<{ image_url: string }>> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await client.post<ApiResponse<{ image_url: string }>>(
        `/questions/${questionId}/image`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
};

/**
 * Delete the image associated with a question.
 */
export const deleteQuestionImage = async (questionId: string): Promise<ApiResponse<null>> => {
    const response = await client.delete<ApiResponse<null>>(`/questions/${questionId}/image`);
    return response.data;
};
