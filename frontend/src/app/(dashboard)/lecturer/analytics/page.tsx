'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Loader2,
    Users,
    FileQuestion,
    BarChart3,
    TrendingUp,
    Target,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { getLecturerDashboard, getCourseAnalytics, getExamAnalytics } from '@/lib/api/analytics';
import { LecturerDashboardData, CourseAnalyticsData, ExamAnalyticsData } from '@/lib/types/api';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
} from 'recharts';

export default function LecturerAnalyticsPage() {
    const { user } = useAuthStore();
    const searchParams = useSearchParams();

    const [dashboard, setDashboard] = useState<LecturerDashboardData | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [courseData, setCourseData] = useState<CourseAnalyticsData | null>(null);
    const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
    const [examData, setExamData] = useState<ExamAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [courseLoading, setCourseLoading] = useState(false);
    const [examLoading, setExamLoading] = useState(false);

    // Load dashboard data first
    useEffect(() => {
        async function fetchDashboard() {
            try {
                const res = await getLecturerDashboard();
                if (res.success) {
                    setDashboard(res.data);
                    // Auto-select course from URL param
                    const urlCourse = searchParams.get('course');
                    if (urlCourse) {
                        setSelectedCourseId(Number(urlCourse));
                    }
                }
            } catch {
                // ignore
            } finally {
                setLoading(false);
            }
        }
        fetchDashboard();
    }, [searchParams]);

    // Load course analytics when selected course changes
    const fetchCourse = useCallback(async (courseId: number) => {
        setCourseLoading(true);
        setExamData(null);
        setSelectedExamId(null);
        try {
            const res = await getCourseAnalytics(courseId);
            if (res.success) {
                setCourseData(res.data);
            }
        } catch {
            setCourseData(null);
        } finally {
            setCourseLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCourseId) {
            fetchCourse(selectedCourseId);
        }
    }, [selectedCourseId, fetchCourse]);

    // Load exam analytics when selected exam changes
    const fetchExam = useCallback(async (examId: number) => {
        setExamLoading(true);
        try {
            const res = await getExamAnalytics(examId);
            if (res.success) {
                setExamData(res.data);
            }
        } catch {
            setExamData(null);
        } finally {
            setExamLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedExamId) {
            fetchExam(selectedExamId);
        }
    }, [selectedExamId, fetchExam]);

    const COLORS = {
        blue: 'hsl(221, 83%, 53%)',
        emerald: 'hsl(142, 71%, 45%)',
        amber: 'hsl(38, 92%, 50%)',
        red: 'hsl(0, 72%, 51%)',
        violet: 'hsl(263, 70%, 50%)',
        muted: 'hsl(215, 20%, 75%)',
    };

    const getAccuracyColor = (rate: number) => {
        if (rate >= 80) return 'text-emerald-600 dark:text-emerald-400';
        if (rate >= 60) return 'text-blue-600 dark:text-blue-400';
        if (rate >= 40) return 'text-amber-600 dark:text-amber-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getAccuracyBg = (rate: number) => {
        if (rate >= 80) return 'bg-emerald-500';
        if (rate >= 60) return 'bg-blue-500';
        if (rate >= 40) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">
                    Deep dive into course performance and question difficulty.
                </p>
            </div>

            {/* Course Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Select Course</CardTitle>
                    <CardDescription>Choose a course to view detailed analytics</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {dashboard?.course_performance?.map((course) => (
                            <button
                                key={course.course_id}
                                onClick={() => setSelectedCourseId(course.course_id)}
                                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all ${selectedCourseId === course.course_id
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                    : 'hover:bg-muted/50'
                                    }`}
                            >
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{course.course_code}</p>
                                    <p className="text-xs text-muted-foreground">{course.course_title}</p>
                                </div>
                                {selectedCourseId === course.course_id ? (
                                    <ChevronDown className="h-4 w-4 text-primary" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>
                        ))}
                    </div>
                    {(!dashboard?.course_performance || dashboard.course_performance.length === 0) && (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            No courses assigned yet.
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Course Analytics */}
            {courseLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {courseData && !courseLoading && (
                <>
                    {/* Course Stats */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Students</p>
                                        <p className="text-xl font-bold">{courseData.enrolled_students}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <FileQuestion className="h-5 w-5 text-violet-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Questions</p>
                                        <p className="text-xl font-bold">{courseData.total_questions}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Avg Score</p>
                                        <p className="text-xl font-bold">
                                            {courseData.average_score !== null ? `${courseData.average_score}%` : '—'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <Target className="h-5 w-5 text-amber-500" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">Pass Rate</p>
                                        <p className="text-xl font-bold">
                                            {courseData.pass_rate !== null ? `${courseData.pass_rate}%` : '—'}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Score Distribution */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Score Distribution — {courseData.course_code}</CardTitle>
                            <CardDescription>How students scored across all exams in this course</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {courseData.score_distribution.some(d => d.count > 0) ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={courseData.score_distribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                                        <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'hsl(0, 0%, 100%)',
                                                border: '1px solid hsl(215, 20%, 90%)',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                            }}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            formatter={(val: any) => [val ?? 0, 'Students']}
                                        />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                                            {courseData.score_distribution.map((entry, index) => {
                                                const pct = index * 10 + 5;
                                                let fill = COLORS.red;
                                                if (pct >= 70) fill = COLORS.emerald;
                                                else if (pct >= 50) fill = COLORS.amber;
                                                else if (pct >= 30) fill = COLORS.violet;
                                                return <Cell key={`dist-${index}`} fill={fill} />;
                                            })}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                                    No exam scores available for this course.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Exam Selector within Course */}
                    {courseData.exams.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Exam Deep-Dive</CardTitle>
                                <CardDescription>Select an exam for per-question analysis</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {courseData.exams.map((exam) => (
                                        <button
                                            key={exam.exam_id}
                                            onClick={() => setSelectedExamId(exam.exam_id)}
                                            className={`flex items-center justify-between rounded-lg border p-3 text-left transition-all ${selectedExamId === exam.exam_id
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                                : 'hover:bg-muted/50'
                                                }`}
                                        >
                                            <div>
                                                <p className="font-medium text-sm">{exam.exam_title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {exam.sessions} sessions · Avg: {exam.avg_score !== null ? `${exam.avg_score}%` : 'N/A'}
                                                </p>
                                            </div>
                                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}

            {/* Exam Analytics */}
            {examLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            )}

            {examData && !examLoading && (
                <>
                    {/* Exam Stats Row */}
                    <div className="grid gap-4 md:grid-cols-5">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-xs text-muted-foreground">Sessions</p>
                                <p className="text-xl font-bold">{examData.total_sessions}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-xs text-muted-foreground">Avg Score</p>
                                <p className="text-xl font-bold">
                                    {examData.average_score !== null ? `${examData.average_score}%` : '—'}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-xs text-muted-foreground">Highest</p>
                                <p className="text-xl font-bold text-emerald-600">
                                    {examData.highest_score !== null ? `${examData.highest_score}%` : '—'}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-xs text-muted-foreground">Lowest</p>
                                <p className="text-xl font-bold text-red-600">
                                    {examData.lowest_score !== null ? `${examData.lowest_score}%` : '—'}
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <p className="text-xs text-muted-foreground">Pass Rate</p>
                                <p className="text-xl font-bold">
                                    {examData.pass_rate !== null ? `${examData.pass_rate}%` : '—'}
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Pass/Fail Pie + Score Distribution */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Pass / Fail Ratio</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {examData.total_sessions > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Passed', value: examData.pass_count },
                                                    { name: 'Failed', value: examData.fail_count },
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={80}
                                                dataKey="value"
                                                label={({ name, value }) => `${name}: ${value}`}
                                            >
                                                <Cell fill={COLORS.emerald} />
                                                <Cell fill={COLORS.red} />
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
                                        No data
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Score Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={examData.score_distribution} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 90%)" />
                                        <XAxis dataKey="range" tick={{ fontSize: 9 }} />
                                        <YAxis tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill={COLORS.blue} radius={[3, 3, 0, 0]} maxBarSize={36} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Question-Level Analysis */}
                    {examData.question_analysis.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Question Difficulty Analysis</CardTitle>
                                <CardDescription>
                                    Per-question accuracy rates for &ldquo;{examData.exam_title}&rdquo;
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b text-left">
                                                <th className="pb-3 font-medium text-muted-foreground w-8">#</th>
                                                <th className="pb-3 font-medium text-muted-foreground">Question</th>
                                                <th className="pb-3 font-medium text-muted-foreground text-center">Type</th>
                                                <th className="pb-3 font-medium text-muted-foreground text-center">Difficulty</th>
                                                <th className="pb-3 font-medium text-muted-foreground text-center">Attempts</th>
                                                <th className="pb-3 font-medium text-muted-foreground text-center">Accuracy</th>
                                                <th className="pb-3 font-medium text-muted-foreground text-center">Avg Pts</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {examData.question_analysis.map((q, idx) => (
                                                <tr key={q.question_id} className="border-b last:border-0">
                                                    <td className="py-3 text-muted-foreground">{idx + 1}</td>
                                                    <td className="py-3 max-w-xs">
                                                        <p className="truncate font-medium">{q.question_text}</p>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        <span className="inline-flex rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs">
                                                            {q.question_type.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-center capitalize text-xs">
                                                        {q.difficulty_level || '—'}
                                                    </td>
                                                    <td className="py-3 text-center">{q.total_attempts}</td>
                                                    <td className="py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${getAccuracyBg(q.accuracy_rate)}`}
                                                                    style={{ width: `${q.accuracy_rate}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-xs font-medium ${getAccuracyColor(q.accuracy_rate)}`}>
                                                                {q.accuracy_rate}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-center">
                                                        {q.avg_points}/{q.max_points}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </>
            )}
        </div>
    );
}
