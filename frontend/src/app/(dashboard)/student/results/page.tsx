'use client';

import { useState, useEffect } from 'react';
import { getStudentExams } from '@/lib/api/exams';
import type { Exam } from '@/lib/types/models';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    AlertCircle,
    GraduationCap,
    Clock,
} from 'lucide-react';
import { format, isPast } from 'date-fns';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function StudentResultsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await getStudentExams({ per_page: 100 });
                // Show only past exams
                setExams(res.data.filter((e: Exam) => {
                    try { return isPast(new Date(e.end_time)); } catch { return false; }
                }));
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setError(e.response?.data?.message || 'Failed to load exams.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Results</h1>
                <p className="text-muted-foreground">
                    View your exam results. Results are available once published by the admin.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {exams.length === 0 && !error && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">No exam results yet</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Your results will appear here after your exams are graded and published.
                        </p>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {exams.map(exam => {
                    const isPublished = exam.results_status === 'results_published';

                    return (
                        <Card key={exam.id} className="shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono">
                                                {exam.course?.code || `#${exam.course_id}`}
                                            </span>
                                            {isPublished ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                    results available
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                    results pending
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-sm leading-tight">{exam.title}</h3>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                            <span>{exam.total_marks} marks</span>
                                            <span>{exam.total_questions} questions</span>
                                            <span>Ended: {format(new Date(exam.end_time), 'MMM dd, yyyy')}</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {isPublished ? (
                                            <Link href={`/student/results/${exam.id}`}>
                                                <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                                                    <GraduationCap className="h-3.5 w-3.5" />
                                                    View Results
                                                </Button>
                                            </Link>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" />
                                                <span>Awaiting publication</span>
                                            </div>
                                        )}
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
