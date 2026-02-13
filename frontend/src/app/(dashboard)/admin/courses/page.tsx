'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse,
    restoreCourse,
} from '@/lib/api/courses';
import { getActiveDepartments } from '@/lib/api/departments';
import type { Course } from '@/lib/types/models';
import type { Department } from '@/lib/types/models';
import type { CourseFilters, CreateCourseData, UpdateCourseData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Plus, Search, ChevronLeft, ChevronRight,
    Pencil, Trash2, X, BookOpen, Users, GraduationCap,
    Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
    Eye, FileQuestion, RotateCcw, Archive,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FormMode = 'closed' | 'create' | 'edit';

/* ------------------------------------------------------------------ */
/*  Level / Semester Options                                           */
/* ------------------------------------------------------------------ */

const LEVEL_OPTIONS = ['100L', '200L', '300L', '400L', '500L', '600L'];
const SEMESTER_OPTIONS = ['First', 'Second'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminCoursesPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 20, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterDeptId, setFilterDeptId] = useState<string>('');
    const [filterLevel, setFilterLevel] = useState<string>('');
    const [filterSemester, setFilterSemester] = useState<string>('');
    const [trashedFilter, setTrashedFilter] = useState<'' | 'only' | 'with'>('');
    const [page, setPage] = useState(1);

    // Form state
    const [formMode, setFormMode] = useState<FormMode>('closed');
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [formData, setFormData] = useState<CreateCourseData>({
        department_id: 0,
        code: '',
        title: '',
        description: '',
        credit_hours: undefined,
        semester: '',
        academic_year: '',
        level: '',
        is_active: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    /* ------------------------------------------------------------------ */
    /*  Fetch departments for dropdowns                                    */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        (async () => {
            try {
                const res = await getActiveDepartments();
                setDepartments(res.data.departments);
            } catch (err) {
                console.error('Failed to fetch departments:', err);
            }
        })();
    }, []);

    /* ------------------------------------------------------------------ */
    /*  Fetch courses                                                      */
    /* ------------------------------------------------------------------ */

    const fetchCourses = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: CourseFilters = { per_page: 20, page };
            if (search) filters.search = search;
            if (filterDeptId) filters.department_id = Number(filterDeptId);
            if (filterLevel) filters.level = filterLevel;
            if (filterSemester) filters.semester = filterSemester;
            if (trashedFilter) filters.trashed = trashedFilter;

            const res = await getCourses(filters);
            setCourses(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, page, filterDeptId, filterLevel, filterSemester, trashedFilter]);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    /* ------------------------------------------------------------------ */
    /*  Form helpers                                                       */
    /* ------------------------------------------------------------------ */

    const openCreateForm = () => {
        setFormMode('create');
        setEditingCourse(null);
        setFormData({
            department_id: departments[0]?.id || 0,
            code: '',
            title: '',
            description: '',
            credit_hours: undefined,
            semester: '',
            academic_year: '',
            level: '',
            is_active: true,
        });
        setFieldErrors({});
        setErrorMessage('');
    };

    const openEditForm = (course: Course) => {
        setFormMode('edit');
        setEditingCourse(course);
        setFormData({
            department_id: course.department_id,
            code: course.code,
            title: course.title,
            description: course.description || '',
            credit_hours: course.credit_hours || undefined,
            semester: course.semester || '',
            academic_year: course.academic_year || '',
            level: course.level || '',
            is_active: course.is_active,
        });
        setFieldErrors({});
        setErrorMessage('');
    };

    const closeForm = () => {
        setFormMode('closed');
        setEditingCourse(null);
        setFieldErrors({});
        setErrorMessage('');
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFieldErrors((prev) => ({ ...prev, [name]: [] }));
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else if (name === 'department_id' || name === 'credit_hours') {
            setFormData((prev) => ({ ...prev, [name]: value ? Number(value) : undefined }));
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFieldErrors({});
        setErrorMessage('');
        setSuccessMessage('');

        try {
            if (formMode === 'create') {
                await createCourse(formData);
                setSuccessMessage('Course created successfully');
            } else if (formMode === 'edit' && editingCourse) {
                const updateData: UpdateCourseData = { ...formData };
                await updateCourse(editingCourse.id, updateData);
                setSuccessMessage('Course updated successfully');
            }
            closeForm();
            await fetchCourses();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            if (error.response?.data?.errors) {
                setFieldErrors(error.response.data.errors);
            }
            setErrorMessage(error.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Actions                                                            */
    /* ------------------------------------------------------------------ */

    const handleDelete = async (course: Course) => {
        if (!confirm(`Delete "${course.title}" (${course.code})?\n\nThis will soft-delete the course.`)) return;
        setActionLoadingId(course.id);
        try {
            await deleteCourse(course.id);
            setSuccessMessage(`"${course.title}" deleted.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchCourses();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to delete course.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleToggleActive = async (course: Course) => {
        setActionLoadingId(course.id);
        try {
            await updateCourse(course.id, { is_active: !course.is_active });
            await fetchCourses();
        } catch {
            setErrorMessage('Failed to update status.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const handleRestore = async (course: Course) => {
        if (!confirm(`Restore "${course.title}" (${course.code})? This will reactivate the course.`)) return;
        setActionLoadingId(course.id);
        try {
            await restoreCourse(course.id);
            setSuccessMessage(`"${course.title}" restored successfully.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchCourses();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to restore course.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const getError = (field: string) => fieldErrors[field]?.[0] || '';

    // Stats
    const totalCourses = pagination.total;
    const activeCourses = courses.filter((c) => c.is_active).length;
    const totalStudents = courses.reduce((sum, c) => sum + (c.students_count ?? 0), 0);

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Course Management</h1>
                    <p className="text-muted-foreground">
                        Manage academic courses, enrollments, and lecturer assignments.
                    </p>
                </div>
                <Button className="gap-2" onClick={openCreateForm}>
                    <Plus className="h-4 w-4" />
                    Add Course
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                            <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                            <p className="text-2xl font-bold">{totalCourses}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                            <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Active (this page)</p>
                            <p className="text-2xl font-bold">{activeCourses}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
                            <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Enrolled Students (this page)</p>
                            <p className="text-2xl font-bold">{totalStudents}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}
            {errorMessage && formMode === 'closed' && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                </div>
            )}

            {/* Create / Edit Form (inline card) */}
            {formMode !== 'closed' && (
                <Card className="border-primary/30 shadow-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{formMode === 'create' ? 'New Course' : `Edit: ${editingCourse?.title}`}</CardTitle>
                                <CardDescription>
                                    {formMode === 'create' ? 'Add a new academic course.' : 'Update course details.'}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeForm}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {errorMessage && (
                            <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p className="text-sm">{errorMessage}</p>
                            </div>
                        )}
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {/* Row 1: Code & Title */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Course Code *</Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleFormChange}
                                        placeholder="e.g. CS101, MTH202"
                                        maxLength={50}
                                        error={getError('code')}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Auto-uppercased (max 50 chars)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="title">Course Title *</Label>
                                    <Input
                                        id="title"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleFormChange}
                                        placeholder="e.g. Introduction to Computer Science"
                                        error={getError('title')}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Row 2: Department & Credit Hours */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="department_id">Department *</Label>
                                    <select
                                        id="department_id"
                                        name="department_id"
                                        value={formData.department_id}
                                        onChange={handleFormChange}
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">Select Department</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.code} — {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                    {getError('department_id') && (
                                        <p className="text-xs text-destructive">{getError('department_id')}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="credit_hours">Credit Hours</Label>
                                    <Input
                                        id="credit_hours"
                                        name="credit_hours"
                                        type="number"
                                        value={formData.credit_hours ?? ''}
                                        onChange={handleFormChange}
                                        placeholder="e.g. 3"
                                        min={1}
                                        max={20}
                                        error={getError('credit_hours')}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Level, Semester, Academic Year */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="level">Level</Label>
                                    <select
                                        id="level"
                                        name="level"
                                        value={formData.level || ''}
                                        onChange={handleFormChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">Select Level</option>
                                        {LEVEL_OPTIONS.map((l) => (
                                            <option key={l} value={l}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="semester">Semester</Label>
                                    <select
                                        id="semester"
                                        name="semester"
                                        value={formData.semester || ''}
                                        onChange={handleFormChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">Select Semester</option>
                                        {SEMESTER_OPTIONS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="academic_year">Academic Year</Label>
                                    <Input
                                        id="academic_year"
                                        name="academic_year"
                                        value={formData.academic_year || ''}
                                        onChange={handleFormChange}
                                        placeholder="e.g. 2025/2026"
                                        maxLength={20}
                                        error={getError('academic_year')}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleFormChange}
                                    placeholder="Brief description of the course..."
                                    rows={3}
                                    maxLength={5000}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                />
                            </div>

                            {/* Active checkbox */}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleFormChange}
                                        className="h-4 w-4 rounded border-input"
                                    />
                                    Active
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                                <Button type="submit" isLoading={isSaving} className="gap-2">
                                    {formMode === 'create' ? (
                                        <><Plus className="h-4 w-4" /> Create Course</>
                                    ) : (
                                        <><Pencil className="h-4 w-4" /> Save Changes</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Search & Filter Bar */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by title or code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={filterDeptId}
                            onChange={(e) => { setFilterDeptId(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>{dept.code}</option>
                            ))}
                        </select>
                        <select
                            value={filterLevel}
                            onChange={(e) => { setFilterLevel(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Levels</option>
                            {LEVEL_OPTIONS.map((l) => (
                                <option key={l} value={l}>{l}</option>
                            ))}
                        </select>
                        <select
                            value={filterSemester}
                            onChange={(e) => { setFilterSemester(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Semesters</option>
                            {SEMESTER_OPTIONS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="secondary" className="gap-2">
                            <Search className="h-4 w-4" />
                            Search
                        </Button>
                        <Button
                            type="button"
                            variant={trashedFilter === 'only' ? 'destructive' : 'outline'}
                            className="gap-2"
                            onClick={() => {
                                setTrashedFilter(trashedFilter === 'only' ? '' : 'only');
                                setPage(1);
                            }}
                        >
                            <Archive className="h-4 w-4" />
                            {trashedFilter === 'only' ? 'Show Active' : 'Show Deleted'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Courses Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Department</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Level</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Semester</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                                        <span className="flex items-center justify-center gap-1"><Users className="h-3.5 w-3.5" /> Students</span>
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">
                                        <span className="flex items-center justify-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Lecturers</span>
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">
                                        <span className="flex items-center justify-center gap-1"><FileQuestion className="h-3.5 w-3.5" /> Questions</span>
                                    </th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading courses...</p>
                                        </td>
                                    </tr>
                                ) : courses.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center">
                                            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No courses found</p>
                                            <p className="text-xs text-muted-foreground">Create one to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    courses.map((course) => (
                                        <tr key={course.id} className="border-b transition-colors hover:bg-muted/50">
                                            {/* Code */}
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary font-mono">
                                                    {course.code}
                                                </span>
                                            </td>
                                            {/* Title */}
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium">{course.title}</p>
                                                    {course.credit_hours && (
                                                        <p className="text-xs text-muted-foreground">{course.credit_hours} credit hrs</p>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Department */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
                                                    {course.department?.code || '—'}
                                                </span>
                                                <span className="ml-1 text-xs text-muted-foreground">{course.department?.name || ''}</span>
                                            </td>
                                            {/* Level */}
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className="text-sm">{course.level || '—'}</span>
                                            </td>
                                            {/* Semester */}
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className="text-sm">{course.semester || '—'}</span>
                                            </td>
                                            {/* Students count */}
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-sm font-medium">
                                                    {course.students_count ?? 0}
                                                </span>
                                            </td>
                                            {/* Lecturers count */}
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    {course.lecturers_count ?? 0}
                                                </span>
                                            </td>
                                            {/* Questions count */}
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    {course.questions_count ?? 0}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${course.is_active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                    }`}>
                                                    {course.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {trashedFilter === 'only' ? (
                                                        /* Deleted course — show Restore */
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Restore"
                                                            className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                                            onClick={() => handleRestore(course)}
                                                            disabled={actionLoadingId === course.id}
                                                        >
                                                            {actionLoadingId === course.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <><RotateCcw className="h-4 w-4" /> Restore</>
                                                            }
                                                        </Button>
                                                    ) : (
                                                        /* Active course — show full actions */
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="View Details"
                                                                onClick={() => router.push(`/admin/courses/${course.id}`)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title={course.is_active ? 'Deactivate' : 'Activate'}
                                                                onClick={() => handleToggleActive(course)}
                                                                disabled={actionLoadingId === course.id}
                                                            >
                                                                {course.is_active
                                                                    ? <ToggleRight className="h-4 w-4 text-green-500" />
                                                                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                                                }
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Edit"
                                                                onClick={() => openEditForm(course)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Delete"
                                                                onClick={() => handleDelete(course)}
                                                                disabled={actionLoadingId === course.id}
                                                            >
                                                                {actionLoadingId === course.id
                                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                    : <Trash2 className="h-4 w-4 text-destructive" />
                                                                }
                                                            </Button>
                                                        </>
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
                                of <span className="font-medium">{pagination.total}</span> courses
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
