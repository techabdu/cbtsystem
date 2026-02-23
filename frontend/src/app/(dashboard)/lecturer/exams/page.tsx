'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
    getExams,
    deleteExam,
    publishExam,
    submitExamForReview,
    getExamStats,
} from '@/lib/api/exams';
import { getLecturerMyCourses } from '@/lib/api/hod';
import type { Exam, ExamStats } from '@/lib/types/models';
import type { ExamFilters } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
    Plus,
    Search,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    ClipboardList,
    Loader2,
    CheckCircle2,
    AlertCircle,
    BarChart3,
    FileText,
    Send,
    Eye,
} from 'lucide-react';
import type { Course } from '@/lib/types/models';

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

const TYPE_LABELS: Record<string, string> = {
    quiz: 'Quiz',
    midterm: 'Midterm',
    final: 'Final',
    practice: 'Practice',
    makeup: 'Makeup',
};

const EXAM_TYPES = [
    { value: 'quiz', label: 'Quiz' },
    { value: 'midterm', label: 'Midterm' },
    { value: 'final', label: 'Final' },
    { value: 'practice', label: 'Practice' },
    { value: 'makeup', label: 'Makeup' },
];

const STATUSES = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
    { value: 'ongoing', label: 'Ongoing' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function LecturerExamsPage() {
    const [exams, setExams] = useState<Exam[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState<ExamStats | null>(null);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 20, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCourseId, setFilterCourseId] = useState('');
    const [page, setPage] = useState(1);

    // Feedback
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    /* ------------------------------------------------------------------ */
    /*  Fetch Data                                                          */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        (async () => {
            try {
                const [coursesRes, statsRes] = await Promise.all([
                    getLecturerMyCourses(),
                    getExamStats(),
                ]);
                setCourses(coursesRes.data.courses);
                setStats(statsRes.data);
            } catch (err) {
                console.error('Failed to fetch courses/stats:', err);
            }
        })();
    }, []);

    const fetchExams = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: ExamFilters = { per_page: 20, page };
            if (search) filters.search = search;
            if (filterType) filters.exam_type = filterType;
            if (filterStatus) filters.status = filterStatus;
            if (filterCourseId) filters.course_id = Number(filterCourseId);

            const res = await getExams(filters);
            setExams(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch exams:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, page, filterType, filterStatus, filterCourseId]);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const refreshStats = async () => {
        try {
            const statsRes = await getExamStats();
            setStats(statsRes.data);
        } catch { /* silently continue */ }
    };

    /* ------------------------------------------------------------------ */
    /*  Actions                                                             */
    /* ------------------------------------------------------------------ */

    const getDeleteConfirmMessage = (exam: Exam): string => {
        if (exam.status === 'pending_review') {
            return `"${exam.title}" is currently under HOD review. Deleting it will cancel the review process. Continue?`;
        }
        if (exam.status === 'verified') {
            return `"${exam.title}" has been verified by HOD and is awaiting admin publishing. Deleting it will remove it from the publish queue. Continue?`;
        }
        if (exam.status === 'published' && exam.is_practice) {
            return `"${exam.title}" is published and currently accessible to students. Deleting it will immediately remove student access. Continue?`;
        }
        return `Delete exam "${exam.title}"? This action cannot be undone.`;
    };

    const handleDelete = async (exam: Exam) => {
        if (!confirm(getDeleteConfirmMessage(exam))) return;
        setActionLoadingId(exam.id);
        try {
            await deleteExam(exam.id);
            setSuccessMessage('Exam deleted successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchExams();
            await refreshStats();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to delete exam.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handlePublish = async (exam: Exam) => {
        if (!confirm(`Publish "${exam.title}" as a practice exam? Students will be able to access it immediately.`)) return;
        setActionLoadingId(exam.id);
        try {
            await publishExam(exam.id);
            setSuccessMessage('Practice exam published successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchExams();
            await refreshStats();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to publish exam.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleSubmitReview = async (exam: Exam) => {
        if (!confirm(`Submit "${exam.title}" for HOD review? The exam will be locked from editing until reviewed.`)) return;
        setActionLoadingId(exam.id);
        try {
            await submitExamForReview(exam.id);
            setSuccessMessage('Exam submitted for HOD review successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchExams();
            await refreshStats();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to submit exam for review.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
                    <p className="text-muted-foreground">
                        Create and manage exams for your courses.
                    </p>
                </div>
                <Link href="/lecturer/exams/create">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Exam
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary/10 p-2">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Exams</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800/60">
                                    <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Draft</p>
                                    <p className="text-2xl font-bold">{stats.draft}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/40">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Published</p>
                                    <p className="text-2xl font-bold">{stats.published}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
                                    <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Completed</p>
                                    <p className="text-2xl font-bold">{stats.completed}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}
            {errorMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                </div>
            )}

            {/* Search & Filter Bar */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search exam title..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={filterCourseId}
                            onChange={(e) => { setFilterCourseId(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Courses</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}</option>
                            ))}
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Types</option>
                            {EXAM_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Statuses</option>
                            {STATUSES.map((s) => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="secondary" className="gap-2">
                            <Search className="h-4 w-4" />
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Exams Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Course</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Type</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Questions</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Start Time</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Duration</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading exams...</p>
                                        </td>
                                    </tr>
                                ) : exams.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No exams found</p>
                                            <p className="text-xs text-muted-foreground">Create one to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    exams.map((exam) => (
                                        <tr
                                            key={exam.id}
                                            className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                        >
                                            {/* Title */}
                                            <td className="px-4 py-3 max-w-xs">
                                                <Link href={`/lecturer/exams/${exam.id}`} className="block">
                                                    <p className="font-medium truncate max-w-[260px] hover:text-primary transition-colors">
                                                        {exam.title}
                                                    </p>
                                                    {exam.is_practice && (
                                                        <span className="text-xs text-teal-600 dark:text-teal-400 font-mono">practice</span>
                                                    )}
                                                </Link>
                                            </td>
                                            {/* Course */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono">
                                                    {exam.course?.code || `#${exam.course_id}`}
                                                </span>
                                            </td>
                                            {/* Type */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[exam.exam_type] || ''}`}>
                                                    {TYPE_LABELS[exam.exam_type] || exam.exam_type}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[exam.status] || ''}`}>
                                                    {exam.status}
                                                </span>
                                            </td>
                                            {/* Questions */}
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <span className="text-sm font-medium">{exam.total_questions}</span>
                                            </td>
                                            {/* Start Time */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className="text-xs text-muted-foreground font-mono">
                                                    {exam.start_time ? format(new Date(exam.start_time), 'MMM dd, yyyy HH:mm') : '—'}
                                                </span>
                                            </td>
                                            {/* Duration */}
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <span className="text-sm">{exam.duration_minutes}m</span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* View/Edit */}
                                                    <Link href={`/lecturer/exams/${exam.id}`}>
                                                        <Button variant="ghost" size="icon" title="View / Edit">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    {/* Practice: publish directly; Non-practice: submit for review */}
                                                    {exam.status === 'draft' && exam.is_practice && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Publish Practice Exam"
                                                            onClick={() => handlePublish(exam)}
                                                            disabled={actionLoadingId === exam.id}
                                                        >
                                                            {actionLoadingId === exam.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Send className="h-4 w-4 text-teal-600" />
                                                            }
                                                        </Button>
                                                    )}
                                                    {exam.status === 'draft' && !exam.is_practice && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Submit for HOD Review"
                                                            onClick={() => handleSubmitReview(exam)}
                                                            disabled={actionLoadingId === exam.id}
                                                        >
                                                            {actionLoadingId === exam.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Send className="h-4 w-4 text-amber-600" />
                                                            }
                                                        </Button>
                                                    )}
                                                    {/* Results (published/completed) */}
                                                    {(exam.status === 'published' || exam.status === 'completed' || exam.status === 'ongoing') && (
                                                        <Link href={`/lecturer/exams/${exam.id}?tab=results`}>
                                                            <Button variant="ghost" size="icon" title="View Results">
                                                                <BarChart3 className="h-4 w-4 text-blue-500" />
                                                            </Button>
                                                        </Link>
                                                    )}
                                                    {/* Edit */}
                                                    <Link href={`/lecturer/exams/${exam.id}`}>
                                                        <Button variant="ghost" size="icon" title="Edit">
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    {/* Delete — draft, pending review, verified, or published practice */}
                                                    {(exam.status === 'draft' ||
                                                        exam.status === 'pending_review' ||
                                                        exam.status === 'verified' ||
                                                        (exam.status === 'published' && exam.is_practice)) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Delete"
                                                            onClick={() => handleDelete(exam)}
                                                            disabled={actionLoadingId === exam.id}
                                                        >
                                                            {actionLoadingId === exam.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Trash2 className="h-4 w-4 text-destructive" />
                                                            }
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!isLoading && pagination.total_pages > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span>{' '}
                                of <span className="font-medium">{pagination.total}</span> exams
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {pagination.current_page} of {pagination.total_pages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page >= pagination.total_pages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
