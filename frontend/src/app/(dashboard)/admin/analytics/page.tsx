'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Users,
    GraduationCap,
    BookOpen,
    ClipboardList,
    FileQuestion,
    Activity,
    CheckCircle2,
    TrendingUp,
    Loader2,
    Shield,
    ArrowLeft,
    Monitor,
    Globe,
    UserCheck,
    UserX,
} from 'lucide-react';
import { getSystemAnalytics } from '@/lib/api/analytics';
import { SystemAnalyticsData } from '@/lib/types/api';
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    Legend,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
    draft: 'hsl(0, 0%, 65%)',
    hod_review: 'hsl(38, 92%, 50%)',
    school_officer_review: 'hsl(25, 95%, 53%)',
    cbt_setup: 'hsl(221, 83%, 53%)',
    published: 'hsl(142, 71%, 45%)',
    grading: 'hsl(263, 70%, 50%)',
    grading_review: 'hsl(280, 60%, 55%)',
    results_published: 'hsl(173, 80%, 40%)',
    archived: 'hsl(215, 20%, 55%)',
};

const ROLE_BADGE_COLORS: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    lecturer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    student: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    cbt: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    edu_portal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const ALL_STATUSES = [
    'draft',
    'hod_review',
    'school_officer_review',
    'cbt_setup',
    'published',
    'grading',
    'grading_review',
    'results_published',
];

function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function RoleBadge({ role }: { role: string | null }) {
    if (!role) return <span className="text-xs text-muted-foreground">—</span>;
    return (
        <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                ROLE_BADGE_COLORS[role] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
        >
            {role}
        </span>
    );
}

