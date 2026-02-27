'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    BookOpen,
    CalendarCheck,
    GraduationCap,
    TrendingUp,
    Trophy,
    Target,
    ArrowUpRight,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';
import { getStudentPerformance } from '@/lib/api/analytics';
import { StudentPerformanceData } from '@/lib/types/api';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Cell,
} from 'recharts';

export default function StudentDashboard() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [data, setData] = useState<StudentPerformanceData | null>(null);
    const [loading, setLoading] = useState(true);

    // Force profile completion before showing dashboard
    useEffect(() => {
        if (user && !user.is_profile_complete) {
            router.replace('/student/complete-profile');
        }
    }, [user, router]);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await getStudentPerformance();
                if (res.success) {
                    setData(res.data);
                }
            } catch {
                // Silently handle — dashboard will show placeholder
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Student Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.first_name}! Here&apos;s your academic overview.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.enrolled_courses ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Active enrollments</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.upcoming_exams ?? 0}</div>
                        <p className="text-xs text-muted-foreground">Scheduled ahead</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Exams Completed</CardTitle>
                        <GraduationCap className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_exams_taken ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.total_exams_passed ?? 0} passed
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-violet-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.average_score !== null && data?.average_score !== undefined
                                ? `${data.average_score}%`
                                : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Pass rate: {data?.pass_rate !== null && data?.pass_rate !== undefined ? `${data.pass_rate}%` : '—'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Highest Score</p>
                                <p className="text-xl font-bold">
                                    {data?.highest_score !== null && data?.highest_score !== undefined
                                        ? `${data.highest_score}%`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <Target className="h-5 w-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Lowest Score</p>
                                <p className="text-xl font-bold">
                                    {data?.lowest_score !== null && data?.lowest_score !== undefined
                                        ? `${data.lowest_score}%`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Pass Rate</p>
                                <p className="text-xl font-bold">
                                    {data?.pass_rate !== null && data?.pass_rate !== undefined
                                        ? `${data.pass_rate}%`
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Score Trend Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Score Trend</CardTitle>
                        <CardDescription>Your exam scores over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.score_trend && data.score_trend.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <LineChart data={data.score_trend} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                                    <XAxis
                                        dataKey="exam_title"
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + '…' : v}
                                    />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(0, 0%, 100%)',
                                            border: '1px solid hsl(215, 20%, 90%)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                        }}
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        formatter={(val: any) => [`${val ?? 0}%`, 'Score']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke={CHART_COLORS.primary}
                                        strokeWidth={2.5}
                                        dot={{ r: 4, fill: CHART_COLORS.primary }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                                No exam data yet. Take your first exam to see your trend!
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Per-Course Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Performance by Course</CardTitle>
                        <CardDescription>Average score across your courses</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.by_course && data.by_course.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={data.by_course}
                                    margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                                    layout="horizontal"
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
                                        formatter={(val: any) => [`${val ?? 0}%`, 'Avg Score']}
                                    />
                                    <Bar dataKey="avg_score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                        {data.by_course.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={getBarColor(entry.avg_score)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                                Complete exams across courses to see comparisons.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Results */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-base">Recent Exam Results</CardTitle>
                        <CardDescription>Your latest exam outcomes</CardDescription>
                    </div>
                    <Link
                        href="/student/results"
                        className="text-sm font-medium text-primary hover:underline flex items-center gap-1"
                    >
                        View All <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                </CardHeader>
                <CardContent>
                    {data?.recent_results && data.recent_results.length > 0 ? (
                        <div className="space-y-3">
                            {data.recent_results.map((result) => (
                                <div
                                    key={result.exam_id}
                                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                                >
                                    <div className="flex items-center gap-3">
                                        {result.passed ? (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            </div>
                                        ) : (
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-medium text-sm">{result.exam_title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {result.course_code} · {new Date(result.submitted_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-sm ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {result.percentage}%
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {result.score}/{result.total_marks}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            No exam results yet. Your results will appear here after you take exams.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
