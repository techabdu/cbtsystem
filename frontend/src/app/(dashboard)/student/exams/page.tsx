'use client';

import { useState, useEffect } from 'react';
import { format, isPast, isFuture, isWithinInterval } from 'date-fns';
import { getStudentExams } from '@/lib/api/exams';
import type { Exam } from '@/lib/types/models';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    ClipboardList,
    Clock,
    BookOpen,
    Calendar,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Badge helpers                                                       */
/* ------------------------------------------------------------------ */

const TYPE_BADGES: Record<string, string> = {
    practical: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    semester: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
};

const TYPE_LABELS: Record<string, string> = {
    practical: 'Practical',
    semester: 'Semester',
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function StudentExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await getStudentExams({ per_page: 50 });
                setExams(res.data);
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

    /* ------------------------------------------------------------------ */
    /*  Partition exams                                                     */
    /* ------------------------------------------------------------------ */

    const now = new Date();

    const availableNow = exams.filter(e => {
        try {
            return isWithinInterval(now, {
                start: new Date(e.start_time),
                end: new Date(e.end_time),
            }) && e.status === 'published';
        } catch { return false; }
    });

    const upcoming = exams.filter(e => {
        try {
            return isFuture(new Date(e.start_time)) && e.status === 'published';
        } catch { return false; }
    });

    const past = exams.filter(e => {
        try {
            return isPast(new Date(e.end_time)) || ['grading', 'grading_review', 'results_published', 'archived'].includes(e.status);
        } catch { return false; }
    });

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Exams</h1>
                <p className="text-muted-foreground">
                    View upcoming and available exams for your enrolled courses.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Available Now */}
            {availableNow.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h2 className="text-lg font-semibold">Available Now</h2>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            {availableNow.length} open
                        </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {availableNow.map(exam => (
                            <ExamCard key={exam.id} exam={exam} variant="available" />
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold">Upcoming Exams</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {upcoming.map(exam => (
                            <ExamCard key={exam.id} exam={exam} variant="upcoming" />
                        ))}
                    </div>
                </section>
            )}

            {/* Past/Completed */}
            {past.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-lg font-semibold text-muted-foreground">Past Exams</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {past.map(exam => (
                            <ExamCard key={exam.id} exam={exam} variant="past" />
                        ))}
                    </div>
                </section>
            )}

            {/* Empty state */}
            {exams.length === 0 && !error && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">No exams found</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Exams will appear here when they are published for your enrolled courses.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Exam Card                                                           */
/* ------------------------------------------------------------------ */

function ExamCard({ exam, variant }: { exam: Exam; variant: 'available' | 'upcoming' | 'past' }) {
    const borderMap = {
        available: 'border-emerald-200 dark:border-emerald-800/50',
        upcoming: 'border-input',
        past: 'border-input opacity-70',
    };

    return (
        <Card className={`transition-shadow hover:shadow-md ${borderMap[variant]}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono shrink-0">
                        {exam.course?.code || `#${exam.course_id}`}
                    </span>
                    <div className="flex gap-1.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[exam.exam_type] || ''}`}>
                            {TYPE_LABELS[exam.exam_type] || exam.exam_type}
                        </span>
                        {exam.is_practice && (
                            <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                                Practice
                            </span>
                        )}
                    </div>
                </div>
                <CardTitle className="text-base mt-2 leading-snug">{exam.title}</CardTitle>
                {exam.course?.title && (
                    <CardDescription className="text-xs line-clamp-1">{exam.course.title}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 shrink-0" />
                    <span>
                        {format(new Date(exam.start_time), 'MMM dd, yyyy')} at {format(new Date(exam.start_time), 'HH:mm')}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>{exam.duration_minutes} minutes</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" />
                    <span>{exam.total_marks} marks &bull; {exam.total_questions} questions</span>
                </div>

                {variant === 'available' && (
                    <div className="mt-3 pt-3 border-t">
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                Report to the exam lab to take this exam. Your invigilator will provide the access code.
                            </p>
                        </div>
                    </div>
                )}
                {variant === 'upcoming' && (
                    <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            Opens: {format(new Date(exam.start_time), 'MMM dd, yyyy HH:mm')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Closes: {format(new Date(exam.end_time), 'MMM dd, yyyy HH:mm')}
                        </p>
                    </div>
                )}
                {variant === 'past' && (
                    <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground">
                            Ended: {format(new Date(exam.end_time), 'MMM dd, yyyy HH:mm')}
                        </p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
