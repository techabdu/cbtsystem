'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store/authStore';
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
} from 'lucide-react';
import { getSystemAnalytics } from '@/lib/api/analytics';
import { SystemAnalyticsData } from '@/lib/types/api';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
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

export default function AdminDashboard() {
    const { user } = useAuthStore();
    const [data, setData] = useState<SystemAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await getSystemAnalytics();
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

    // Prepare pie chart data
    const examStatusData = data?.exams_by_status
        ? Object.entries(data.exams_by_status)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => ({
                name: status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                value: count,
                fill: STATUS_COLORS[status] || 'hsl(215, 20%, 65%)',
            }))
        : [];

    const formatAction = (action: string) => {
        return action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    };

    const getRoleBadge = (role: string | null) => {
        if (!role) return null;
        const colors: Record<string, string> = {
            admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            lecturer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            student: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            cbt: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
            edu_portal: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        };
        return (
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-700'}`}>
                {role}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.first_name}! System overview and management.
                </p>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_users ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.active_users ?? 0} active
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                        <ClipboardList className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.total_exams ?? 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {data?.total_sessions ?? 0} sessions
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-violet-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-violet-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.completion_rate !== null && data?.completion_rate !== undefined
                                ? `${data.completion_rate}%`
                                : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">Exam completion rate</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                        <TrendingUp className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {data?.average_score !== null && data?.average_score !== undefined
                                ? `${data.average_score}%`
                                : '—'}
                        </div>
                        <p className="text-xs text-muted-foreground">Across all exams</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid gap-4 md:grid-cols-5">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <GraduationCap className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
                        <p className="text-xs text-muted-foreground">Students</p>
                        <p className="text-lg font-bold">{data?.total_students ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                        <p className="text-xs text-muted-foreground">Lecturers</p>
                        <p className="text-lg font-bold">{data?.total_lecturers ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <Shield className="h-5 w-5 mx-auto mb-1 text-red-500" />
                        <p className="text-xs text-muted-foreground">Admins</p>
                        <p className="text-lg font-bold">{data?.total_admins ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <BookOpen className="h-5 w-5 mx-auto mb-1 text-violet-500" />
                        <p className="text-xs text-muted-foreground">Courses</p>
                        <p className="text-lg font-bold">{data?.total_courses ?? 0}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <FileQuestion className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                        <p className="text-xs text-muted-foreground">Questions</p>
                        <p className="text-lg font-bold">{data?.total_questions ?? 0}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Daily Activity (takes 2 cols) */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">Daily Activity</CardTitle>
                        <CardDescription>Logins and exams taken over the past 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.daily_activity && data.daily_activity.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={data.daily_activity} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                    <defs>
                                        <linearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="examGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
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
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(0, 0%, 100%)',
                                            border: '1px solid hsl(215, 20%, 90%)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                        }}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="logins"
                                        stroke="hsl(221, 83%, 53%)"
                                        fill="url(#loginGradient)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="exams_taken"
                                        stroke="hsl(142, 71%, 45%)"
                                        fill="url(#examGradient)"
                                        strokeWidth={2}
                                    />
                                    <Legend />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                                No activity data available.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Exams by Status Pie */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Exams by Status</CardTitle>
                        <CardDescription>Distribution across workflow stages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {examStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={280}>
                                <PieChart>
                                    <Pie
                                        data={examStatusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={75}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {examStatusData.map((entry, index) => (
                                            <Cell key={`pie-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(0, 0%, 100%)',
                                            border: '1px solid hsl(215, 20%, 90%)',
                                            borderRadius: '8px',
                                            fontSize: '13px',
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{ fontSize: '11px' }}
                                        formatter={(value) => <span className="text-xs">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                                No exams created yet.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent System Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Recent System Activity
                    </CardTitle>
                    <CardDescription>Latest actions across the system</CardDescription>
                </CardHeader>
                <CardContent>
                    {data?.recent_activity && data.recent_activity.length > 0 ? (
                        <div className="space-y-3">
                            {data.recent_activity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-center justify-between rounded-lg border p-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="text-sm">
                                                <span className="font-medium">{activity.user_name}</span>
                                                {' · '}
                                                <span className="text-muted-foreground">{formatAction(activity.action)}</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {activity.entity_type && (
                                                    <span className="capitalize">{activity.entity_type.replace(/_/g, ' ')} · </span>
                                                )}
                                                {new Date(activity.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    {getRoleBadge(activity.user_role)}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            No system activity recorded yet.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
