'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getStudentExamResults } from '@/lib/api/exams';
import type { StudentExamResult } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    ChevronLeft,
    CheckCircle2,
    XCircle,
    GraduationCap,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function StudentExamResultPage() {
    const params = useParams();
    const examId = params.id as string;

    const [result, setResult] = useState<StudentExamResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await getStudentExamResults(examId);
                setResult(res.data);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setError(e.response?.data?.message || 'Failed to load results.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [examId]);

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <Link href="/student/results">
                    <Button variant="ghost" size="sm" className="gap-1.5">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Results
                    </Button>
                </Link>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            </div>
        );
    }

    if (!result) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Link href="/student/results">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{result.exam_title}</h1>
                    <p className="text-sm text-muted-foreground font-mono">{result.course_code}</p>
                </div>
            </div>

            {/* Score Card */}
            <Card className={result.passed
                ? 'border-emerald-200 dark:border-emerald-800/50'
                : 'border-red-200 dark:border-red-800/50'
            }>
                <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center gap-3">
                        {result.passed ? (
                            <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/40">
                                <GraduationCap className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        ) : (
                            <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40">
                                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            </div>
                        )}
                        <div>
                            <p className="text-3xl font-bold">{result.percentage.toFixed(1)}%</p>
                            <p className="text-sm text-muted-foreground">
                                {result.student_score} / {result.total_marks} marks
                            </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                            result.passed
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                            {result.passed ? 'Passed' : 'Failed'}
                        </span>
                        <p className="text-xs text-muted-foreground">
                            Passing marks: {result.passing_marks}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Answers */}
            <Card>
                <CardHeader>
                    <CardTitle>Answer Review</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {result.answers.map((answer, idx) => (
                            <div key={answer.question_id} className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="shrink-0 mt-0.5">
                                        {answer.is_correct === true ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                        ) : answer.is_correct === false ? (
                                            <XCircle className="h-5 w-5 text-red-500" />
                                        ) : (
                                            <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="text-sm font-medium">
                                                <span className="text-muted-foreground mr-2">Q{idx + 1}.</span>
                                                {answer.question_text}
                                            </p>
                                            <span className="text-xs font-medium text-muted-foreground shrink-0">
                                                {answer.points_awarded}/{answer.points_possible}
                                            </span>
                                        </div>

                                        <div className="space-y-1 text-sm">
                                            <p>
                                                <span className="text-muted-foreground">Your answer: </span>
                                                <span className="font-medium">
                                                    {answer.your_answer != null
                                                        ? (Array.isArray(answer.your_answer) ? answer.your_answer.join(', ') : String(answer.your_answer))
                                                        : '(no answer)'}
                                                </span>
                                            </p>
                                            {result.show_correct_answers && answer.correct_answer != null && (
                                                <p>
                                                    <span className="text-muted-foreground">Correct answer: </span>
                                                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                        {Array.isArray(answer.correct_answer) ? answer.correct_answer.join(', ') : String(answer.correct_answer)}
                                                    </span>
                                                </p>
                                            )}
                                        </div>

                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                            answer.question_type === 'multiple_choice' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                            : answer.question_type === 'true_false' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                            : answer.question_type === 'fill_in_blank' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                            : 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                        }`}>
                                            {answer.question_type.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
