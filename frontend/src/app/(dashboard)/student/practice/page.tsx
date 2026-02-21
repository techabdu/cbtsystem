'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getPracticeExams } from '@/lib/api/exams';
import type { Exam } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    BookOpen,
    Clock,
    ArrowRight,
    Trophy,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function StudentPracticePage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await getPracticeExams();
                setExams(res.data);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setError(e.response?.data?.message || 'Failed to load practice exams.');
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
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Practice Exams</h1>
                <p className="text-muted-foreground">
                    Sharpen your skills with practice exams. Take them as many times as you like.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {exams.length === 0 && !error ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-sm font-medium text-muted-foreground">No practice exams available</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Practice exams will appear here once your lecturers create them.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {exams.map(exam => (
                        <PracticeExamCard key={exam.id} exam={exam} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Practice Exam Card                                                  */
/* ------------------------------------------------------------------ */

function PracticeExamCard({ exam }: { exam: Exam }) {
    return (
        <Card className="group hover:shadow-md transition-shadow flex flex-col">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex items-center rounded-md bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700 font-mono dark:bg-teal-900/40 dark:text-teal-300 shrink-0">
                        {exam.course?.code || `#${exam.course_id}`}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                        Practice
                    </span>
                </div>
                <CardTitle className="text-base mt-2 leading-snug">{exam.title}</CardTitle>
                {exam.course?.title && (
                    <CardDescription className="text-xs line-clamp-1">{exam.course.title}</CardDescription>
                )}
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{exam.total_questions}</p>
                        <p className="text-[10px] text-muted-foreground">Questions</p>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2 text-center">
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{exam.duration_minutes}m</p>
                        <p className="text-[10px] text-muted-foreground">Duration</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5 shrink-0" />
                    <span>Pass: {exam.passing_marks} / {exam.total_marks} marks</span>
                </div>

                {exam.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{exam.description}</p>
                )}

                <div className="pt-2">
                    <Link href={`/student/practice/${exam.id}`}>
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 group-hover:bg-teal-600 group-hover:text-white group-hover:border-teal-600 transition-colors"
                        >
                            <Clock className="h-4 w-4" />
                            Start Practice
                            <ArrowRight className="h-3.5 w-3.5 ml-auto" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
