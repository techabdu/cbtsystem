'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { format } from 'date-fns';
import {
    getExam,
    updateExam,
    rejectExam,
    publishExam,
} from '@/lib/api/exams';
import type { Exam, ExamQuestion } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Send,
    Calendar,
    BookOpen,
    ClipboardList,
} from 'lucide-react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Badge helpers                                                       */
/* ------------------------------------------------------------------ */

const STATUS_BADGES: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
    pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    verified: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    ongoing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    completed: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    archived: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const TYPE_BADGES: Record<string, string> = {
    quiz: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    midterm: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    final: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    practice: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    makeup: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const Q_TYPE_BADGES: Record<string, string> = {
    multiple_choice: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    true_false: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    fill_in_blank: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    essay: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const Q_TYPE_LABELS: Record<string, string> = {
    multiple_choice: 'Multiple Choice',
    true_false: 'True / False',
    fill_in_blank: 'Fill in Blank',
    essay: 'Essay',
};

const DIFF_BADGES: Record<string, string> = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

type TabType = 'overview' | 'questions';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function AdminExamDetailPage() {
    const params = useParams();
    const examId = Number(params.id);

    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionSuccess, setActionSuccess] = useState('');
    const [actionError, setActionError] = useState('');

    // Reject dialog state
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectDialogError, setRejectDialogError] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Schedule & Publish dialog state
    const [showScheduleDialog, setShowScheduleDialog] = useState(false);
    const [scheduleStart, setScheduleStart] = useState('');
    const [scheduleEnd, setScheduleEnd] = useState('');
    const [scheduleError, setScheduleError] = useState('');
    const [isPublishing, setIsPublishing] = useState(false);

    /* ------------------------------------------------------------------ */
    /*  Fetch exam                                                          */
    /* ------------------------------------------------------------------ */

    const fetchExam = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await getExam(examId);
            setExam(res.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to load exam.');
        } finally {
            setIsLoading(false);
        }
    }, [examId]);

    useEffect(() => { fetchExam(); }, [fetchExam]);

    /* ------------------------------------------------------------------ */
    /*  Open Schedule & Publish dialog                                      */
    /* ------------------------------------------------------------------ */

    const openScheduleDialog = () => {
        const toLocal = (iso: string) => {
            if (!iso) return '';
            try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
        };
        setScheduleStart(toLocal(exam?.start_time || ''));
        setScheduleEnd(toLocal(exam?.end_time || ''));
        setScheduleError('');
        setShowScheduleDialog(true);
    };

    /* ------------------------------------------------------------------ */
    /*  Reject action                                                       */
    /* ------------------------------------------------------------------ */

    const handleReject = async () => {
        if (!exam) return;
        if (!rejectReason.trim()) {
            setRejectDialogError('A reason for rejection is required.');
            return;
        }
        setIsRejecting(true);
        setShowRejectDialog(false);
        setRejectDialogError('');
        setActionError('');
        try {
            const res = await rejectExam(exam.id, rejectReason || undefined);
            setExam(res.data);
            setRejectReason('');
            setActionSuccess('Exam rejected and returned to draft. The lecturer will be notified.');
            setTimeout(() => setActionSuccess(''), 5000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setActionError(e.response?.data?.message || 'Failed to reject exam.');
            setTimeout(() => setActionError(''), 5000);
        } finally {
            setIsRejecting(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Schedule & Publish action                                           */
    /* ------------------------------------------------------------------ */

    const handleScheduleAndPublish = async () => {
        if (!exam) return;
        if (!scheduleStart) { setScheduleError('Start time is required.'); return; }
        if (!scheduleEnd) { setScheduleError('End time is required.'); return; }
        if (scheduleEnd <= scheduleStart) { setScheduleError('End time must be after start time.'); return; }

        setIsPublishing(true);
        setScheduleError('');
        setActionError('');
        try {
            await updateExam(exam.id, {
                start_time: new Date(scheduleStart).toISOString(),
                end_time: new Date(scheduleEnd).toISOString(),
            });
            const res = await publishExam(exam.id);
            setExam(res.data);
            setShowScheduleDialog(false);
            setActionSuccess('Exam scheduled and published successfully! Students can now access it.');
            setTimeout(() => setActionSuccess(''), 5000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setScheduleError(e.response?.data?.message || 'Failed to publish exam.');
        } finally {
            setIsPublishing(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Loading / Error states                                              */
    /* ------------------------------------------------------------------ */

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="space-y-4">
                <Link href="/admin/exams">
                    <Button variant="outline" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Exams
                    </Button>
                </Link>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error || 'Exam not found.'}</p>
                </div>
            </div>
        );
    }

    const isVerified = exam.status === 'verified';
    const canAct = isVerified; // only verified exams can be rejected or published from here

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <Link href="/admin/exams">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[exam.status] || ''}`}>
                                {exam.status.replace('_', ' ')}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGES[exam.exam_type] || ''}`}>
                                {exam.exam_type}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                            {exam.course?.code || `Course #${exam.course_id}`} &bull; {exam.total_questions} questions &bull; {exam.total_marks} marks
                        </p>
                        {exam.creator && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Created by <span className="font-medium">{exam.creator.full_name}</span>
                            </p>
                        )}
                    </div>
                </div>

                {/* Action buttons — only shown for verified exams */}
                {canAct && (
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => { setShowRejectDialog(true); setRejectReason(''); }}
                            disabled={isRejecting || isPublishing}
                            className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                        >
                            <X className="h-4 w-4" />
                            Reject
                        </Button>
                        <Button
                            onClick={openScheduleDialog}
                            disabled={isRejecting || isPublishing}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Calendar className="h-4 w-4" />
                            Schedule &amp; Publish
                        </Button>
                    </div>
                )}
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

            {/* Read-only notice */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-sm">
                    This is a <span className="font-semibold">read-only</span> view. Review the exam details and questions, then reject or schedule &amp; publish.
                </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                {([
                    { value: 'overview', label: 'Overview', icon: BookOpen },
                    { value: 'questions', label: `Questions (${exam.total_questions})`, icon: ClipboardList },
                ] as const).map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        onClick={() => setActiveTab(value)}
                        className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${activeTab === value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                            }`}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {/* ==================== OVERVIEW TAB ==================== */}
            {activeTab === 'overview' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Exam Details</CardTitle>
                        <CardDescription>Full exam configuration as submitted by the lecturer.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Core details */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <DetailRow label="Course" value={exam.course ? `${exam.course.code} — ${exam.course.title}` : `#${exam.course_id}`} />
                            <DetailRow label="Exam Type" value={exam.exam_type.charAt(0).toUpperCase() + exam.exam_type.slice(1)} />
                            <DetailRow label="Duration" value={`${exam.duration_minutes} minutes`} />
                            <DetailRow label="Total Marks" value={String(exam.total_marks)} />
                            <DetailRow label="Passing Marks" value={String(exam.passing_marks)} />
                            <DetailRow label="Total Questions" value={String(exam.total_questions)} />
                            <DetailRow label="Questions per Page" value={String(exam.questions_per_page)} />
                            <DetailRow label="Practice Exam" value={exam.is_practice ? 'Yes' : 'No'} />
                            <DetailRow
                                label="Scheduled Start"
                                value={exam.start_time ? format(new Date(exam.start_time), 'MMM dd, yyyy HH:mm') : 'Not yet scheduled'}
                            />
                            <DetailRow
                                label="Scheduled End"
                                value={exam.end_time ? format(new Date(exam.end_time), 'MMM dd, yyyy HH:mm') : 'Not yet scheduled'}
                            />
                        </div>

                        {exam.description && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                                <p className="text-sm">{exam.description}</p>
                            </div>
                        )}

                        {exam.instructions && (
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Instructions for Students</p>
                                <p className="text-sm whitespace-pre-wrap">{exam.instructions}</p>
                            </div>
                        )}

                        {/* Settings */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Exam Settings</p>
                            <div className="flex flex-wrap gap-2">
                                {exam.randomize_questions && <SettingBadge>Randomized Questions</SettingBadge>}
                                {exam.randomize_options && <SettingBadge>Randomized Options</SettingBadge>}
                                {exam.allow_backtrack && <SettingBadge>Backtracking Allowed</SettingBadge>}
                                {exam.show_results_immediately && <SettingBadge>Results Shown on Submit</SettingBadge>}
                                {exam.show_correct_answers && <SettingBadge>Correct Answers Shown</SettingBadge>}
                                {exam.requires_password && <SettingBadge>Password Protected</SettingBadge>}
                                {exam.enable_proctoring && <SettingBadge>Proctored</SettingBadge>}
                                {!exam.randomize_questions && !exam.randomize_options && !exam.allow_backtrack &&
                                    !exam.show_results_immediately && !exam.show_correct_answers &&
                                    !exam.requires_password && !exam.enable_proctoring && (
                                        <span className="text-sm text-muted-foreground">Default settings</span>
                                    )}
                            </div>
                        </div>

                        {/* Bottom action shortcut */}
                        {canAct && (
                            <div className="flex gap-3 pt-2 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => { setShowRejectDialog(true); setRejectReason(''); }}
                                    className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                                >
                                    <X className="h-4 w-4" />
                                    Reject Exam
                                </Button>
                                <Button
                                    onClick={openScheduleDialog}
                                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Schedule &amp; Publish
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ==================== QUESTIONS TAB ==================== */}
            {activeTab === 'questions' && (
                <div className="space-y-4">
                    {!exam.questions || exam.questions.length === 0 ? (
                        <Card>
                            <CardContent className="py-16 text-center">
                                <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                <p className="mt-2 text-sm font-medium text-muted-foreground">No questions in this exam.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {exam.questions.map((eq: ExamQuestion, idx: number) => (
                                <QuestionCard key={eq.id} eq={eq} index={idx} />
                            ))}
                        </div>
                    )}

                    {/* Bottom action shortcut */}
                    {canAct && (
                        <div className="flex gap-3 pt-2">
                            <Button
                                variant="outline"
                                onClick={() => { setShowRejectDialog(true); setRejectReason(''); }}
                                className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                            >
                                <X className="h-4 w-4" />
                                Reject Exam
                            </Button>
                            <Button
                                onClick={openScheduleDialog}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            >
                                <Calendar className="h-4 w-4" />
                                Schedule &amp; Publish
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* ==================== REJECT DIALOG ==================== */}
            {showRejectDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Reject Exam</CardTitle>
                            <CardDescription>
                                The exam will be returned to <strong>Draft</strong> status. You must provide a reason so the lecturer knows what to fix.
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
                                <label className="text-sm font-medium">Reason for rejection <span className="text-destructive">*</span></label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => { setRejectReason(e.target.value); setRejectDialogError(''); }}
                                    placeholder="Explain what needs to be corrected..."
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectDialogError(''); }}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleReject}
                                    isLoading={isRejecting}
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

            {/* ==================== SCHEDULE & PUBLISH DIALOG ==================== */}
            {showScheduleDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Schedule &amp; Publish</CardTitle>
                            <CardDescription>
                                Set the exam window for <strong>{exam.title}</strong>. Students will be able to access this exam during this period.
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
                                    <label className="text-sm font-medium">Start Time <span className="text-destructive">*</span></label>
                                    <input
                                        type="datetime-local"
                                        value={scheduleStart}
                                        onChange={(e) => { setScheduleStart(e.target.value); setScheduleError(''); }}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Time <span className="text-destructive">*</span></label>
                                    <input
                                        type="datetime-local"
                                        value={scheduleEnd}
                                        onChange={(e) => { setScheduleEnd(e.target.value); setScheduleError(''); }}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowScheduleDialog(false)} disabled={isPublishing}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleScheduleAndPublish}
                                    isLoading={isPublishing}
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
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Question Card — read-only                                          */
/* ------------------------------------------------------------------ */

function QuestionCard({ eq, index }: { eq: ExamQuestion; index: number }) {
    const q = eq.question;

    return (
        <Card className="shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    {/* Question number */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold font-mono mt-0.5">
                        {index + 1}
                    </span>

                    <div className="flex-1 min-w-0 space-y-3">
                        {/* Question text + meta */}
                        <div>
                            <p className="text-sm font-medium leading-relaxed">
                                {q?.question_text || `Question #${eq.question_id}`}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {q?.question_type && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${Q_TYPE_BADGES[q.question_type] || ''}`}>
                                        {Q_TYPE_LABELS[q.question_type] || q.question_type}
                                    </span>
                                )}
                                {q?.difficulty_level && (
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_BADGES[q.difficulty_level] || ''}`}>
                                        {q.difficulty_level}
                                    </span>
                                )}
                                {q?.topic && (
                                    <span className="text-xs text-muted-foreground">{q.topic}</span>
                                )}
                                <span className="text-xs text-muted-foreground ml-auto">
                                    {eq.points} pt{eq.points !== 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* Options for MCQ / True-False */}
                        {q?.options && q.options.length > 0 && (
                            <div className="grid gap-1.5 sm:grid-cols-2">
                                {q.options.map((opt) => {
                                    const isCorrect = q.correct_answer === opt.key ||
                                        (Array.isArray(q.correct_answer) && q.correct_answer.includes(opt.key));
                                    return (
                                        <div
                                            key={opt.key}
                                            className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${isCorrect
                                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30'
                                                : 'border-muted bg-muted/30'
                                                }`}
                                        >
                                            <span className="font-mono text-xs font-bold shrink-0 mt-0.5 text-muted-foreground">
                                                {opt.key}.
                                            </span>
                                            <span className={isCorrect ? 'text-emerald-800 dark:text-emerald-300 font-medium' : ''}>
                                                {opt.value}
                                            </span>
                                            {isCorrect && (
                                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 ml-auto mt-0.5 text-emerald-600 dark:text-emerald-400" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* True/False with no options object — show correct_answer directly */}
                        {q?.question_type === 'true_false' && (!q.options || q.options.length === 0) && q.correct_answer && (
                            <p className="text-xs text-muted-foreground">
                                Correct answer: <span className="font-semibold text-emerald-700 dark:text-emerald-300">{String(q.correct_answer)}</span>
                            </p>
                        )}

                        {/* Fill in blank correct answer */}
                        {q?.question_type === 'fill_in_blank' && q.correct_answer && (
                            <p className="text-xs text-muted-foreground">
                                Expected answer: <span className="font-semibold text-emerald-700 dark:text-emerald-300">{String(q.correct_answer)}</span>
                            </p>
                        )}

                        {/* Essay — no correct answer */}
                        {q?.question_type === 'essay' && (
                            <p className="text-xs text-muted-foreground italic">Essay question — requires manual grading</p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                       */
/* ------------------------------------------------------------------ */

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium mt-0.5">{value}</p>
        </div>
    );
}

function SettingBadge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {children}
        </span>
    );
}
