'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getExams, verifyExam, rejectExam } from '@/lib/api/exams';
import { useAuthStore } from '@/lib/store/authStore';
import type { Exam } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    ClipboardCheck,
    CheckCircle2,
    X,
    ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ExamReviewsPage() {
    const currentUser = useAuthStore(s => s.user);
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectDialogError, setRejectDialogError] = useState('');

    const fetchPendingExams = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await getExams({ status: 'pending_review', is_practice: 'false', per_page: 50 });
            setExams(res.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to load pending exams.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchPendingExams(); }, [fetchPendingExams]);

    // HOD can only act — redirect message if not HOD
    if (currentUser && !currentUser.is_hod && currentUser.role !== 'admin') {
        return (
            <div className="space-y-4 max-w-lg mx-auto mt-8">
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">This page is only accessible to Heads of Department.</p>
                </div>
            </div>
        );
    }

    const handleVerify = async (examId: number) => {
        setProcessingId(examId);
        setActionError('');
        try {
            await verifyExam(examId);
            setActionSuccess('Exam verified and sent to admin for publishing.');
            setTimeout(() => setActionSuccess(''), 4000);
            await fetchPendingExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message || 'Failed to verify exam.');
            setTimeout(() => setActionError(''), 5000);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (examId: number) => {
        if (!rejectReason.trim()) {
            setRejectDialogError('A reason for rejection is required.');
            return;
        }
        setProcessingId(examId);
        setShowRejectDialog(null);
        setRejectDialogError('');
        setActionError('');
        try {
            await rejectExam(examId, rejectReason);
            setRejectReason('');
            setActionSuccess('Exam rejected and returned to draft.');
            setTimeout(() => setActionSuccess(''), 4000);
            await fetchPendingExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message || 'Failed to reject exam.');
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
                <h1 className="text-2xl font-bold tracking-tight">Exam Reviews</h1>
                <p className="text-muted-foreground">
                    Review and verify exam submissions from lecturers in your department.
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
                        <p className="mt-2 text-sm font-medium text-muted-foreground">No exams pending review</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Exams submitted by lecturers for HOD review will appear here.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Exam list */}
            <div className="space-y-3">
                {exams.map(exam => (
                    <Card key={exam.id} className="shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono">
                                            {exam.course?.code || `#${exam.course_id}`}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                            pending review
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-sm leading-tight">{exam.title}</h3>
                                    {exam.course?.title && (
                                        <p className="text-xs text-muted-foreground">{exam.course.title}</p>
                                    )}
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                        <span>{exam.total_questions} questions</span>
                                        <span>{exam.total_marks} marks</span>
                                        <span>{exam.duration_minutes}m</span>
                                        {exam.start_time ? (
                                            <span>Starts: {format(new Date(exam.start_time), 'MMM dd, yyyy HH:mm')}</span>
                                        ) : (
                                            <span className="text-muted-foreground/60">Schedule TBD</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link href={`/lecturer/exams/${exam.id}`}>
                                        <Button variant="outline" size="sm" className="gap-1.5">
                                            Review
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => { setShowRejectDialog(exam.id); setRejectReason(''); setRejectDialogError(''); }}
                                        disabled={processingId === exam.id}
                                        className="gap-1.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleVerify(exam.id)}
                                        disabled={processingId !== null}
                                        isLoading={processingId === exam.id}
                                        className="gap-1.5 bg-violet-600 hover:bg-violet-700"
                                    >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Verify
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Reject Dialog */}
            {showRejectDialog !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Reject Exam</CardTitle>
                            <CardDescription>
                                The exam will be returned to draft. You must provide a reason so the lecturer knows what to fix.
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