type ExtendedData = SystemAnalyticsData & {
    total_cbt?: number;
    total_edu_portal?: number;
};

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<ExtendedData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await getSystemAnalytics();
                if (res.success) {
                    setData(res.data as ExtendedData);
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

    const inactiveUsers = (data?.total_users ?? 0) - (data?.active_users ?? 0);

    const examStatusBarData = ALL_STATUSES.map((status) => ({
        status: formatStatus(status),
        rawStatus: status,
        count: (data?.exams_by_status as Record<string, number> | undefined)?.[status] ?? 0,
    }));

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-1">
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit mb-1"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">System Analytics</h1>
                <p className="text-muted-foreground">
                    Detailed metrics and activity breakdown across the entire CBT platform.
                </p>
            </div>

            {/* User Breakdown */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">User Breakdown</h2>
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <Users className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.total_users ?? 0}</div>
                            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                    <UserCheck className="h-3 w-3 text-emerald-500" />
                                    {data?.active_users ?? 0} active
                                </span>
                                <span className="inline-flex items-center gap-1">
                                    <UserX className="h-3 w-3 text-red-400" />
                                    {inactiveUsers} inactive
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Students</CardTitle>
                            <GraduationCap className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.total_students ?? 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Registered students</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-sky-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Lecturers</CardTitle>
                            <Users className="h-4 w-4 text-sky-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.total_lecturers ?? 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Teaching staff</p>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Admins</CardTitle>
                            <Shield className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data?.total_admins ?? 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">System administrators</p>
                        </CardContent>
                    </Card>

                    {data?.total_cbt !== undefined && (
                        <Card className="border-l-4 border-l-violet-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">CBT Officers</CardTitle>
                                <Monitor className="h-4 w-4 text-violet-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.total_cbt}</div>
                                <p className="text-xs text-muted-foreground mt-1">CBT role users</p>
                            </CardContent>
                        </Card>
                    )}

                    {data?.total_edu_portal !== undefined && (
                        <Card className="border-l-4 border-l-amber-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Edu Portal</CardTitle>
                                <Globe className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data.total_edu_portal}</div>
                                <p className="text-xs text-muted-foreground mt-1">Portal users</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </section>

            {/* Content Overview */}
            <section className="space-y-3">
                <h2 className="text-base font-semibold">Content Overview</h2>
                <div className="grid gap-4 grid-cols-3 md:grid-cols-6">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <BookOpen className="h-5 w-5 mx-auto mb-2 text-violet-500" />
                            <p className="text-xs text-muted-foreground">Courses</p>
                            <p className="text-2xl font-bold">{data?.total_courses ?? 0}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <FileQuestion className="h-5 w-5 mx-auto mb-2 text-amber-500" />
                            <p className="text-xs text-muted-foreground">Questions</p>
                            <p className="text-2xl font-bold">{data?.total_questions ?? 0}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <ClipboardList className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
                            <p className="text-xs text-muted-foreground">Exams</p>
                            <p className="text-2xl font-bold">{data?.total_exams ?? 0}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Activity className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                            <p className="text-xs text-muted-foreground">Sessions</p>
                            <p className="text-2xl font-bold">{data?.total_sessions ?? 0}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-sky-500" />
                            <p className="text-xs text-muted-foreground">Avg Score</p>
                            <p className="text-2xl font-bold">
                                {data?.average_score != null ? `${data.average_score}%` : '—'}
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-emerald-500" />
                            <p className="text-xs text-muted-foreground">Completion</p>
                            <p className="text-2xl font-bold">
                                {data?.completion_rate != null ? `${data.completion_rate}%` : '—'}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Exam Workflow Status BarChart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Exam Workflow Status</CardTitle>
                    <CardDescription>Number of exams at each stage of the workflow pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                    {examStatusBarData.some((d) => d.count > 0) ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                                data={examStatusBarData}
                                margin={{ top: 5, right: 10, left: -15, bottom: 60 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                                <XAxis
                                    dataKey="status"
                                    tick={{ fontSize: 10 }}
                                    angle={-35}
                                    textAnchor="end"
                                    interval={0}
                                />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(0, 0%, 100%)',
                                        border: '1px solid hsl(215, 20%, 90%)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                    formatter={(val) => [val, 'Exams']}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={52}>
                                    {examStatusBarData.map((entry) => (
                                        <Cell
                                            key={`bar-${entry.rawStatus}`}
                                            fill={STATUS_COLORS[entry.rawStatus] ?? 'hsl(215, 20%, 65%)'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                            No exams created yet.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Daily Activity AreaChart */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Daily Activity — Last 30 Days</CardTitle>
                    <CardDescription>System-wide logins and exams taken over the past 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                    {data?.daily_activity && data.daily_activity.length > 0 ? (
                        <ResponsiveContainer width="100%" height={320}>
                            <AreaChart
                                data={data.daily_activity}
                                margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="analyticsLoginGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="analyticsExamGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.35} />
                                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(v) => {
                                        const d = new Date(v);
                                        return `${d.getMonth() + 1}/${d.getDate()}`;
                                    }}
                                />
                                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(0, 0%, 100%)',
                                        border: '1px solid hsl(215, 20%, 90%)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                    }}
                                    labelFormatter={(label) =>
                                        new Date(label).toLocaleDateString(undefined, {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric',
                                        })
                                    }
                                />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                                <Area
                                    type="monotone"
                                    dataKey="logins"
                                    name="Logins"
                                    stroke="hsl(221, 83%, 53%)"
                                    fill="url(#analyticsLoginGrad)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="exams_taken"
                                    name="Exams Taken"
                                    stroke="hsl(142, 71%, 45%)"
                                    fill="url(#analyticsExamGrad)"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                            No activity data available for the past 30 days.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Full System Activity Log */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Full System Activity Log
                    </CardTitle>
                    <CardDescription>Latest 20 actions recorded across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                    {data?.recent_activity && data.recent_activity.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left">
                                        <th className="pb-3 pr-4 font-medium text-muted-foreground w-8">#</th>
                                        <th className="pb-3 pr-4 font-medium text-muted-foreground">User</th>
                                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Role</th>
                                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Action</th>
                                        <th className="pb-3 pr-4 font-medium text-muted-foreground">Entity Type</th>
                                        <th className="pb-3 font-medium text-muted-foreground whitespace-nowrap">Date / Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recent_activity.slice(0, 20).map((activity, idx) => (
                                        <tr
                                            key={activity.id}
                                            className={`border-b last:border-0 ${idx % 2 !== 0 ? 'bg-muted/30' : ''}`}
                                        >
                                            <td className="py-3 pr-4 text-xs text-muted-foreground">{idx + 1}</td>
                                            <td className="py-3 pr-4 font-medium whitespace-nowrap">{activity.user_name}</td>
                                            <td className="py-3 pr-4">
                                                <RoleBadge role={activity.user_role} />
                                            </td>
                                            <td className="py-3 pr-4 text-muted-foreground">{formatAction(activity.action)}</td>
                                            <td className="py-3 pr-4 text-muted-foreground capitalize text-xs">
                                                {activity.entity_type ? activity.entity_type.replace(/_/g, ' ') : '—'}
                                            </td>
                                            <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(activity.created_at).toLocaleString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            No system activity recorded yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
