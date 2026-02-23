import apiClient from './client';
import {
    ApiResponse,
    PaginatedResponse,
    ExamFilters,
    CreateExamData,
    UpdateExamData,
    AddExamQuestionsData,
    PracticeAnswerData,
} from '@/lib/types/api';
import { Exam, ExamStats, ExamResults, PracticeSubmitResult } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Lecturer / Admin — Exam Management                                  */
/* ------------------------------------------------------------------ */

/**
 * Get paginated list of exams (role-aware: lecturers see only their courses' exams).
 */
export async function getExams(filters?: ExamFilters): Promise<PaginatedResponse<Exam>> {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
                params.append(key, String(value));
            }
        });
    }
    const response = await apiClient.get<PaginatedResponse<Exam>>(`/exams?${params.toString()}`);
    return response.data;
}

/**
 * Get a single exam by ID (includes questions and course details).
 */
export async function getExam(id: number): Promise<ApiResponse<Exam>> {
    const response = await apiClient.get<ApiResponse<Exam>>(`/exams/${id}`);
    return response.data;
}

/**
 * Create a new exam.
 */
export async function createExam(data: CreateExamData): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>('/exams', data);
    return response.data;
}

/**
 * Update an existing exam.
 */
export async function updateExam(id: number, data: UpdateExamData): Promise<ApiResponse<Exam>> {
    const response = await apiClient.put<ApiResponse<Exam>>(`/exams/${id}`, data);
    return response.data;
}

/**
 * Delete an exam (soft-delete).
 */
export async function deleteExam(id: number): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/exams/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted exam.
 */
export async function restoreExam(id: number): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/restore`);
    return response.data;
}

/**
 * Add questions to an exam from the question bank.
 */
export async function addExamQuestions(
    id: number,
    data: AddExamQuestionsData
): Promise<ApiResponse<{ total_questions: number; total_marks: number; status_reset: boolean }>> {
    const response = await apiClient.post<ApiResponse<{ total_questions: number; total_marks: number; status_reset: boolean }>>(
        `/exams/${id}/questions`,
        data
    );
    return response.data;
}

/**
 * Remove a question from an exam.
 */
export async function removeExamQuestion(
    examId: number,
    questionId: number
): Promise<ApiResponse<{ status_reset: boolean } | null>> {
    const response = await apiClient.delete<ApiResponse<{ status_reset: boolean } | null>>(
        `/exams/${examId}/questions/${questionId}`
    );
    return response.data;
}

/**
 * Submit a draft exam for HOD review.
 */
export async function submitExamForReview(id: number): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/submit-for-review`);
    return response.data;
}

/**
 * Verify an exam (HOD or admin approves for publishing).
 */
export async function verifyExam(id: number): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/verify`);
    return response.data;
}

/**
 * Reject an exam (HOD or admin sends back to draft).
 */
export async function rejectExam(id: number, reason?: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/reject`, { reason });
    return response.data;
}

/**
 * Publish an exam (admin only — exam must be in verified status).
 */
export async function publishExam(id: number): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/publish`);
    return response.data;
}

/**
 * Get results for a published/completed exam.
 */
export async function getExamResults(id: number): Promise<ApiResponse<ExamResults>> {
    const response = await apiClient.get<ApiResponse<ExamResults>>(`/exams/${id}/results`);
    return response.data;
}

/**
 * Get exam statistics summary.
 */
export async function getExamStats(): Promise<ApiResponse<ExamStats>> {
    const response = await apiClient.get<ApiResponse<ExamStats>>('/exams/stats');
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Student — Exam Viewing                                              */
/* ------------------------------------------------------------------ */

/**
 * Get paginated list of exams available to the student (from enrolled courses).
 */
export async function getStudentExams(
    filters?: { page?: number; per_page?: number }
): Promise<PaginatedResponse<Exam>> {
    const params = new URLSearchParams();
    if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined) {
                params.append(key, String(value));
            }
        });
    }
    const response = await apiClient.get<PaginatedResponse<Exam>>(`/student/exams?${params.toString()}`);
    return response.data;
}

/**
 * Get a single exam for a student.
 */
export async function getStudentExam(id: number): Promise<ApiResponse<Exam>> {
    const response = await apiClient.get<ApiResponse<Exam>>(`/student/exams/${id}`);
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Student — Practice Exams                                            */
/* ------------------------------------------------------------------ */

/**
 * Get all available practice exams for the student.
 */
export async function getPracticeExams(): Promise<PaginatedResponse<Exam>> {
    const response = await apiClient.get<PaginatedResponse<Exam>>('/student/practice-exams');
    return response.data;
}

/**
 * Get a single practice exam with its questions.
 */
export async function getPracticeExam(id: number): Promise<ApiResponse<Exam>> {
    const response = await apiClient.get<ApiResponse<Exam>>(`/student/practice-exams/${id}`);
    return response.data;
}

/**
 * Submit answers for a practice exam and get results immediately.
 */
export async function submitPracticeExam(
    id: number,
    data: PracticeAnswerData
): Promise<ApiResponse<PracticeSubmitResult>> {
    const response = await apiClient.post<ApiResponse<PracticeSubmitResult>>(
        `/student/practice-exams/${id}/submit`,
        data
    );
    return response.data;
}
