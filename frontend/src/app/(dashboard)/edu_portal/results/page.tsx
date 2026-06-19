'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getExams, getExamResults, publishResults } from '@/lib/api/exams';
import type { Exam, ExamResults } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    ClipboardCheck,
    CheckCircle2,
    Download,
    BarChart3,
    Send,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ResultsPublishingPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [pendingExams, setPendingExams] = useState<Exam[]>([]);
    const [examResults, setExamResults] = useState<Record<number, ExamResults>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionError, setActionError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);

    // Export to Excel not fully implemented yet in API, but this is the UI stub
    const handleExportExcel = async (examId: number) => {
        setProcessingId(examId);
        try {
            // await exportExamResultsToExcel(examId);
            setActionSuccess(`Results exported for exam #${examId}`);
            setTimeout(() => setActionSuccess(''), 4000);
        } catch (err) {
            setActionError('Failed to export results.');
            setTimeout(() => setActionError(''), 4000);
        } finally {
            setProcessingId(null);
        }
    };

    const handlePublish = async (exam: Exam) => {
        setProcessingId(exam.id);
        setActionError('');
        setActionSuccess('');
        try {
            await publishResults(exam.uuid);
            setActionSuccess(`Results published for "${exam.title}". Students can now view their scores.`);
            setTimeout(() => setActionSuccess(''), 4000);
            await fetchExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message || 'Failed to publish results.');
            setTimeout(() => setActionError(''), 5000);
        } finally {
            setProcessingId(null);
        }
    };

    const fetchExams = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Verified results awaiting publication + already-published results.
            const [pendingRes, publishedRes] = await Promise.all([
                getExams({ results_status: 'results_verified', per_page: 50 }),
                getExams({ results_status: 'results_published', per_page: 50 }),
            ]);
            setPendingExams(pendingRes.data);
            setExams(publishedRes.data);

            // Fetch results for each published exam
            const resultsMap: Record<number, ExamResults> = {};
            await Promise.all(
                publishedRes.data.map(async (exam: Exam) => {
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
                <h1 className="text-2xl font-bold tracking-tight">Official Exam Results</h1>
                <p className="text-muted-foreground">
                    View all officially published results across departments and export to Excel.
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

            {/* Pending publication — verified results awaiting Edu Portal publish */}
            {pendingExams.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                        Pending Publication ({pendingExams.length})
                    </h2>
                    {pendingExams.map(exam => (
                        <Card key={exam.id} className="border-amber-200 bg-amber-50/40 shadow-sm dark:border-amber-800/40 dark:bg-amber-950/10">
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono">
                                                {exam.course?.code || `#${exam.course_id}`}
                                            </span>
                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                results verified
                                            </span>
                                        </div>
                                        <h3 className="font-semibold text-sm leading-tight">{exam.title}</h3>
                                        {exam.creator?.full_name && (
                                            <p className="text-xs text-muted-foreground">by {exam.creator.full_name}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            size="sm"
                                            onClick={() => handlePublish(exam)}
                                            disabled={processingId !== null}
                                            isLoading={processingId === exam.id}
                                            className="gap-1.5 bg-green-600 hover:bg-green-700"
                                        >
                                            <Send className="h-3.5 w-3.5" />
                                            Publish Results
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {exams.length === 0 && pendingExams.length === 0 && !error && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <ClipboardCheck className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">No published results found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Officially published exam results will appear here.
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
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                published
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
                                        <Link href={`/cbt/exams/${exam.id}`}>
                                            <Button variant="outline" size="sm" className="gap-1.5">
                                                <BarChart3 className="h-3.5 w-3.5" />
                                                View Details
                                            </Button>
                                        </Link>
                                        <Button
                                            size="sm"
                                            onClick={() => handleExportExcel(exam.id)}
                                            disabled={processingId !== null}
                                            isLoading={processingId === exam.id}
                                            className="gap-1.5 bg-green-600 hover:bg-green-700"
                                        >
                                            <Download className="h-3.5 w-3.5" />
                                            Export Excel
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
