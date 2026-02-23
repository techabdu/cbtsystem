'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { PracticeSubmitResult } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChevronLeft,
    CheckCircle2,
    XCircle,
    Trophy,
    RotateCcw,
    AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function PracticeResultsPage() {
    const params = useParams();
    const examId = Number(params.id);

    const [result, setResult] = useState<PracticeSubmitResult | null>(null);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const stored = sessionStorage.getItem(`practice_result_${examId}`);
        if (stored) {
            try {
                setResult(JSON.parse(stored));
            } catch {
                setLoadError('Failed to parse results. Please retake the exam.');
            }
        } else {
            setLoadError('No results found. Please retake the exam to see your results.');
        }
    }, [examId]);

    /* ------------------------------------------------------------------ */
    /*  Error state                                                         */
    /* ------------------------------------------------------------------ */

    if (loadError) {
        return (
            <div className="space-y-4 max-w-2xl mx-auto">
                <Link href="/student/practice">
                    <Button variant="outline" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Practice
                    </Button>
                </Link>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{loadError}</p>
                </div>
                <Link href={`/student/practice/${examId}`}>
                    <Button className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Retake Exam
                    </Button>
                </Link>
            </div>
        );
    }

    if (!result) {
        return null; // Loading
    }

    const percentage = Number.isFinite(result.percentage) ? result.percentage : 0;
    const passed = result.passed;

    // Derive counts from result.results as fallback — guards against old
    // sessionStorage data that pre-dates the correct_count/total_questions fields.
    const correctCount = result.correct_count ?? result.results.filter(r => r.is_correct).length;
    const totalQs = result.total_questions ?? result.results.length;
    const incorrectCount = totalQs - correctCount;

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/student/practice">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Practice Results</h1>
                    <p className="text-muted-foreground text-sm">Your performance breakdown for this practice session.</p>
                </div>
            </div>

            {/* Score Summary Card */}
            <Card className={`border-2 ${passed ? 'border-emerald-400 dark:border-emerald-600' : 'border-red-300 dark:border-red-700'}`}>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left sm:items-start">
                        {/* Icon */}
                        <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${passed
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : 'bg-red-100 dark:bg-red-900/40'
                            }`}>
                            {passed
                                ? <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                : <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                            }
                        </div>

                        {/* Score */}
                        <div className="flex-1">
                            <p className={`text-4xl font-black ${passed
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-red-700 dark:text-red-300'
                                }`}>
                                {percentage.toFixed(1)}%
                            </p>
                            <p className="text-lg font-semibold mt-1">
                                {Number.isFinite(result.score) ? result.score : 0} / {Number.isFinite(result.total_marks) ? result.total_marks : 0} marks
                            </p>
                            <p className={`text-sm font-medium mt-1 ${passed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                                }`}>
                                {passed ? 'Passed' : 'Failed'}
                            </p>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 sm:gap-6">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{correctCount}</p>
                                <p className="text-xs text-muted-foreground">Correct</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{incorrectCount}</p>
                                <p className="text-xs text-muted-foreground">Incorrect</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-muted-foreground">{totalQs}</p>
                                <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
                <Link href={`/student/practice/${examId}`}>
                    <Button variant="outline" className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Retake Exam
                    </Button>
                </Link>
                <Link href="/student/practice">
                    <Button variant="ghost" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Practice Exams
                    </Button>
                </Link>
            </div>

            {/* Per-question Breakdown */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Question Breakdown</h2>
                {result.results.map((qr, idx) => (
                    <Card
                        key={qr.question_id}
                        className={`border ${qr.is_correct
                            ? 'border-emerald-200 dark:border-emerald-800/50'
                            : 'border-red-200 dark:border-red-800/50'
                            }`}
                    >
                        <CardHeader className="pb-2">
                            <div className="flex items-start gap-3">
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${qr.is_correct
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                    : 'bg-red-100 dark:bg-red-900/40'
                                    }`}>
                                    {qr.is_correct
                                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        : <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                    }
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <CardTitle className="text-sm font-medium leading-relaxed">
                                            <span className="text-muted-foreground font-mono mr-1">{idx + 1}.</span>
                                            {qr.question_text}
                                        </CardTitle>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {qr.points_awarded}/{qr.points_possible ?? '?'} pts
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize mt-1">
                                        {qr.question_type.replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className={`rounded-lg p-2 ${qr.is_correct
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30'
                                    : 'bg-red-50 dark:bg-red-950/30'
                                    }`}>
                                    <p className="text-xs text-muted-foreground mb-0.5">Your Answer</p>
                                    <p className={`text-sm font-medium ${qr.is_correct
                                        ? 'text-emerald-700 dark:text-emerald-300'
                                        : 'text-red-700 dark:text-red-300'
                                        }`}>
                                        {qr.your_answer ?? <em className="text-muted-foreground font-normal">No answer</em>}
                                    </p>
                                </div>
                                {!qr.is_correct && qr.correct_answer && (
                                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2">
                                        <p className="text-xs text-muted-foreground mb-0.5">Correct Answer</p>
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                            {qr.correct_answer}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Bottom actions */}
            <div className="flex flex-wrap gap-3 pb-6">
                <Link href={`/student/practice/${examId}`}>
                    <Button variant="outline" className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Retake Exam
                    </Button>
                </Link>
                <Link href="/student/practice">
                    <Button variant="ghost">
                        Back to Practice Exams
                    </Button>
                </Link>
            </div>
        </div>
    );
}
