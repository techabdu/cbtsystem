import { API_BASE_URL, BACKEND_URL } from '@/lib/constants';

/* ------------------------------------------------------------------ */
/*  Authenticated file download                                         */
/*                                                                      */
/*  window.open() cannot set auth headers, so we fetch the file with    */
/*  credentials: 'include' (session cookies) and download via blob URL. */
/* ------------------------------------------------------------------ */

/**
 * Fetch an authenticated URL, receive it as a binary blob, and
 * trigger a browser "Save As" dialog with the given filename.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            Accept: 'application/octet-stream, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, */*',
        },
    });

    if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    // Revoke after short delay so the download has time to start
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/* ------------------------------------------------------------------ */
/*  Convenience wrappers per export type                                */
/* ------------------------------------------------------------------ */

/**
 * Download a student transcript PDF.
 */
export function downloadStudentTranscript(studentId: number | string): Promise<void> {
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return downloadFile(
        `/exports/students/${studentId}/transcript`,
        `transcript_${studentId}_${now}.pdf`
    );
}

/**
 * Download a PDF summary of results for a specific exam.
 */
export function downloadExamResultsPdf(examId: number | string, examTitle?: string): Promise<void> {
    const safe = (examTitle ?? `exam_${examId}`).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    const now  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return downloadFile(
        `/exports/exams/${examId}/results/pdf`,
        `results_${safe}_${now}.pdf`
    );
}

/**
 * Download an enrollment list as Excel.
 */
export function downloadEnrollmentList(params?: { course_id?: number; department_id?: number }): Promise<void> {
    const query = params ? '?' + new URLSearchParams(
        Object.fromEntries(
            Object.entries(params)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
        )
    ).toString() : '';
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return downloadFile(`/exports/enrollments${query}`, `enrollments_${now}.xlsx`);
}

/**
 * Download a results export as Excel.
 */
export function downloadResultsExport(params?: { exam_id?: number; department_id?: number }): Promise<void> {
    const query = params ? '?' + new URLSearchParams(
        Object.fromEntries(
            Object.entries(params)
                .filter(([, v]) => v !== undefined)
                .map(([k, v]) => [k, String(v)])
        )
    ).toString() : '';
    const now = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return downloadFile(`/exports/results${query}`, `results_${now}.xlsx`);
}

/* ------------------------------------------------------------------ */
/*  Legacy URL builders (kept for backward-compat if referenced)       */
/* ------------------------------------------------------------------ */

/** @deprecated Use downloadStudentTranscript() instead */
export function getStudentTranscriptUrl(studentId: number | string): string {
    return `${BACKEND_URL}/api/v1/exports/students/${studentId}/transcript`;
}
