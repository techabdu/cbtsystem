'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getExams, cbtPublish, updateExam, publishExam } from '@/lib/api/exams';
import type { Exam } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    CheckCircle2,
    X,
    ArrowRight,
    FileText,
    Send,
    Calendar,
} from 'lucide-react';
import { format } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Status filter tabs                                                   */
/* ------------------------------------------------------------------ */

type StatusFilter = 'cbt_setup' | 'published' | 'all';

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
    { label: 'All Exams', value: 'all' },
    { label: 'Ready for Setup', value: 'cbt_setup' },
    { label: 'Published / Active', value: 'published' },
];

const STATUS_BADGES: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    hod_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    school_officer_review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    cbt_setup: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    ongoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AdminExamsPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('cbt_setup');
    const [exams, setExams] = useState<Exam[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [actionError, setActionError] = useState('');
    const [processingId, setProcessingId] = useState<number | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectDialogError, setRejectDialogError] = useState('');
    const [showScheduleDialog, setShowScheduleDialog] = useState<Exam | null>(null);
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');
    const [scheduleError, setScheduleError] = useState('');

    const fetchExams = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Exclude practice exams from admin exam management (they're handled directly by lecturers)
            const filters = statusFilter === 'all'
                ? { is_practice: 'false', per_page: 50 }
                : { status: statusFilter, is_practice: 'false', per_page: 50 };
            const res = await getExams(filters);
            setExams(res.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to load exams.');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter]);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const openPublishDialog = (exam: Exam) => {
        const toLocal = (iso: string) => {
            if (!iso) return '';
            try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
        };
        setScheduleStart(toLocal(exam.start_time || ''));
        setScheduleEnd(toLocal(exam.end_time || ''));
        setScheduleError('');
        setShowScheduleDialog(exam);
    };

    const handleScheduleAndPublish = async () => {
        if (!showScheduleDialog) return;
        if (!scheduleStart) { setScheduleError('Start time is required.'); return; }
        if (!scheduleEnd) { setScheduleError('End time is required.'); return; }
        if (scheduleEnd <= scheduleStart) { setScheduleError('End time must be after start time.'); return; }
        const examId = showScheduleDialog.id;
        setProcessingId(examId);
        setScheduleError('');
        setActionError('');
        try {
            await updateExam(examId, {
                start_time: new Date(scheduleStart).toISOString(),
                end_time: new Date(scheduleEnd).toISOString(),
            });
            await cbtPublish(examId);
            setShowScheduleDialog(null);
            setActionSuccess('Exam scheduled and published successfully! Students can now access it.');
            setTimeout(() => setActionSuccess(''), 4000);
            await fetchExams();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setScheduleError(e.response?.data?.message || 'Failed to publish exam.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (examId: number) => {
        // Not used manually for CBT anymore since the reject flow was updated, but keeping signature if needed
        setShowRejectDialog(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Exam Management</h1>
                <p className="text-muted-foreground">
                    Review exams approved by School Officers and set them up for publication.
                </p>
            </div>

            {/* Messages */}
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
            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Filter tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                {STATUS_FILTERS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setStatusFilter(tab.value)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${statusFilter === tab.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            {isLoading ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : exams.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <CardTitle className="mt-2 text-sm font-medium text-muted-foreground">No Exams Found</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground mt-1">
                            {statusFilter === 'cbt_setup'
                                ? "There are currently no new exams awaiting CBT setup."
                                : "No exams match your current filters."}
                        </CardDescription>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {exams.map(exam => (
                        <Card key={exam.id} className="shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-bold font-mono">
                                                {exam.course?.code || `#${exam.course_id}`}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[exam.status] || ''}`}>
                                                {exam.status.replace('_', ' ')}
                                            </span>
                                            {exam.is_practice && (
                                                <span className="inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                                                    Practice
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-sm leading-tight">{exam.title}</h3>
                                        {exam.course?.title && (
                                            <p className="text-xs text-muted-foreground">{exam.course.title}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                            <span>{exam.total_questions} questions</span>
                                            <span>{exam.total_marks} marks</span>
                                            <span>{exam.duration_minutes}m</span>
                                            {exam.start_time
                                                ? <span>Starts: {format(new Date(exam.start_time), 'MMM dd, yyyy HH:mm')}</span>
                                                : <span className="text-muted-foreground/60">Not yet scheduled</span>
                                            }
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Link href={`/cbt/exams/${exam.id}`}>
                                            <Button variant="outline" size="sm" className="gap-2">
                                                Manage
                                                <ArrowRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                        {exam.status === 'cbt_setup' && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    onClick={() => openPublishDialog(exam)}
                                                    disabled={processingId !== null}
                                                    isLoading={processingId === exam.id}
                                                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    Schedule &amp; Publish
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Schedule & Publish Dialog */}
            {showScheduleDialog !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Schedule &amp; Publish Exam</CardTitle>
                            <CardDescription>
                                Set the start and end times for <strong>{showScheduleDialog.title}</strong> before publishing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {scheduleError && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <p className="text-sm">{scheduleError}</p>
                                </div>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduleStart}
                                        onChange={(e) => { setScheduleStart(e.target.value); setScheduleError(''); }}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Time *</label>
                                    <input
                                        type="datetime-local"
                                        value={scheduleEnd}
                                        onChange={(e) => { setScheduleEnd(e.target.value); setScheduleError(''); }}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowScheduleDialog(null)} disabled={processingId !== null}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleScheduleAndPublish}
                                    isLoading={processingId === showScheduleDialog.id}
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Send className="h-4 w-4" />
                                    Confirm &amp; Publish
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Reject Dialog */}
            {showRejectDialog !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Reject Exam</CardTitle>
                            <CardDescription>
                                The exam will be returned to draft. You must provide a reason so the lecturer knows what to fix.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {rejectDialogError && (
                                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <p className="text-sm">{rejectDialogError}</p>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Reason for rejection <span className="text-red-500">*</span></label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => { setRejectReason(e.target.value); setRejectDialogError(''); }}
                                    placeholder="Explain what needs to be corrected..."
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => { setShowRejectDialog(null); setRejectDialogError(''); }}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={() => handleReject(showRejectDialog)}
                                    isLoading={processingId === showRejectDialog}
                                    className="gap-2 bg-red-600 hover:bg-red-700"
                                >
                                    <X className="h-4 w-4" />
                                    Confirm Reject
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
