'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getExams, deptOfficerApprove, deptOfficerReject, getExamResults } from '@/lib/api/exams';
import { useAuthStore } from '@/lib/store/authStore';
import type { Exam, ExamResults } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    ClipboardCheck,
    CheckCircle2,
    X,
    ArrowRight,
    BarChart3,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ResultsVerificationPage() {
    const currentUser = useAuthStore(s => s.user);
    const [exams, setExams] = useState<Exam[]>([]);
    const [examResults, setExamResults] = useState<Record<number, ExamResults>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectDialogError, setRejectDialogError] = useState('');

    const fetchExams = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await getExams({ results_status: 'grading_submitted', per_page: 50 });
            setExams(res.data);

            // Fetch results for each exam
            const resultsMap: Record<number, ExamResults> = {};
            await Promise.all(
                res.data.map(async (exam: Exam) => {
                    try {
                        const r = await getExamResults(exam.uuid);
                        resultsMap[exam.id] = r.data;
                    } catch { /* ignore */ }
                })
            );
            setExamResults(resultsMap);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to load exams.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    // Dept Exam Officer or admin only
    if (currentUser && !currentUser.is_department_exam_officer && currentUser.role !== 'admin') {
        return (
            <div className="space-y-4 max-w-lg mx-auto mt-8">
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">This page is only accessible to Department Exam Officers.</p>
                </div>
            </div>
        );
    }

    const handleApprove = async (examId: string) => {
        setProcessingId(examId);
        setActionError('');
        try {
            await deptOfficerApprove(examId);
            setActionSuccess('Results approved and published to Edu Portal.');
            setTimeout(() => setActionSuccess(''), 4000);
            await fetchExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message || 'Failed to approve results.');
            setTimeout(() => setActionError(''), 5000);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (examId: string) => {
        if (!rejectReason.trim()) {
            setRejectDialogError('A reason for rejection is required.');
            return;
        }
        setProcessingId(examId);
        setShowRejectDialog(null);
        setRejectDialogError('');
        setActionError('');
        try {
            await deptOfficerReject(examId, rejectReason);
            setRejectReason('');
            setActionSuccess('Grading rejected and returned to lecturer for revision.');
            setTimeout(() => setActionSuccess(''), 4000);
            await fetchExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message || 'Failed to reject grading.');
            setTimeout(() => setActionError(''), 5000);
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Grading Review</h1>
                <p className="text-muted-foreground">
                    Review graded exam results and approve them for the Edu Portal.
                </p>
            </div>

            {/* Messages */}
            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}
            {actionSuccess && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{actionSuccess}</p>
                </div>
            )}
            {actionError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{actionError}</p>
                </div>
            )}

            {/* Empty state */}
            {exams.length === 0 && !error && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">No grading to review</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Graded exams submitted by lecturers will appear here for Department Exam Officer review.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Exam list */}
            <div className="space-y-3">
                {exams.map(exam => {
                    const results = examResults[exam.id];
                    return (
                        <Card key={exam.id} className="shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono">
                                                {exam.course?.code || `#${exam.course_id}`}
                                            </span>
                                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                grading review
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-sm leading-tight">{exam.title}</h3>
                                        {exam.creator?.full_name && (
                                            <p className="text-xs text-muted-foreground">by {exam.creator.full_name}</p>
                                        )}
                                        {results && (
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                                <span>{results.completed} submissions</span>
                                                {results.avg_score != null && <span>Avg: {results.avg_score.toFixed(1)}%</span>}
                                                {results.pass_rate != null && <span>Pass rate: {results.pass_rate.toFixed(1)}%</span>}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link href={`/lecturer/exams/${exam.id}?tab=results`}>
                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                <BarChart3 className="h-3.5 w-3.5" />
                                                View Results
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => { setShowRejectDialog(exam.uuid); setRejectReason(''); setRejectDialogError(''); }}
                                            disabled={processingId === exam.uuid}
                                            className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                            Reject
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprove(exam.uuid)}
                                            disabled={processingId !== null}
                                            isLoading={processingId === exam.uuid}
                                            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
                                        >
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Approve Results
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Reject Dialog */}
            {showRejectDialog !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Reject Grading</CardTitle>
                            <CardDescription>
                                The grading will be returned to the lecturer for revision. Please provide a reason.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rejectDialogError && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <p className="text-sm">{rejectDialogError}</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Reason for rejection <span className="text-red-500">*</span></label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => { setRejectReason(e.target.value); setRejectDialogError(''); }}
                                    placeholder="Explain what needs to be corrected..."
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => { setShowRejectDialog(null); setRejectDialogError(''); }}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleReject(showRejectDialog)}
                                    isLoading={processingId === showRejectDialog}
                                    className="gap-2 bg-red-600 hover:bg-red-700"
                                >
                                    <X className="h-4 w-4" />
                                    Confirm Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
