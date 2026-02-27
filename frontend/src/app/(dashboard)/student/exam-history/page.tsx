'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { getStudentPerformance } from '@/lib/api/analytics';
import { downloadStudentTranscript } from '@/lib/api/exports';
import { useAuthStore } from '@/lib/store/authStore';
import type { StudentPerformanceData } from '@/lib/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Loader2,
    AlertCircle,
    ClipboardList,
    Download,
    GraduationCap,
    TrendingUp,
    Trophy,
    BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Grade calculation                                                   */
/* ------------------------------------------------------------------ */

function getGrade(percentage: number): string {
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 45) return 'D';
    return 'F';
}

function getGradeColor(grade: string): string {
    switch (grade) {
        case 'A': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
        case 'B': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
        case 'C': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
        case 'D': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
        default:  return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
}

/* ------------------------------------------------------------------ */
/*  Summary card helper                                                 */
/* ------------------------------------------------------------------ */

interface SummaryCardProps {
    label: string;
    value: string | number;
    icon: React.ElementType;
    iconClass: string;
    bgClass: string;
}

function SummaryCard({ label, value, icon: Icon, iconClass, bgClass }: SummaryCardProps) {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2', bgClass)}>
                        <Icon className={cn('h-5 w-5', iconClass)} />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className="text-2xl font-bold">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function StudentExamHistoryPage() {
    const { user } = useAuthStore();
    const [performance, setPerformance] = useState<StudentPerformanceData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        (async () => {
            setIsLoading(true);
            setError('');
            try {
                const res = await getStudentPerformance();
                setPerformance(res.data);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setError(e.response?.data?.message || 'Failed to load exam history.');
            } finally {
                setIsLoading(false);
            }
        })();
    }, []);

    const handleDownloadTranscript = async () => {
        if (!user) return;
        try {
            await downloadStudentTranscript(user.id);
        } catch {
            setError('Failed to download transcript. Please try again.');
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Loading state                                                       */
    /* ------------------------------------------------------------------ */

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const results = performance?.recent_results ?? [];
    const hasResults = results.length > 0;

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Exam History</h1>
                    <p className="text-muted-foreground">
                        View all your completed exams and download your transcript.
                    </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                    {user && (
                        <span className="hidden sm:inline text-sm text-muted-foreground font-medium">
                            {user.full_name}
                        </span>
                    )}
                    <Button
                        onClick={handleDownloadTranscript}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                        <Download className="h-4 w-4" />
                        Download Transcript (PDF)
                    </Button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Summary stats */}
            {performance && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard
                        label="Exams Taken"
                        value={performance.total_exams_taken}
                        icon={ClipboardList}
                        iconClass="text-primary"
                        bgClass="bg-primary/10"
                    />
                    <SummaryCard
                        label="Average Score"
                        value={
                            performance.average_score != null
                                ? `${performance.average_score.toFixed(1)}%`
                                : '—'
                        }
                        icon={TrendingUp}
                        iconClass="text-blue-600 dark:text-blue-400"
                        bgClass="bg-blue-100 dark:bg-blue-900/40"
                    />
                    <SummaryCard
                        label="Highest Score"
                        value={
                            performance.highest_score != null
                                ? `${performance.highest_score.toFixed(1)}%`
                                : '—'
                        }
                        icon={Trophy}
                        iconClass="text-amber-600 dark:text-amber-400"
                        bgClass="bg-amber-100 dark:bg-amber-900/40"
                    />
                    <SummaryCard
                        label="Pass Rate"
                        value={
                            performance.pass_rate != null
                                ? `${performance.pass_rate.toFixed(1)}%`
                                : '—'
                        }
                        icon={BarChart3}
                        iconClass="text-emerald-600 dark:text-emerald-400"
                        bgClass="bg-emerald-100 dark:bg-emerald-900/40"
                    />
                </div>
            )}

            {/* Empty state */}
            {!hasResults && !error && (
                <Card>
                    <CardContent className="py-16 text-center">
                        <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-3 text-sm font-medium text-muted-foreground">
                            No exam history yet.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Take your first exam to see results here.
                        </p>
                        <Link href="/student/exams" className="mt-4 inline-block">
                            <Button variant="outline" size="sm" className="gap-2">
                                <ClipboardList className="h-4 w-4" />
                                Browse Exams
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Exam history table */}
            {hasResults && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            Completed Exams ({results.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                                            Exam Title
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                                            Course
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                                            Date
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">
                                            Score
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                            Percentage
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                            Grade
                                        </th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((result) => {
                                        const grade = getGrade(result.percentage);
                                        const gradeColor = getGradeColor(grade);

                                        return (
                                            <tr
                                                key={result.exam_id}
                                                className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                                onClick={() =>
                                                    (window.location.href = `/student/results/${result.exam_id}`)
                                                }
                                            >
                                                {/* Exam Title */}
                                                <td className="px-4 py-3 max-w-xs">
                                                    <Link
                                                        href={`/student/results/${result.exam_id}`}
                                                        className="block hover:text-primary transition-colors"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <p className="font-medium truncate max-w-[220px]">
                                                            {result.exam_title}
                                                        </p>
                                                    </Link>
                                                </td>

                                                {/* Course */}
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono">
                                                        {result.course_code}
                                                    </span>
                                                </td>

                                                {/* Date */}
                                                <td className="px-4 py-3 hidden lg:table-cell">
                                                    <span className="text-xs text-muted-foreground font-mono">
                                                        {result.submitted_at
                                                            ? format(new Date(result.submitted_at), 'MMM dd, yyyy')
                                                            : '—'}
                                                    </span>
                                                </td>

                                                {/* Score */}
                                                <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                    <span className="font-medium tabular-nums">
                                                        {result.score}
                                                        <span className="text-muted-foreground font-normal">
                                                            /{result.total_marks}
                                                        </span>
                                                    </span>
                                                </td>

                                                {/* Percentage */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-semibold tabular-nums">
                                                        {result.percentage.toFixed(1)}%
                                                    </span>
                                                </td>

                                                {/* Grade */}
                                                <td className="px-4 py-3 text-center">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center justify-center rounded-full w-8 h-8 text-sm font-bold',
                                                            gradeColor
                                                        )}
                                                    >
                                                        {grade}
                                                    </span>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3 text-center">
                                                    {result.passed ? (
                                                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                                            Passed
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                            Failed
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* By-course breakdown */}
            {performance && performance.by_course.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Performance by Course
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Course</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Exams Taken</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Exams Passed</th>
                                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">Avg Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performance.by_course.map((course) => (
                                        <tr key={course.course_id} className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-3">
                                                <p className="font-medium">{course.course_title}</p>
                                                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono mt-0.5">
                                                    {course.course_code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-medium">{course.exams_taken}</td>
                                            <td className="px-4 py-3 text-center font-medium">{course.exams_passed}</td>
                                            <td className="px-4 py-3 text-center font-semibold">
                                                {course.avg_score != null
                                                    ? `${course.avg_score.toFixed(1)}%`
                                                    : '—'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
