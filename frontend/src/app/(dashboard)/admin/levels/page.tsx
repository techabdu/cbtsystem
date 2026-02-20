'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getLevels,
    createLevel,
    updateLevel,
    deleteLevel,
    restoreLevel,
} from '@/lib/api/levels';
import type { Level } from '@/lib/types/models';
import type { LevelFilters, CreateLevelData, UpdateLevelData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Plus, Search, ChevronLeft, ChevronRight,
    Pencil, Trash2, X, BarChart3, Users, BookOpen,
    Loader2, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
    RotateCcw, Archive, ArrowUpDown,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FormMode = 'closed' | 'create' | 'edit';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminLevelsPage() {
    const [levels, setLevels] = useState<Level[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 20, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [trashedFilter, setTrashedFilter] = useState<'' | 'only' | 'with'>('');
    const [page, setPage] = useState(1);

    // Form state
    const [formMode, setFormMode] = useState<FormMode>('closed');
    const [editingLevel, setEditingLevel] = useState<Level | null>(null);
    const [formData, setFormData] = useState<CreateLevelData>({
        code: '',
        name: '',
        numeric_order: 1,
        is_active: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    /* ------------------------------------------------------------------ */
    /*  Fetch Data                                                         */
    /* ------------------------------------------------------------------ */

    const fetchLevels = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: LevelFilters = { per_page: 20, page, sort_by: 'numeric_order', sort_dir: 'asc' };
            if (search) filters.search = search;
            if (trashedFilter) filters.trashed = trashedFilter;

            const res = await getLevels(filters);
            setLevels(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch levels:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, trashedFilter, page]);

    useEffect(() => { fetchLevels(); }, [fetchLevels]);

    /* ------------------------------------------------------------------ */
    /*  Stats                                                              */
    /* ------------------------------------------------------------------ */

    const totalLevels = pagination.total;
    const activeLevels = levels.filter((l) => l.is_active).length;
    const totalStudents = levels.reduce((sum, l) => sum + (l.students_count ?? 0), 0);
    const totalCourses = levels.reduce((sum, l) => sum + (l.courses_count ?? 0), 0);

    /* ------------------------------------------------------------------ */
    /*  Form helpers                                                       */
    /* ------------------------------------------------------------------ */

    const openCreateForm = () => {
        setFormMode('create');
        setEditingLevel(null);
        // Suggest next numeric_order
        const maxOrder = levels.reduce((max, l) => Math.max(max, l.numeric_order ?? 0), 0);
        setFormData({
            code: '',
            name: '',
            numeric_order: maxOrder + 1,
            is_active: true,
        });
        setFieldErrors({});
        setErrorMessage('');
    };

    const openEditForm = (level: Level) => {
        setFormMode('edit');
        setEditingLevel(level);
        setFormData({
            code: level.code,
            name: level.name,
            numeric_order: level.numeric_order,
            is_active: level.is_active,
        });
        setFieldErrors({});
        setErrorMessage('');
    };

    const closeForm = () => {
        setFormMode('closed');
        setEditingLevel(null);
        setFieldErrors({});
        setErrorMessage('');
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFieldErrors((prev) => ({ ...prev, [name]: [] }));

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else if (name === 'numeric_order') {
            setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) || 1 }));
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
                await createLevel(formData);
                setSuccessMessage('Level created successfully');
            } else if (formMode === 'edit' && editingLevel) {
                const updateData: UpdateLevelData = { ...formData };
                await updateLevel(editingLevel.id, updateData);
                setSuccessMessage('Level updated successfully');
            }
            closeForm();
            await fetchLevels();
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

    const handleDelete = async (level: Level) => {
        if (!confirm(`Delete "${level.code}"? This will soft-delete the level.`)) return;
        setActionLoadingId(level.id);
        try {
            await deleteLevel(level.id);
            setSuccessMessage(`"${level.code}" deleted.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchLevels();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to delete level.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleToggleActive = async (level: Level) => {
        setActionLoadingId(level.id);
        try {
            await updateLevel(level.id, { is_active: !level.is_active });
            await fetchLevels();
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

    const handleRestore = async (level: Level) => {
        if (!confirm(`Restore "${level.code}"? This will reactivate the level.`)) return;
        setActionLoadingId(level.id);
        try {
            await restoreLevel(level.id);
            setSuccessMessage(`"${level.code}" restored successfully.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchLevels();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to restore level.');
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
                    <h1 className="text-2xl font-bold tracking-tight">Level Management</h1>
                    <p className="text-muted-foreground">
                        Manage academic levels (e.g. 100L, 200L, NCE Year 1).
                    </p>
                </div>
                <Button className="gap-2" onClick={openCreateForm}>
                    <Plus className="h-4 w-4" />
                    Add Level
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <BarChart3 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Levels</p>
                                <p className="text-2xl font-bold">{totalLevels}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-green-500/10 p-2">
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Levels</p>
                                <p className="text-2xl font-bold">{activeLevels}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                                <Users className="h-5 w-5 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Students</p>
                                <p className="text-2xl font-bold">{totalStudents}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-orange-500/10 p-2">
                                <BookOpen className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Courses</p>
                                <p className="text-2xl font-bold">{totalCourses}</p>
                            </div>
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

            {/* Create / Edit Form */}
            {formMode !== 'closed' && (
                <Card className="border-primary/30 shadow-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{formMode === 'create' ? 'New Level' : `Edit: ${editingLevel?.code}`}</CardTitle>
                                <CardDescription>
                                    {formMode === 'create' ? 'Create a new academic level.' : 'Update level details.'}
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
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Code *</Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleFormChange}
                                        placeholder="e.g. 100L, NCE1"
                                        maxLength={20}
                                        error={getError('code')}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Unique code (max 20 chars)</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleFormChange}
                                        placeholder="e.g. 100 Level, NCE Year 1"
                                        maxLength={100}
                                        error={getError('name')}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="numeric_order">Sort Order *</Label>
                                    <Input
                                        id="numeric_order"
                                        name="numeric_order"
                                        type="number"
                                        min={1}
                                        value={formData.numeric_order}
                                        onChange={handleFormChange}
                                        placeholder="e.g. 1, 2, 3"
                                        error={getError('numeric_order')}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">Determines display order</p>
                                </div>
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
                                    {formMode === 'create' ? <><Plus className="h-4 w-4" /> Create</> : <><Pencil className="h-4 w-4" /> Save</>}
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

            {/* Levels Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-16">
                                        <div className="flex items-center justify-center gap-1">
                                            <ArrowUpDown className="h-3.5 w-3.5" />
                                            Order
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Students</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden md:table-cell">Courses</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading levels...</p>
                                        </td>
                                    </tr>
                                ) : levels.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <BarChart3 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No levels found</p>
                                            <p className="text-xs text-muted-foreground">Create one to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    levels.map((level) => (
                                        <tr key={level.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-1 text-xs font-mono font-medium min-w-[2rem]">
                                                    {level.numeric_order}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary font-mono">
                                                    {level.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{level.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {level.students_count ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {level.courses_count ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${level.is_active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                    }`}>
                                                    {level.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {trashedFilter === 'only' ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Restore"
                                                            className="gap-1.5 text-green-600 hover:text-green-700"
                                                            onClick={() => handleRestore(level)}
                                                            disabled={actionLoadingId === level.id}
                                                        >
                                                            {actionLoadingId === level.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4" /> Restore</>}
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title={level.is_active ? 'Deactivate' : 'Activate'}
                                                                onClick={() => handleToggleActive(level)}
                                                                disabled={actionLoadingId === level.id}
                                                            >
                                                                {level.is_active
                                                                    ? <ToggleRight className="h-4 w-4 text-green-500" />
                                                                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                                                }
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditForm(level)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(level)} disabled={actionLoadingId === level.id}>
                                                                {actionLoadingId === level.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
                                of <span className="font-medium">{pagination.total}</span>
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
