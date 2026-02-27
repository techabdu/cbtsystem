'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BookOpen,
    FileQuestion,
    Users,
    ClipboardList,
    AlertCircle,
    ArrowUpRight,
    Loader2,
    CheckCircle2,
    Clock,
    Send,
} from 'lucide-react';
import { getLecturerDashboard } from '@/lib/api/analytics';
import { LecturerDashboardData } from '@/lib/types/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
} from 'recharts';

export default function LecturerDashboard() {
    const { user } = useAuthStore();
    const [data, setData] = useState<LecturerDashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await getLecturerDashboard();
                if (res.success) {
                    setData(res.data);
                }
            } catch {
                // Silently handle
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const CHART_COLORS = {
        primary: 'hsl(221, 83%, 53%)',
        success: 'hsl(142, 71%, 45%)',
        warning: 'hsl(38, 92%, 50%)',
        danger: 'hsl(0, 72%, 51%)',
        muted: 'hsl(215, 20%, 65%)',
    };

    const getBarColor = (score: number | null) => {
        if (score === null) return CHART_COLORS.muted;
        if (score >= 70) return CHART_COLORS.success;
        if (score >= 50) return CHART_COLORS.warning;
        return CHART_COLORS.danger;
    };

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; className: string }> = {
            draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
            hod_review: { label: 'HOD Review', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
            school_officer_review: { label: 'Officer Review', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
            cbt_setup: { label: 'CBT Setup', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
            published: { label: 'Published', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
            grading: { label: 'Grading', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
            grading_review: { label: 'Grading Review', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
            results_published: { label: 'Results Out', className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
        };
        const badge = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
        return (
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                {badge.label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Lecturer Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.first_name}! Manage your courses and exams.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_courses ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Assigned courses</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-violet-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Questions</CardTitle>
                        <FileQuestion className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_questions ?? 0}</div>
                        <p className="text-xs text-muted-foreground">In question bank</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
                        <ClipboardList className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.published_exams ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.total_exams ?? 0} total exams
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Students</CardTitle>
                        <Users className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_students ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Total enrolled</p>
                    </CardContent>
                </Card>
            </div>

            {/* Alert: Pending Grading */}
            {(data?.pending_grading ?? 0) > 0 && (
                <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                            <div className="flex-1">
                                <p className="font-medium text-amber-800 dark:text-amber-200">
                                    {data?.pending_grading} exam{(data?.pending_grading ?? 0) > 1 ? 's' : ''} pending grading
                                </p>
                                <p className="text-sm text-amber-700 dark:text-amber-300">
                                    Manual grading is required before results can be submitted.
                                </p>
                            </div>
                            <Link
                                href="/lecturer/exams"
                                className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                            >
                                Grade Now
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Charts + Recent Exams */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Course Performance Bar Chart */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Course Performance</CardTitle>
                            <CardDescription>Average exam scores by course</CardDescription>
                        </div>
                        <Link
                            href="/lecturer/analytics"
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                            Analytics <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {data?.course_performance && data.course_performance.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={data.course_performance}
                                    margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                                    <XAxis dataKey="course_code" tick={{ fontSize: 11 }} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(0, 0%, 100%)',
                                            border: '1px solid hsl(215, 20%, 90%)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                        }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(val: any) => [val != null ? `${val}%` : 'N/A', 'Avg Score']}
                                    />
                                    <Bar dataKey="avg_score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                        {data.course_performance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(entry.avg_score)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                                No exam data available yet.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Exams */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Recent Exams</CardTitle>
                            <CardDescription>Your latest exam activity</CardDescription>
                        </div>
                        <Link
                            href="/lecturer/exams"
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                        >
                            View All <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {data?.recent_exams && data.recent_exams.length > 0 ? (
                            <div className="space-y-3">
                                {data.recent_exams.map((exam) => (
                                    <Link
                                        key={exam.id}
                                        href={`/lecturer/exams/${exam.id}`}
                                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            {exam.status === 'published' ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : exam.status === 'draft' ? (
                                                <Clock className="h-4 w-4 text-gray-400" />
                                            ) : (
                                                <Send className="h-4 w-4 text-blue-500" />
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">{exam.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(exam.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        {getStatusBadge(exam.status)}
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No exams created yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Course Details Table */}
            {data?.course_performance && data.course_performance.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Course Overview</CardTitle>
                        <CardDescription>Summary of your assigned courses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 font-medium text-muted-foreground">Course</th>
                                        <th className="pb-3 font-medium text-muted-foreground text-center">Students</th>
                                        <th className="pb-3 font-medium text-muted-foreground text-center">Exams</th>
                                        <th className="pb-3 font-medium text-muted-foreground text-center">Avg Score</th>
                                        <th className="pb-3 font-medium text-muted-foreground text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.course_performance.map((course) => (
                                        <tr key={course.course_id} className="border-b last:border-0">
                                            <td className="py-3">
                                                <p className="font-medium">{course.course_code}</p>
                                                <p className="text-xs text-muted-foreground">{course.course_title}</p>
                                            </td>
                                            <td className="py-3 text-center">{course.students}</td>
                                            <td className="py-3 text-center">{course.exams_count}</td>
                                            <td className="py-3 text-center">
                                                <span className={`font-medium ${course.avg_score === null ? 'text-muted-foreground' :
                                                    course.avg_score >= 70 ? 'text-emerald-600' :
                                                        course.avg_score >= 50 ? 'text-amber-600' : 'text-red-600'
                                                    }`}>
                                                    {course.avg_score !== null ? `${course.avg_score}%` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 text-right">
                                                <Link
                                                    href={`/lecturer/analytics?course=${course.course_id}`}
                                                    className="text-xs font-medium text-primary hover:underline"
                                                >
                                                    Analytics →
                                                </Link>
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
