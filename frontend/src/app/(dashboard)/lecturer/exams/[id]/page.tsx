'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import {
    getExam,
    updateExam,
    submitExamForReview,
    verifyExam,
    rejectExam,
    publishExam,
    addExamQuestions,
    removeExamQuestion,
    getExamResults,
} from '@/lib/api/exams';
import { useAuthStore } from '@/lib/store/authStore';
import { getQuestions } from '@/lib/api/questions';
import type { Exam, ExamQuestion, ExamResults, Question } from '@/lib/types/models';
import type { UpdateExamData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChevronLeft,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Trash2,
    Plus,
    Search,
    Send,
    BarChart3,
    Pencil,
    X,
    Save,
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
    multiple_choice: 'MCQ',
    true_false: 'T/F',
    fill_in_blank: 'Fill-in',
    essay: 'Essay',
};

const DIFF_BADGES: Record<string, string> = {
    easy: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

type TabType = 'overview' | 'questions' | 'results';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ExamDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const examId = Number(params.id);
    const currentUser = useAuthStore(s => s.user);

    const initialTab = (searchParams.get('tab') as TabType) || 'overview';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Overview/Edit state
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<UpdateExamData>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [saveSuccess, setSaveSuccess] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

    // Workflow action state
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectDialog, setShowRejectDialog] = useState(false);

    // Questions tab state
    const [questionSearch, setQuestionSearch] = useState('');
    const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
    const [questionPoints, setQuestionPoints] = useState<Record<number, number>>({});
    const [addingQuestions, setAddingQuestions] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [questionActionMsg, setQuestionActionMsg] = useState('');
    const [questionActionError, setQuestionActionError] = useState('');

    // Results state
    const [results, setResults] = useState<ExamResults | null>(null);
    const [loadingResults, setLoadingResults] = useState(false);

    /* ------------------------------------------------------------------ */
    /*  Fetch Exam                                                          */
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
    /*  Fetch available questions (question bank)                           */
    /* ------------------------------------------------------------------ */

    const searchAvailableQuestions = useCallback(async () => {
        if (!exam) return;
        setLoadingQuestions(true);
        try {
            const res = await getQuestions({
                course_id: exam.course_id,
                search: questionSearch || undefined,
                per_page: 30,
                is_active: 'true',
            });
            // Filter out questions already in the exam
            const existingIds = new Set((exam.questions || []).map(q => q.question_id));
            setAvailableQuestions(res.data.filter(q => !existingIds.has(q.id)));
        } catch (err) {
            console.error('Failed to fetch questions:', err);
        } finally {
            setLoadingQuestions(false);
        }
    }, [exam, questionSearch]);

    useEffect(() => {
        if (activeTab === 'questions') {
            searchAvailableQuestions();
        }
    }, [activeTab, searchAvailableQuestions]);

    /* ------------------------------------------------------------------ */
    /*  Fetch Results                                                       */
    /* ------------------------------------------------------------------ */

    const fetchResults = useCallback(async () => {
        if (!exam || !['published', 'completed', 'ongoing'].includes(exam.status)) return;
        setLoadingResults(true);
        try {
            const res = await getExamResults(examId);
            setResults(res.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            console.error('Failed to load results:', e.response?.data?.message || err);
        } finally {
            setLoadingResults(false);
        }
    }, [exam, examId]);

    useEffect(() => {
        if (activeTab === 'results') {
            fetchResults();
        }
    }, [activeTab, fetchResults]);

    /* ------------------------------------------------------------------ */
    /*  Edit helpers                                                        */
    /* ------------------------------------------------------------------ */

    const openEdit = () => {
        if (!exam) return;
        setEditData({
            title: exam.title,
            description: exam.description,
            instructions: exam.instructions,
            exam_type: exam.exam_type,
            start_time: exam.start_time,
            end_time: exam.end_time,
            duration_minutes: exam.duration_minutes,
            total_marks: exam.total_marks,
            passing_marks: exam.passing_marks,
            randomize_questions: exam.randomize_questions,
            randomize_options: exam.randomize_options,
            questions_per_page: exam.questions_per_page,
            allow_backtrack: exam.allow_backtrack,
            show_results_immediately: exam.show_results_immediately,
            show_correct_answers: exam.show_correct_answers,
            requires_password: exam.requires_password,
            is_practice: exam.is_practice,
            enable_proctoring: exam.enable_proctoring,
        });
        setFieldErrors({});
        setSaveError('');
        setIsEditing(true);
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setEditData({});
        setFieldErrors({});
        setSaveError('');
    };

    const toDatetimeLocal = (iso: string) => {
        if (!iso) return '';
        try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
    };

    const handleSaveEdit = async () => {
        setIsSaving(true);
        setSaveError('');
        setSaveSuccess('');
        try {
            const submitData = { ...editData };
            // Only include dates for practice exams; clear them for non-practice (admin schedules)
            if (submitData.is_practice) {
                if (submitData.start_time) submitData.start_time = new Date(submitData.start_time).toISOString();
                if (submitData.end_time) submitData.end_time = new Date(submitData.end_time).toISOString();
            } else {
                delete submitData.start_time;
                delete submitData.end_time;
            }
            const res = await updateExam(examId, submitData);
            setExam(res.data);
            setSaveSuccess('Exam updated successfully.');
            setIsEditing(false);
            setTimeout(() => setSaveSuccess(''), 3000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            if (e.response?.data?.errors) setFieldErrors(e.response.data.errors);
            setSaveError(e.response?.data?.message || 'Failed to save changes.');
        } finally {
            setIsSaving(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Workflow Actions                                                    */
    /* ------------------------------------------------------------------ */

    const handleSubmitForReview = async () => {
        if (!exam) return;
        if (exam.total_questions === 0) {
            setSaveError('Please add questions before submitting for review.');
            setActiveTab('questions');
            return;
        }
        setIsSubmittingReview(true);
        try {
            const res = await submitExamForReview(examId);
            setExam(res.data);
            setSaveSuccess('Exam submitted for HOD review.');
            setTimeout(() => setSaveSuccess(''), 4000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setSaveError(e.response?.data?.message || 'Failed to submit for review.');
            setTimeout(() => setSaveError(''), 5000);
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleVerify = async () => {
        if (!exam) return;
        setIsVerifying(true);
        try {
            const res = await verifyExam(examId);
            setExam(res.data);
            setSaveSuccess('Exam verified and ready for admin publishing.');
            setTimeout(() => setSaveSuccess(''), 4000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setSaveError(e.response?.data?.message || 'Failed to verify exam.');
            setTimeout(() => setSaveError(''), 5000);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReject = async () => {
        if (!exam) return;
        if (!rejectReason.trim()) {
            setSaveError('A reason for rejection is required.');
            return;
        }
        setIsRejecting(true);
        setShowRejectDialog(false);
        try {
            const res = await rejectExam(examId, rejectReason);
            setExam(res.data);
            setRejectReason('');
            setSaveSuccess('Exam rejected and returned to draft.');
            setTimeout(() => setSaveSuccess(''), 4000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setSaveError(e.response?.data?.message || 'Failed to reject exam.');
            setTimeout(() => setSaveError(''), 5000);
        } finally {
            setIsRejecting(false);
        }
    };

    const handlePublish = async () => {
        if (!exam) return;
        setIsPublishing(true);
        try {
            const res = await publishExam(examId);
            setExam(res.data);
            setSaveSuccess('Exam published successfully!');
            setTimeout(() => setSaveSuccess(''), 3000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setSaveError(e.response?.data?.message || 'Failed to publish exam.');
            setTimeout(() => setSaveError(''), 5000);
        } finally {
            setIsPublishing(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Question Management                                                 */
    /* ------------------------------------------------------------------ */

    const toggleSelectQuestion = (qId: number, defaultPoints: number) => {
        setSelectedQuestionIds(prev => {
            const next = new Set(prev);
            if (next.has(qId)) {
                next.delete(qId);
            } else {
                next.add(qId);
                setQuestionPoints(p => ({ ...p, [qId]: p[qId] ?? defaultPoints }));
            }
            return next;
        });
    };

    const handleAddQuestions = async () => {
        if (selectedQuestionIds.size === 0) return;
        setAddingQuestions(true);
        setQuestionActionMsg('');
        setQuestionActionError('');
        try {
            const questions = Array.from(selectedQuestionIds).map((qId, idx) => ({
                question_id: qId,
                points: questionPoints[qId] ?? 1,
                order: (exam?.total_questions || 0) + idx + 1,
            }));
            const res = await addExamQuestions(examId, { questions });
            setSelectedQuestionIds(new Set());
            const msg = (res.data as { status_reset?: boolean }).status_reset
                ? `Added ${questions.length} question(s). Exam reset to draft — re-submit for review.`
                : `Added ${questions.length} question(s) to the exam.`;
            setQuestionActionMsg(msg);
            setTimeout(() => setQuestionActionMsg(''), 5000);
            await fetchExam();
            await searchAvailableQuestions();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setQuestionActionError(e.response?.data?.message || 'Failed to add questions.');
            setTimeout(() => setQuestionActionError(''), 5000);
        } finally {
            setAddingQuestions(false);
        }
    };

    const handleRemoveQuestion = async (examQuestion: ExamQuestion) => {
        const confirmMsg = isUnderReview
            ? 'Removing this question will reset the exam to Draft status and require re-submission for review. Continue?'
            : 'Remove this question from the exam?';
        if (!confirm(confirmMsg)) return;
        setRemovingId(examQuestion.id);
        setQuestionActionMsg('');
        setQuestionActionError('');
        try {
            const res = await removeExamQuestion(examId, examQuestion.question_id);
            const msg = (res.data as { status_reset?: boolean } | null)?.status_reset
                ? 'Question removed. Exam reset to draft — please re-submit for HOD review.'
                : 'Question removed from exam.';
            setQuestionActionMsg(msg);
            setTimeout(() => setQuestionActionMsg(''), 5000);
            await fetchExam();
            await searchAvailableQuestions();
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setQuestionActionError(e.response?.data?.message || 'Failed to remove question.');
            setTimeout(() => setQuestionActionError(''), 5000);
        } finally {
            setRemovingId(null);
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
                <Link href="/lecturer/exams">
                    <Button variant="outline" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Exams
                    </Button>
                </Link>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error || 'Exam not found.'}</p>
                </div>
            </div>
        );
    }

    const isOwner = exam.created_by === currentUser?.id;
    const isHod = currentUser?.is_hod === true;
    const isAdmin = currentUser?.role === 'admin';
    const hasResults = ['published', 'completed', 'ongoing'].includes(exam.status);
    const isLocked = ['published', 'ongoing', 'completed', 'archived'].includes(exam.status);
    // Questions can be edited unless the exam is fully live/completed
    const canEditQuestions = !isLocked && (isOwner || isAdmin);
    // True when exam is under review — warn lecturer before modifying
    const isUnderReview = ['pending_review', 'verified'].includes(exam.status);

    // Workflow action visibility
    // Practice exams: no HOD review, lecturer publishes directly
    const showPracticePublish = exam.is_practice && exam.status === 'draft' && (isOwner || isAdmin);
    const showSubmitReview = !exam.is_practice && exam.status === 'draft' && (isOwner || isAdmin);
    const showVerifyReject = !exam.is_practice && exam.status === 'pending_review' && (isHod || isAdmin);
    const showAdminPublish = !exam.is_practice && exam.status === 'verified' && isAdmin;

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <Link href="/lecturer/exams">
                        <Button variant="ghost" size="icon">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[exam.status] || ''}`}>
                                {exam.status}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGES[exam.exam_type] || ''}`}>
                                {exam.exam_type}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                            {exam.course?.code || `Course #${exam.course_id}`} &bull; {exam.total_questions} questions &bull; {exam.total_marks} marks
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {/* Practice exam: lecturer publishes directly */}
                    {showPracticePublish && (
                        <Button
                            onClick={handlePublish}
                            isLoading={isPublishing}
                            className="gap-2 bg-teal-600 hover:bg-teal-700"
                        >
                            <Send className="h-4 w-4" />
                            Publish Practice
                        </Button>
                    )}
                    {/* Non-practice: lecturer submits for HOD review */}
                    {showSubmitReview && (
                        <Button
                            onClick={handleSubmitForReview}
                            isLoading={isSubmittingReview}
                            className="gap-2 bg-amber-600 hover:bg-amber-700"
                        >
                            <Send className="h-4 w-4" />
                            Submit for Review
                        </Button>
                    )}
                    {/* HOD: verify or reject */}
                    {showVerifyReject && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setShowRejectDialog(true)}
                                disabled={isRejecting || isVerifying}
                                className="gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                            >
                                <X className="h-4 w-4" />
                                Reject
                            </Button>
                            <Button
                                onClick={handleVerify}
                                isLoading={isVerifying}
                                disabled={isRejecting}
                                className="gap-2 bg-violet-600 hover:bg-violet-700"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Verify
                            </Button>
                        </>
                    )}
                    {/* Admin: publish verified exam */}
                    {showAdminPublish && (
                        <Button
                            onClick={handlePublish}
                            isLoading={isPublishing}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                            <Send className="h-4 w-4" />
                            Publish Exam
                        </Button>
                    )}
                </div>
            </div>

            {/* Global messages */}
            {saveSuccess && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{saveSuccess}</p>
                </div>
            )}
            {saveError && !isEditing && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{saveError}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 w-fit">
                {(['overview', 'questions', ...(hasResults ? ['results'] : [])] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-all capitalize ${activeTab === tab
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                            }`}
                    >
                        {tab === 'results' && <BarChart3 className="inline h-3.5 w-3.5 mr-1" />}
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* ==================== OVERVIEW TAB ==================== */}
            {activeTab === 'overview' && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Exam Details</CardTitle>
                                <CardDescription>View and edit exam configuration.</CardDescription>
                            </div>
                            {!isEditing && (exam.status === 'draft') && (
                                <Button variant="outline" onClick={openEdit} className="gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </Button>
                            )}
                            {exam.status === 'pending_review' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Awaiting HOD review
                                </span>
                            )}
                            {exam.status === 'verified' && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Verified — awaiting publish
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            <div className="space-y-4">
                                {saveError && (
                                    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <p className="text-sm">{saveError}</p>
                                    </div>
                                )}

                                {/* Title */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit_title">Title *</Label>
                                    <Input
                                        id="edit_title"
                                        value={editData.title || ''}
                                        onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                                        required
                                    />
                                    {fieldErrors.title && <p className="text-xs text-destructive">{fieldErrors.title[0]}</p>}
                                </div>

                                {/* Exam Type */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit_exam_type">Exam Type</Label>
                                    <select
                                        id="edit_exam_type"
                                        value={editData.exam_type || ''}
                                        onChange={(e) => setEditData(prev => ({ ...prev, exam_type: e.target.value as UpdateExamData['exam_type'] }))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {['quiz', 'midterm', 'final', 'practice', 'makeup'].map(t => (
                                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Description */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit_description">Description</Label>
                                    <textarea
                                        id="edit_description"
                                        value={editData.description || ''}
                                        onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                                        rows={2}
                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                    />
                                </div>

                                {/* Instructions */}
                                <div className="space-y-2">
                                    <Label htmlFor="edit_instructions">Instructions</Label>
                                    <textarea
                                        id="edit_instructions"
                                        value={editData.instructions || ''}
                                        onChange={(e) => setEditData(prev => ({ ...prev, instructions: e.target.value }))}
                                        rows={3}
                                        className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                    />
                                </div>

                                {/* Start/End Time — practice exams only (optional); admin schedules real exams */}
                                {editData.is_practice ? (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_start">Start Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                            <Input
                                                id="edit_start"
                                                type="datetime-local"
                                                value={toDatetimeLocal(editData.start_time || '')}
                                                onChange={(e) => setEditData(prev => ({ ...prev, start_time: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="edit_end">End Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                            <Input
                                                id="edit_end"
                                                type="datetime-local"
                                                value={toDatetimeLocal(editData.end_time || '')}
                                                onChange={(e) => setEditData(prev => ({ ...prev, end_time: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            <span className="font-medium">Scheduling handled by Admin.</span> The admin will set start and end times when publishing.
                                        </p>
                                    </div>
                                )}

                                {/* Duration, Total Marks, Passing Marks */}
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <Label>Duration (min)</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={editData.duration_minutes || ''}
                                            onChange={(e) => setEditData(prev => ({ ...prev, duration_minutes: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Total Marks</Label>
                                        <Input
                                            type="number"
                                            min={1}
                                            value={editData.total_marks || ''}
                                            onChange={(e) => setEditData(prev => ({ ...prev, total_marks: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Passing Marks</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={editData.passing_marks ?? ''}
                                            onChange={(e) => setEditData(prev => ({ ...prev, passing_marks: Number(e.target.value) }))}
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="outline" onClick={cancelEdit} className="gap-2">
                                        <X className="h-4 w-4" />
                                        Cancel
                                    </Button>
                                    <Button onClick={handleSaveEdit} isLoading={isSaving} className="gap-2">
                                        <Save className="h-4 w-4" />
                                        Save Changes
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Details grid */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <DetailRow label="Course" value={exam.course ? `${exam.course.code} — ${exam.course.title}` : `#${exam.course_id}`} />
                                    <DetailRow label="Exam Type" value={exam.exam_type} />
                                    <DetailRow label="Start Time" value={exam.start_time ? format(new Date(exam.start_time), 'MMM dd, yyyy HH:mm') : 'TBD (Admin schedules)'} />
                                    <DetailRow label="End Time" value={exam.end_time ? format(new Date(exam.end_time), 'MMM dd, yyyy HH:mm') : 'TBD (Admin schedules)'} />
                                    <DetailRow label="Duration" value={`${exam.duration_minutes} minutes`} />
                                    <DetailRow label="Total Marks" value={String(exam.total_marks)} />
                                    <DetailRow label="Passing Marks" value={String(exam.passing_marks)} />
                                    <DetailRow label="Total Questions" value={String(exam.total_questions)} />
                                    <DetailRow label="Questions per Page" value={String(exam.questions_per_page)} />
                                    <DetailRow label="Practice Exam" value={exam.is_practice ? 'Yes' : 'No'} />
                                </div>

                                {exam.description && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                                        <p className="text-sm">{exam.description}</p>
                                    </div>
                                )}
                                {exam.instructions && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Instructions</p>
                                        <p className="text-sm whitespace-pre-wrap">{exam.instructions}</p>
                                    </div>
                                )}

                                {/* Settings summary */}
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Settings</p>
                                    <div className="flex flex-wrap gap-2">
                                        {exam.randomize_questions && <SettingBadge>Randomized Questions</SettingBadge>}
                                        {exam.randomize_options && <SettingBadge>Randomized Options</SettingBadge>}
                                        {exam.allow_backtrack && <SettingBadge>Backtracking Allowed</SettingBadge>}
                                        {exam.show_results_immediately && <SettingBadge>Results on Submit</SettingBadge>}
                                        {exam.show_correct_answers && <SettingBadge>Shows Correct Answers</SettingBadge>}
                                        {exam.requires_password && <SettingBadge>Password Protected</SettingBadge>}
                                        {exam.enable_proctoring && <SettingBadge>Proctored</SettingBadge>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ==================== QUESTIONS TAB ==================== */}
            {activeTab === 'questions' && (
                <div className="space-y-4">
                    {/* Question action messages */}
                    {questionActionMsg && (
                        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <p className="text-sm font-medium">{questionActionMsg}</p>
                        </div>
                    )}
                    {questionActionError && (
                        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-sm font-medium">{questionActionError}</p>
                        </div>
                    )}

                    {/* Warning: modifying a reviewed exam resets it to draft */}
                    {isUnderReview && canEditQuestions && (
                        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
                            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold">Exam is currently under review</p>
                                <p className="text-sm mt-0.5">
                                    Adding or removing questions will automatically reset the exam back to <strong>Draft</strong> status.
                                    You will need to re-submit it for HOD review after making changes.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Locked — can only view questions */}
                    {isLocked && (
                        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <p className="text-sm">Questions cannot be modified once the exam is published or completed.</p>
                        </div>
                    )}

                    {/* Current exam questions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Exam Questions ({exam.total_questions})</CardTitle>
                            <CardDescription>Questions currently in this exam, in order.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!exam.questions || exam.questions.length === 0 ? (
                                <div className="py-12 text-center">
                                    <p className="text-sm text-muted-foreground">No questions added yet.</p>
                                    {canEditQuestions && (
                                        <p className="text-xs text-muted-foreground">Search and add questions from your question bank below.</p>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {exam.questions.map((eq: ExamQuestion) => (
                                        <div key={eq.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50">
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold font-mono">
                                                {eq.question_order}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {eq.question?.question_text || `Question #${eq.question_id}`}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {eq.question?.question_type && (
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${Q_TYPE_BADGES[eq.question.question_type] || ''}`}>
                                                            {Q_TYPE_LABELS[eq.question.question_type]}
                                                        </span>
                                                    )}
                                                    {eq.question?.difficulty_level && (
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_BADGES[eq.question.difficulty_level] || ''}`}>
                                                            {eq.question.difficulty_level}
                                                        </span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">{eq.points} pt{eq.points !== 1 ? 's' : ''}</span>
                                                </div>
                                            </div>
                                            {canEditQuestions && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveQuestion(eq)}
                                                    disabled={removingId === eq.id}
                                                    title="Remove from exam"
                                                >
                                                    {removingId === eq.id
                                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                                        : <Trash2 className="h-4 w-4 text-destructive" />
                                                    }
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Add questions (all editable statuses) */}
                    {canEditQuestions && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Add Questions from Bank</CardTitle>
                                <CardDescription>
                                    Search questions from your question bank for this course and add them to the exam.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Search */}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); searchAvailableQuestions(); }}
                                    className="flex gap-2"
                                >
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Search question text or topic..."
                                            value={questionSearch}
                                            onChange={(e) => setQuestionSearch(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    <Button type="submit" variant="secondary" className="gap-2">
                                        <Search className="h-4 w-4" />
                                        Search
                                    </Button>
                                </form>

                                {/* Add selected button */}
                                {selectedQuestionIds.size > 0 && (
                                    <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
                                        <span className="text-sm font-medium">{selectedQuestionIds.size} question(s) selected</span>
                                        <Button size="sm" onClick={handleAddQuestions} isLoading={addingQuestions} className="gap-2">
                                            <Plus className="h-4 w-4" />
                                            Add to Exam
                                        </Button>
                                    </div>
                                )}

                                {/* Available questions list */}
                                {loadingQuestions ? (
                                    <div className="py-8 text-center">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        <p className="mt-2 text-sm text-muted-foreground">Searching questions...</p>
                                    </div>
                                ) : availableQuestions.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <p className="text-sm text-muted-foreground">No questions found for this course.</p>
                                        <Link href="/lecturer/questions" className="text-xs text-primary hover:underline">
                                            Go to Question Bank to create questions
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="divide-y rounded-md border">
                                        {availableQuestions.map((q) => (
                                            <div
                                                key={q.id}
                                                className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer ${selectedQuestionIds.has(q.id) ? 'bg-primary/5' : ''}`}
                                                onClick={() => toggleSelectQuestion(q.id, q.points)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedQuestionIds.has(q.id)}
                                                    onChange={() => toggleSelectQuestion(q.id, q.points)}
                                                    className="mt-0.5 h-4 w-4 rounded border-input"
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium line-clamp-2">{q.question_text}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${Q_TYPE_BADGES[q.question_type] || ''}`}>
                                                            {Q_TYPE_LABELS[q.question_type]}
                                                        </span>
                                                        {q.difficulty_level && (
                                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DIFF_BADGES[q.difficulty_level] || ''}`}>
                                                                {q.difficulty_level}
                                                            </span>
                                                        )}
                                                        {q.topic && <span className="text-xs text-muted-foreground">{q.topic}</span>}
                                                    </div>
                                                </div>
                                                {/* Points override input */}
                                                {selectedQuestionIds.has(q.id) && (
                                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                        <Label htmlFor={`pts_${q.id}`} className="text-xs text-muted-foreground whitespace-nowrap">pts:</Label>
                                                        <input
                                                            id={`pts_${q.id}`}
                                                            type="number"
                                                            min={0.01}
                                                            step={0.01}
                                                            value={questionPoints[q.id] ?? q.points}
                                                            onChange={(e) => setQuestionPoints(prev => ({ ...prev, [q.id]: Number(e.target.value) }))}
                                                            className="w-16 h-7 rounded border border-input bg-background px-2 text-xs"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}

            {/* Reject Dialog */}
            {showRejectDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Reject Exam</CardTitle>
                            <CardDescription>
                                The exam will be returned to draft. You must provide a reason so the lecturer knows what to fix.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">Reason for rejection <span className="text-destructive">*</span></label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Explain what needs to be corrected..."
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
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

            {/* ==================== RESULTS TAB ==================== */}
            {activeTab === 'results' && (
                <div className="space-y-4">
                    {loadingResults ? (
                        <div className="flex min-h-[30vh] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : !results ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                <p className="mt-2 text-sm text-muted-foreground">No results available yet.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Stats */}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <StatCard label="Total Students" value={results.total_students} color="blue" />
                                <StatCard label="Completed" value={results.completed} color="emerald" />
                                <StatCard label="Average Score" value={results.avg_score != null ? `${results.avg_score.toFixed(1)}%` : '—'} color="amber" />
                                <StatCard label="Pass Rate" value={results.pass_rate != null ? `${results.pass_rate.toFixed(1)}%` : '—'} color="primary" />
                            </div>

                            {/* Results table */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Student Results</CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b bg-muted/50">
                                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student</th>
                                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Score</th>
                                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Percentage</th>
                                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Result</th>
                                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Submitted</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.results.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                                            No submissions yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    results.results.map((r, idx) => (
                                                        <tr key={idx} className="border-b hover:bg-muted/50">
                                                            <td className="px-4 py-3">
                                                                <p className="font-medium">{r.student_name ?? '—'}</p>
                                                                {r.student_email && (
                                                                    <p className="text-xs text-muted-foreground">{r.student_email}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 text-center font-medium">
                                                                {r.total_score != null ? r.total_score : '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                {r.percentage != null ? `${r.percentage.toFixed(1)}%` : '—'}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${r.passed === true
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                                                    : r.passed === false
                                                                        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                                        : 'bg-muted text-muted-foreground'
                                                                    }`}>
                                                                    {r.passed === true ? 'Passed' : r.passed === false ? 'Failed' : r.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                                                                {r.submitted_at ? format(new Date(r.submitted_at), 'MMM dd HH:mm') : '—'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            )}
        </div>
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

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
        emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
        primary: 'bg-primary/10 text-primary',
    };
    return (
        <Card>
            <CardContent className="pt-6">
                <div className={`rounded-lg p-2 w-fit mb-2 ${colorMap[color] || colorMap.primary}`}>
                    <BarChart3 className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
        </Card>
    );
}
