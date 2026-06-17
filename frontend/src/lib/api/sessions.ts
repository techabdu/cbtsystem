import axios from 'axios';
import { API_BASE_URL } from '@/lib/constants';
import apiClient from '@/lib/api/client';
import type {
    ApiResponse,
    OfflineEntryData,
    OfflineEntryResult,
    ExamSessionStatus,
    ExamSessionQuestions,
    ExamSessionQuestion,
    SaveAnswerData,
    SaveAnswerResult,
    BatchSaveAnswersData,
    BatchSaveAnswersResult,
    ToggleFlagData,
    ToggleFlagResult,
    ExamSubmitResult,
} from '@/lib/types/api';

/**
 * Start an offline exam session.
 * This is a PUBLIC endpoint — no auth header required.
 * Uses a raw axios instance to avoid the auth interceptor.
 */
export async function startOfflineExam(data: OfflineEntryData): Promise<ApiResponse<OfflineEntryResult>> {
    const res = await axios.post<ApiResponse<OfflineEntryResult>>(
        `${API_BASE_URL}/offline-exams/start`,
        data,
        {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000,
        }
    );
    return res.data;
}

/* ------------------------------------------------------------------ */
/*  Exam Session — Authenticated endpoints                              */
/* ------------------------------------------------------------------ */

export async function getSessionStatus(sessionId: string): Promise<ApiResponse<ExamSessionStatus>> {
    const res = await apiClient.get<ApiResponse<ExamSessionStatus>>(`/exam-sessions/${sessionId}/status`);
    return res.data;
}

export async function getSessionQuestions(sessionId: string): Promise<ApiResponse<ExamSessionQuestions>> {
    const res = await apiClient.get<ApiResponse<ExamSessionQuestions>>(`/exam-sessions/${sessionId}/questions`);
    return res.data;
}

export async function getSessionQuestion(sessionId: string, index: number): Promise<ApiResponse<ExamSessionQuestion>> {
    const res = await apiClient.get<ApiResponse<ExamSessionQuestion>>(`/exam-sessions/${sessionId}/questions/${index}`);
    return res.data;
}

export async function saveAnswer(sessionId: string, data: SaveAnswerData): Promise<ApiResponse<SaveAnswerResult>> {
    const res = await apiClient.post<ApiResponse<SaveAnswerResult>>(`/exam-sessions/${sessionId}/answers`, data);
    return res.data;
}

export async function saveAnswersBatch(sessionId: string, data: BatchSaveAnswersData): Promise<ApiResponse<BatchSaveAnswersResult>> {
    const res = await apiClient.post<ApiResponse<BatchSaveAnswersResult>>(`/exam-sessions/${sessionId}/answers/batch`, data);
    return res.data;
}

export async function toggleQuestionFlag(sessionId: string, data: ToggleFlagData): Promise<ApiResponse<ToggleFlagResult>> {
    const res = await apiClient.post<ApiResponse<ToggleFlagResult>>(`/exam-sessions/${sessionId}/flag`, data);
    return res.data;
}

export async function submitExam(sessionId: string): Promise<ApiResponse<ExamSubmitResult>> {
    const res = await apiClient.post<ApiResponse<ExamSubmitResult>>(`/exam-sessions/${sessionId}/submit`);
    return res.data;
}

export async function reportViolation(sessionId: string, type: string, description?: string): Promise<void> {
    await apiClient.post(`/exam-sessions/${sessionId}/violations`, { type, description });
}
