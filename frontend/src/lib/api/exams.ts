import apiClient from './client';
import {
    ApiResponse,
    PaginatedResponse,
    ExamFilters,
    CreateExamData,
    UpdateExamData,
    AddExamQuestionsData,
    PracticeAnswerData,
    GradeAnswerData,
    GradeAnswerResult,
    ManualGradingResponse,
    GradingSummary,
    StudentExamResult,
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
export async function getExam(id: string): Promise<ApiResponse<Exam>> {
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
export async function updateExam(id: string, data: UpdateExamData): Promise<ApiResponse<Exam>> {
    const response = await apiClient.put<ApiResponse<Exam>>(`/exams/${id}`, data);
    return response.data;
}

/**
 * Delete an exam (soft-delete).
 */
export async function deleteExam(id: string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(`/exams/${id}`);
    return response.data;
}

/**
 * Restore a soft-deleted exam.
 */
export async function restoreExam(id: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/restore`);
    return response.data;
}

/**
 * Add questions to an exam from the question bank.
 */
export async function addExamQuestions(
    id: string,
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
    examId: string,
    questionId: string
): Promise<ApiResponse<{ status_reset: boolean } | null>> {
    const response = await apiClient.delete<ApiResponse<{ status_reset: boolean } | null>>(
        `/exams/${examId}/questions/${questionId}`
    );
    return response.data;
}

/**
 * Submit a draft exam for HOD review.
 */
export async function submitForHodReview(id: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/submit-hod`);
    return response.data;
}

/**
 * HOD Approve
 */
export async function hodApprove(id: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/hod-approve`);
    return response.data;
}

/**
 * HOD Reject
 */
export async function hodReject(id: string, reason: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/hod-reject`, { reason });
    return response.data;
}

/**
 * School Officer Approve
 */
export async function schoolOfficerApprove(id: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/school-officer-approve`);
    return response.data;
}

/**
 * School Officer Reject
 */
export async function schoolOfficerReject(id: string, reason: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/school-officer-reject`, { reason });
    return response.data;
}

/**
 * CBT Publish
 */
export async function cbtPublish(id: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/cbt-publish`);
    return response.data;
}

/**
 * Sync exam results from the offline server back into the system.
 */
export async function syncResults(id: string): Promise<ApiResponse<{ synced_sessions: number }>> {
    const response = await apiClient.post<ApiResponse<{ synced_sessions: number }>>(`/exams/${id}/sync-results`);
    return response.data;
}

/**
 * Publish a practice exam (lecturer direct-publish) or a CBT-setup exam.
 * Both cases use the cbt-publish workflow route.
 */
export async function publishExam(id: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(`/exams/${id}/cbt-publish`);
    return response.data;
}

/**
 * Get results for a published/completed exam.
 */
export async function getExamResults(id: string): Promise<ApiResponse<ExamResults>> {
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
export async function getStudentExam(id: string): Promise<ApiResponse<Exam>> {
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
export async function getPracticeExam(id: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.get<ApiResponse<Exam>>(`/student/practice-exams/${id}`);
    return response.data;
}

/**
 * Submit answers for a practice exam and get results immediately.
 */
export async function submitPracticeExam(
    id: string,
    data: PracticeAnswerData
): Promise<ApiResponse<PracticeSubmitResult>> {
    const response = await apiClient.post<ApiResponse<PracticeSubmitResult>>(
        `/student/practice-exams/${id}/submit`,
        data
    );
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Manual Grading                                                      */
/* ------------------------------------------------------------------ */

/**
 * Get all sessions with ungraded answers for an exam.
 */
export async function getManualGrading(examId: string): Promise<ApiResponse<ManualGradingResponse>> {
    const response = await apiClient.get<ApiResponse<ManualGradingResponse>>(
        `/exams/${examId}/manual-grading`
    );
    return response.data;
}

/**
 * Get grading summary for an exam.
 */
export async function getGradingSummary(examId: string): Promise<ApiResponse<GradingSummary>> {
    const response = await apiClient.get<ApiResponse<GradingSummary>>(
        `/exams/${examId}/grading-summary`
    );
    return response.data;
}

/**
 * Grade a single student answer (manual grading).
 */
export async function gradeAnswer(
    answerId: number,
    data: GradeAnswerData
): Promise<ApiResponse<GradeAnswerResult>> {
    const response = await apiClient.post<ApiResponse<GradeAnswerResult>>(
        `/student-answers/${answerId}/grade`,
        data
    );
    return response.data;
}

/* ------------------------------------------------------------------ */
/*  Results Workflow                                                    */
/* ------------------------------------------------------------------ */

/**
 * Submit grading for HOD verification (lecturer action).
 */
export async function submitGrading(examId: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(
        `/exams/${examId}/submit-grading`
    );
    return response.data;
}

/**
 * Reject grading back to lecturer (Department Exam Officer action).
 */
export async function deptOfficerReject(examId: string, reason: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(
        `/exams/${examId}/dept-officer-reject`,
        { reason }
    );
    return response.data;
}

/**
 * Verify results and publish them to Edu Portal (Department Exam Officer action).
 */
export async function deptOfficerApprove(examId: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(
        `/exams/${examId}/dept-officer-approve`
    );
    return response.data;
}

/**
 * Publish verified results to students (Edu Portal admin action).
 * Final step of the post-exam flow: results_verified → results_published.
 */
export async function publishResults(examId: string): Promise<ApiResponse<Exam>> {
    const response = await apiClient.post<ApiResponse<Exam>>(
        `/exams/${examId}/publish-results`
    );
    return response.data;
}

/**
 * Get student's individual exam results (published only).
 */
export async function getStudentExamResults(examId: string): Promise<ApiResponse<StudentExamResult>> {
    const response = await apiClient.get<ApiResponse<StudentExamResult>>(
        `/student/exams/${examId}/results`
    );
    return response.data;
}
