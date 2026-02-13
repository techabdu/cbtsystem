'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    restoreDepartment,
} from '@/lib/api/departments';
import type { Department } from '@/lib/types/models';
import type { DepartmentFilters, CreateDepartmentData, UpdateDepartmentData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Plus, Search, ChevronLeft, ChevronRight,
    Pencil, Trash2, X, Building2, BookOpen,
    Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
    RotateCcw, Archive,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FormMode = 'closed' | 'create' | 'edit';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminDepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 20, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [trashedFilter, setTrashedFilter] = useState<'' | 'only' | 'with'>('');
    const [page, setPage] = useState(1);

    // Form state
    const [formMode, setFormMode] = useState<FormMode>('closed');
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [formData, setFormData] = useState<CreateDepartmentData>({ code: '', name: '', description: '', is_active: true });
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    /* ------------------------------------------------------------------ */
    /*  Fetch departments                                                  */
    /* ------------------------------------------------------------------ */

    const fetchDepartments = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: DepartmentFilters = { per_page: 20, page };
            if (search) filters.search = search;
            if (trashedFilter) filters.trashed = trashedFilter;

            const res = await getDepartments(filters);
            setDepartments(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch departments:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, trashedFilter, page]);

    useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

    /* ------------------------------------------------------------------ */
    /*  Form helpers                                                       */
    /* ------------------------------------------------------------------ */

    const openCreateForm = () => {
        setFormMode('create');
        setEditingDept(null);
        setFormData({ code: '', name: '', description: '', is_active: true });
        setFieldErrors({});
        setErrorMessage('');
    };

    const openEditForm = (dept: Department) => {
        setFormMode('edit');
        setEditingDept(dept);
        setFormData({
            code: dept.code,
            name: dept.name,
            description: dept.description || '',
            is_active: dept.is_active,
        });
        setFieldErrors({});
        setErrorMessage('');
    };

    const closeForm = () => {
        setFormMode('closed');
        setEditingDept(null);
        setFieldErrors({});
        setErrorMessage('');
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFieldErrors((prev) => ({ ...prev, [name]: [] }));
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
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
                await createDepartment(formData);
                setSuccessMessage('Department created successfully');
            } else if (formMode === 'edit' && editingDept) {
                const updateData: UpdateDepartmentData = { ...formData };
                await updateDepartment(editingDept.id, updateData);
                setSuccessMessage('Department updated successfully');
            }
            closeForm();
            await fetchDepartments();
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

    const handleDelete = async (dept: Department) => {
        if (!confirm(`Delete "${dept.name}" (${dept.code})?\n\nThis cannot be undone if the department has no active courses.`)) return;
        setActionLoadingId(dept.id);
        try {
            await deleteDepartment(dept.id);
            setSuccessMessage(`"${dept.name}" deleted.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchDepartments();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to delete department.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleToggleActive = async (dept: Department) => {
        setActionLoadingId(dept.id);
        try {
            await updateDepartment(dept.id, { is_active: !dept.is_active });
            await fetchDepartments();
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

    const handleRestore = async (dept: Department) => {
        if (!confirm(`Restore "${dept.name}"? This will reactivate the department.`)) return;
        setActionLoadingId(dept.id);
        try {
            await restoreDepartment(dept.id);
            setSuccessMessage(`"${dept.name}" restored successfully.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchDepartments();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to restore department.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const getError = (field: string) => fieldErrors[field]?.[0] || '';

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Department Management</h1>
                    <p className="text-muted-foreground">
                        Manage academic departments and their settings.
                    </p>
                </div>
                <Button className="gap-2" onClick={openCreateForm}>
                    <Plus className="h-4 w-4" />
                    Add Department
                </Button>
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
                                <CardTitle>{formMode === 'create' ? 'New Department' : `Edit: ${editingDept?.name}`}</CardTitle>
                                <CardDescription>
                                    {formMode === 'create' ? 'Add a new academic department.' : 'Update department details.'}
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
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Department Code *</Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleFormChange}
                                        placeholder="e.g. CS, ENG, MTH"
                                        maxLength={20}
                                        error={getError('code')}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Short code, auto-uppercased (max 20 chars)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Department Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        placeholder="e.g. Computer Science"
                                        error={getError('name')}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description || ''}
                                    onChange={handleFormChange}
                                    placeholder="Brief description of the department..."
                                    rows={3}
                                    maxLength={1000}
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                />
                            </div>
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
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                                <Button type="submit" isLoading={isSaving} className="gap-2">
                                    {formMode === 'create' ? (
                                        <><Plus className="h-4 w-4" /> Create Department</>
                                    ) : (
                                        <><Pencil className="h-4 w-4" /> Save Changes</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Search Bar */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or code..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
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

            {/* Departments Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Description</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Courses</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading departments...</p>
                                        </td>
                                    </tr>
                                ) : departments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No departments found</p>
                                            <p className="text-xs text-muted-foreground">Create one to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    departments.map((dept) => (
                                        <tr key={dept.id} className="border-b transition-colors hover:bg-muted/50">
                                            {/* Code */}
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary font-mono">
                                                    {dept.code}
                                                </span>
                                            </td>
                                            {/* Name */}
                                            <td className="px-4 py-3 font-medium">{dept.name}</td>
                                            {/* Description */}
                                            <td className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate hidden md:table-cell">
                                                {dept.description || '—'}
                                            </td>
                                            {/* Courses count */}
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {dept.courses_count ?? 0}
                                                </span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${dept.is_active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                    }`}>
                                                    {dept.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {trashedFilter === 'only' ? (
                                                        /* Deleted department — show Restore */
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Restore"
                                                            className="gap-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                                                            onClick={() => handleRestore(dept)}
                                                            disabled={actionLoadingId === dept.id}
                                                        >
                                                            {actionLoadingId === dept.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <><RotateCcw className="h-4 w-4" /> Restore</>
                                                            }
                                                        </Button>
                                                    ) : (
                                                        /* Active department — show full actions */
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title={dept.is_active ? 'Deactivate' : 'Activate'}
                                                                onClick={() => handleToggleActive(dept)}
                                                                disabled={actionLoadingId === dept.id}
                                                            >
                                                                {dept.is_active
                                                                    ? <ToggleRight className="h-4 w-4 text-green-500" />
                                                                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                                                }
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Edit"
                                                                onClick={() => openEditForm(dept)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title="Delete"
                                                                onClick={() => handleDelete(dept)}
                                                                disabled={actionLoadingId === dept.id}
                                                            >
                                                                {actionLoadingId === dept.id
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
                                of <span className="font-medium">{pagination.total}</span> departments
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
