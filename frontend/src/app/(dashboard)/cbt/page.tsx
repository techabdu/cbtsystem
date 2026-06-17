'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    getExams,
    getExamStats,
    cbtPublish,
    syncResults,
    updateExam,
} from '@/lib/api/exams';
import type { Exam, ExamStats } from '@/lib/types/models';
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    ClipboardList,
    Upload,
    RefreshCw,
    KeyRound,
    Calendar,
    Send,
    ArrowRight,
    FileText,
} from 'lucide-react';
import { format } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Status badge styling                                                */
/* ------------------------------------------------------------------ */

const STATUS_BADGES: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    hod_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    school_officer_review:
        'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    cbt_setup: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    grading: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    grading_review:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    results_published:
        'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

function StatusBadge({ status }: { status: string }) {
    const label = status.replace(/_/g, ' ');
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_BADGES[status] ?? 'bg-muted text-muted-foreground'}`}
        >
            {label}
        </span>
    );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                           */
/* ------------------------------------------------------------------ */

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    iconColor?: string;
}

function StatCard({ title, value, description, icon: Icon, iconColor }: StatCardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${iconColor ?? 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Schedule & Publish dialog                                           */
/* ------------------------------------------------------------------ */

interface ScheduleDialogProps {
    exam: Exam;
    onClose: () => void;
    onConfirm: (start: string, end: string) => Promise<void>;
    isProcessing: boolean;
}

function ScheduleDialog({ exam, onClose, onConfirm, isProcessing }: ScheduleDialogProps) {
    const toLocalInput = (iso: string) => {
        if (!iso) return '';
        try {
            return new Date(iso).toISOString().slice(0, 16);
        } catch {
            return '';
        }
    };

    const [start, setStart] = useState(toLocalInput(exam.start_time ?? ''));
    const [end, setEnd] = useState(toLocalInput(exam.end_time ?? ''));
    const [err, setErr] = useState('');

    const handleConfirm = async () => {
        if (!start) { setErr('Start time is required.'); return; }
        if (!end) { setErr('End time is required.'); return; }
        if (end <= start) { setErr('End time must be after start time.'); return; }
        setErr('');
        await onConfirm(new Date(start).toISOString(), new Date(end).toISOString());
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle>Schedule &amp; Publish Exam</CardTitle>
                    <CardDescription>
                        Set start and end times for <strong>{exam.title}</strong> before publishing to students.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {err && (
                        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {err}
                        </div>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Start Time *</label>
                            <input
                                type="datetime-local"
                                value={start}
                                onChange={(e) => { setStart(e.target.value); setErr(''); }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">End Time *</label>
                            <input
                                type="datetime-local"
                                value={end}
                                onChange={(e) => { setEnd(e.target.value); setErr(''); }}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            isLoading={isProcessing}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Send className="h-4 w-4" />
                            Confirm &amp; Publish
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Exam row                                                            */
/* ------------------------------------------------------------------ */

interface ExamRowProps {
    exam: Exam;
    processingId: number | null;
    onPublish: (exam: Exam) => void;
    onSync: (exam: Exam) => void;
}

function ExamRow({ exam, processingId, onPublish, onSync }: ExamRowProps) {
    const isProcessing = processingId === exam.id;
    const canPublish = exam.status === 'cbt_setup';
    const canSync = exam.status === 'published' || exam.status === 'grading';

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-xs font-bold">
                                {exam.course?.code ?? `#${exam.course_id}`}
                            </span>
                            <StatusBadge status={exam.status} />
                        </div>
                        <h3 className="text-sm font-semibold leading-tight">{exam.title}</h3>
                        {exam.course?.title && (
                            <p className="text-xs text-muted-foreground">{exam.course.title}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>{exam.total_questions} questions</span>
                            <span>{exam.total_marks} marks</span>
                            <span>{exam.duration_minutes}m</span>
                            {exam.start_time ? (
                                <span>
                                    {format(new Date(exam.start_time), 'MMM dd, yyyy HH:mm')}
                                </span>
                            ) : (
                                <span className="text-muted-foreground/60">Not yet scheduled</span>
                            )}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        <Link href={`/cbt/exams/${exam.id}`}>
                            <Button variant="outline" size="sm" className="gap-1.5">
                                Manage
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                        {canPublish && (
                            <Button
                                size="sm"
                                onClick={() => onPublish(exam)}
                                disabled={processingId !== null}
                                isLoading={isProcessing}
                                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Calendar className="h-3.5 w-3.5" />
                                Publish
                            </Button>
                        )}
                        {canSync && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSync(exam)}
                                disabled={processingId !== null}
                                isLoading={isProcessing}
                                className="gap-1.5"
                            >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Sync
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

type ActiveTab = 'cbt_setup' | 'published';

const TABS: { label: string; value: ActiveTab }[] = [
    { label: 'Awaiting Setup', value: 'cbt_setup' },
    { label: 'Published / Active', value: 'published' },
];

export default function CbtDashboard() {
    const { user } = useAuthStore();

    /* --- stats --- */
    const [stats, setStats] = useState<ExamStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    /* --- exam list --- */
    const [activeTab, setActiveTab] = useState<ActiveTab>('cbt_setup');
    const [exams, setExams] = useState<Exam[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');

    /* --- published exams (for second section) --- */
    const [publishedExams, setPublishedExams] = useState<Exam[]>([]);
    const [publishedLoading, setPublishedLoading] = useState(true);

    /* --- action state --- */
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [scheduleTarget, setScheduleTarget] = useState<Exam | null>(null);
    const [actionSuccess, setActionSuccess] = useState('');
    const [actionError, setActionError] = useState('');

    /* --- fetch stats --- */
    useEffect(() => {
        getExamStats()
            .then((res) => setStats(res.data))
            .catch(() => {/* stats failure is non-critical */})
            .finally(() => setStatsLoading(false));
    }, []);

    /* --- fetch cbt_setup exams --- */
    const fetchCbtSetupExams = useCallback(async () => {
        setListLoading(true);
        setListError('');
        try {
            const res = await getExams({ status: 'cbt_setup', is_practice: 'false', per_page: 50 });
            setExams(res.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setListError(e.response?.data?.message ?? 'Failed to load exams.');
        } finally {
            setListLoading(false);
        }
    }, []);

    /* --- fetch published exams --- */
    const fetchPublishedExams = useCallback(async () => {
        setPublishedLoading(true);
        try {
            const res = await getExams({ status: 'published', is_practice: 'false', per_page: 20 });
            setPublishedExams(res.data);
        } catch {
            /* non-critical */
        } finally {
            setPublishedLoading(false);
        }
    }, []);

    useEffect(() => { fetchCbtSetupExams(); }, [fetchCbtSetupExams]);
    useEffect(() => { fetchPublishedExams(); }, [fetchPublishedExams]);

    /* --- action: open schedule dialog --- */
    const handleOpenPublish = (exam: Exam) => {
        setActionError('');
        setScheduleTarget(exam);
    };

    /* --- action: confirm schedule & publish --- */
    const handleConfirmPublish = async (startIso: string, endIso: string) => {
        if (!scheduleTarget) return;
        const examId = scheduleTarget.id;
        setProcessingId(examId);
        try {
            await updateExam(scheduleTarget.uuid, { start_time: startIso, end_time: endIso });
            await cbtPublish(scheduleTarget.uuid);
            setScheduleTarget(null);
            setActionSuccess('Exam scheduled and published successfully.');
            setTimeout(() => setActionSuccess(''), 5000);
            await fetchCbtSetupExams();
            await fetchPublishedExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message ?? 'Failed to publish exam.');
            setScheduleTarget(null);
        } finally {
            setProcessingId(null);
        }
    };

    /* --- action: sync results --- */
    const handleSync = async (exam: Exam) => {
        setProcessingId(exam.id);
        setActionError('');
        try {
            const res = await syncResults(exam.uuid);
            const synced = res.data?.synced_sessions ?? 0;
            setActionSuccess(`Synced ${synced} session(s) for "${exam.title}".`);
            setTimeout(() => setActionSuccess(''), 5000);
            await fetchPublishedExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message ?? 'Failed to sync results.');
        } finally {
            setProcessingId(null);
        }
    };

    /* --- derived stat values --- */
    const cbtSetupCount = exams.length;
    const publishedCount = publishedExams.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">CBT Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.first_name}! Manage exam publishing and result synchronization.
                </p>
            </div>

            {/* Global messages */}
            {actionSuccess && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{actionSuccess}</p>
                </div>
            )}
            {actionError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{actionError}</p>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Awaiting CBT Setup"
                    value={statsLoading ? '—' : cbtSetupCount}
                    description="Exams approved, pending publish"
                    icon={ClipboardList}
                    iconColor="text-blue-500"
                />
                <StatCard
                    title="Published Exams"
                    value={statsLoading ? '—' : (stats?.published ?? publishedCount)}
                    description="Live exams for students"
                    icon={Upload}
                    iconColor="text-emerald-500"
                />
                <StatCard
                    title="Pending Sync"
                    value={statsLoading ? '—' : publishedCount}
                    description="Results to sync from offline server"
                    icon={RefreshCw}
                    iconColor="text-orange-500"
                />
                <StatCard
                    title="Access Codes"
                    value="—"
                    description="Per-student exam access codes"
                    icon={KeyRound}
                    iconColor="text-violet-500"
                />
            </div>

            {/* Section: Exams Awaiting CBT Setup */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Exams Awaiting Setup</h2>
                        <p className="text-sm text-muted-foreground">
                            These exams have been approved by School Officers and need to be scheduled and published.
                        </p>
                    </div>
                    <Link href="/cbt/exams">
                        <Button variant="outline" size="sm" className="gap-1.5">
                            View All
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                {listLoading ? (
                    <div className="flex min-h-[12rem] items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                ) : listError ? (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <AlertCircle className="mx-auto h-8 w-8 text-destructive/60" />
                            <p className="mt-2 text-sm text-destructive">{listError}</p>
                        </CardContent>
                    </Card>
                ) : exams.length === 0 ? (
                    <Card>
                        <CardContent className="py-14 text-center">
                            <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
                            <p className="mt-2 text-sm font-medium text-muted-foreground">
                                No exams awaiting CBT setup
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Exams approved by School Officers will appear here.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {exams.map((exam) => (
                            <ExamRow
                                key={exam.id}
                                exam={exam}
                                processingId={processingId}
                                onPublish={handleOpenPublish}
                                onSync={handleSync}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Section: Recently Published Exams */}
            <div className="space-y-3">
                <div>
                    <h2 className="text-lg font-semibold">Recently Published Exams</h2>
                    <p className="text-sm text-muted-foreground">
                        Published exams — use Sync to pull back session results from the offline server.
                    </p>
                </div>

                {publishedLoading ? (
                    <div className="flex min-h-[8rem] items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    </div>
                ) : publishedExams.length === 0 ? (
                    <Card>
                        <CardContent className="py-10 text-center">
                            <p className="text-sm text-muted-foreground">No published exams yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {publishedExams.map((exam) => (
                            <ExamRow
                                key={exam.id}
                                exam={exam}
                                processingId={processingId}
                                onPublish={handleOpenPublish}
                                onSync={handleSync}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Tab filter (compact overview) */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Filter</CardTitle>
                    <CardDescription>Filter the exam list by status</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                        {TABS.map((tab) => (
                            <button
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value)}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.value
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:bg-background/50'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        {activeTab === 'cbt_setup'
                            ? `${cbtSetupCount} exam(s) awaiting setup and publish.`
                            : `${publishedCount} published exam(s). Use Sync to pull offline results.`}
                    </p>
                </CardContent>
            </Card>

            {/* Schedule dialog */}
            {scheduleTarget !== null && (
                <ScheduleDialog
                    exam={scheduleTarget}
                    onClose={() => setScheduleTarget(null)}
                    onConfirm={handleConfirmPublish}
                    isProcessing={processingId === scheduleTarget.id}
                />
            )}
        </div>
    );
}
