'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getSchoolExams, type OfficerExamFilters } from '@/lib/api/officer';
import { useAuthStore } from '@/lib/store/authStore';
import type { Exam } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Search, ChevronLeft, ChevronRight, Loader2,
    ClipboardList, AlertTriangle, Info, ExternalLink,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Status badge config                                                 */
/* ------------------------------------------------------------------ */

const STATUS_BADGES: Record<string, { label: string; classes: string }> = {
    draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    hod_review: { label: 'HOD Review', classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    school_officer_review: { label: 'School Review', classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' },
    cbt_setup: { label: 'CBT Setup', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    published: { label: 'Published', classes: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    grading: { label: 'Grading', classes: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    grading_review: { label: 'Grading Review', classes: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
    results_published: { label: 'Results Out', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
    archived: { label: 'Archived', classes: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function SchoolExamsPage() {
    const { user } = useAuthStore();

    const [exams, setExams] = useState<Exam[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 15, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    /* ------------------------------------------------------------------ */
    /*  Access control                                                      */
    /* ------------------------------------------------------------------ */

    const hasAccess = Boolean(user?.is_school_exam_officer);

    /* ------------------------------------------------------------------ */
    /*  Fetch                                                               */
    /* ------------------------------------------------------------------ */

    const fetchExams = useCallback(async () => {
        if (!hasAccess) return;
        setIsLoading(true);
        setFetchError('');
        try {
            const filters: OfficerExamFilters = { per_page: 15, page };
            if (search) filters.search = search;
            if (statusFilter) filters.status = statusFilter;

            const res = await getSchoolExams(filters);
            setExams(res.data);
            setPagination(res.pagination);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setFetchError(error.response?.data?.message || 'Failed to load school exams.');
        } finally {
            setIsLoading(false);
        }
    }, [hasAccess, search, statusFilter, page]);

    useEffect(() => { fetchExams(); }, [fetchExams]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    /* ------------------------------------------------------------------ */
    /*  Access denied                                                       */
    /* ------------------------------------------------------------------ */

    if (!hasAccess) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-8 pb-8 text-center space-y-4">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                            <AlertTriangle className="h-7 w-7 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Access Denied</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                This page is restricted to School Exam Officers. Contact your administrator
                                if you believe this is an error.
                            </p>
                        </div>
                        <Link href="/lecturer">
                            <Button variant="outline" className="mt-2">Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">School Exams</h1>
                <p className="text-muted-foreground">
                    Overview of all exams across every department in your school.
                </p>
            </div>

            {/* Officer Notice */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-sm text-blue-800 dark:text-blue-300">
                    You are viewing all exams across your school as <strong>School Exam Officer</strong>.
                    You can monitor exam statuses and access results for all school departments.
                </p>
            </div>

            {/* Fetch error */}
            {fetchError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {fetchError}
                </div>
            )}

            {/* Filters Bar */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search exam title or course..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Statuses</option>
                            {Object.entries(STATUS_BADGES).map(([value, { label }]) => (
                                <option key={value} value={value}>{label}</option>
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
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        School Exams
                        {!isLoading && (
                            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                {pagination.total}
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        All exams across all departments in your school.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Exam Title</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Course</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Department</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Lecturer</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden lg:table-cell">Date</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading exams…</p>
                                        </td>
                                    </tr>
                                ) : exams.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No exams found</p>
                                            <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                                        </td>
                                    </tr>
                                ) : (
                                    exams.map((exam) => {
                                        const badge = STATUS_BADGES[exam.status] ?? { label: exam.status, classes: 'bg-gray-100 text-gray-600' };
                                        // Department name from nested course → department (when API includes it)
                                        const departmentName = (exam.course as (typeof exam.course & { department?: { name: string } }) | undefined)?.department?.name || '—';
                                        return (
                                            <tr key={exam.id} className="border-b transition-colors hover:bg-muted/50">
                                                {/* Exam Title */}
                                                <td className="px-4 py-3">
                                                    <p className="font-medium truncate max-w-[200px]">{exam.title}</p>
                                                    <p className="text-xs text-muted-foreground sm:hidden">{exam.course?.code}</p>
                                                </td>
                                                {/* Course */}
                                                <td className="px-4 py-3 hidden sm:table-cell">
                                                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono">
                                                        {exam.course?.code || '—'}
                                                    </span>
                                                    <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[130px]">
                                                        {exam.course?.title}
                                                    </p>
                                                </td>
                                                {/* Department */}
                                                <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                                                    {departmentName}
                                                </td>
                                                {/* Lecturer */}
                                                <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                                                    {exam.creator?.full_name || '—'}
                                                </td>
                                                {/* Status */}
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.classes}`}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                {/* Date */}
                                                <td className="px-4 py-3 text-center hidden lg:table-cell">
                                                    <span className="text-xs text-muted-foreground">
                                                        {exam.start_time
                                                            ? new Date(exam.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : '—'}
                                                    </span>
                                                </td>
                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right">
                                                    <Link href={`/lecturer/exams/${exam.id}/results`}>
                                                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                                                            <ExternalLink className="h-3.5 w-3.5" />
                                                            Results
                                                        </Button>
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
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
