'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getCombinations,
    createCombination,
    updateCombination,
    deleteCombination,
    restoreCombination,
} from '@/lib/api/combinations';
import { getActiveDepartments } from '@/lib/api/departments';
import type { Combination, Department } from '@/lib/types/models';
import type { CombinationFilters, CreateCombinationData, UpdateCombinationData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Plus, Search, ChevronLeft, ChevronRight,
    Pencil, Trash2, X, Layers, Users,
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

export default function AdminCombinationsPage() {
    const [combinations, setCombinations] = useState<Combination[]>([]);
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
    const [editingCombo, setEditingCombo] = useState<Combination | null>(null);
    const [formData, setFormData] = useState<CreateCombinationData>({
        code: '',
        name: '',
        first_department_id: 0,
        second_department_id: 0,
        is_active: true
    });
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Ref for scroll-to-form
    const formRef = useRef<HTMLDivElement>(null);

    /* ------------------------------------------------------------------ */
    /*  Fetch Data                                                         */
    /* ------------------------------------------------------------------ */

    // Fetch Departments for Dropdowns
    useEffect(() => {
        getActiveDepartments()
            .then(res => setDepartments(res.data.departments))
            .catch(console.error);
    }, []);

    const fetchCombinations = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: CombinationFilters = { per_page: 20, page };
            if (search) filters.search = search;
            if (trashedFilter) filters.trashed = trashedFilter;

            const res = await getCombinations(filters);
            setCombinations(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch combinations:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, trashedFilter, page]);

    useEffect(() => { fetchCombinations(); }, [fetchCombinations]);

    /* ------------------------------------------------------------------ */
    /*  Form helpers                                                       */
    /* ------------------------------------------------------------------ */

    const openCreateForm = () => {
        setFormMode('create');
        setEditingCombo(null);
        setFormData({
            code: '',
            name: '',
            first_department_id: departments[0]?.id || 0,
            second_department_id: departments[0]?.id || 0,
            is_active: true
        });
        setFieldErrors({});
        setErrorMessage('');
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
        }, 100);
    };

    const openEditForm = (combo: Combination) => {
        setFormMode('edit');
        setEditingCombo(combo);
        setFormData({
            code: combo.code,
            name: combo.name,
            first_department_id: combo.first_department_id,
            second_department_id: combo.second_department_id,
            is_active: combo.is_active,
        });
        setFieldErrors({});
        setErrorMessage('');
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
        }, 100);
    };

    const closeForm = () => {
        setFormMode('closed');
        setEditingCombo(null);
        setFieldErrors({});
        setErrorMessage('');
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFieldErrors((prev) => ({ ...prev, [name]: [] }));

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData((prev) => ({ ...prev, [name]: checked }));
        } else if (name === 'first_department_id' || name === 'second_department_id') {
            setFormData((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
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
                await createCombination(formData);
                setSuccessMessage('Combination created successfully');
            } else if (formMode === 'edit' && editingCombo) {
                const updateData: UpdateCombinationData = { ...formData };
                await updateCombination(editingCombo.id, updateData);
                setSuccessMessage('Combination updated successfully');
            }
            closeForm();
            await fetchCombinations();
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

    const handleDelete = async (combo: Combination) => {
        if (!confirm(`Delete "${combo.code}"? This will soft-delete the combination.`)) return;
        setActionLoadingId(combo.id);
        try {
            await deleteCombination(combo.id);
            setSuccessMessage(`"${combo.code}" deleted.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchCombinations();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to delete combination.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleToggleActive = async (combo: Combination) => {
        setActionLoadingId(combo.id);
        try {
            await updateCombination(combo.id, { is_active: !combo.is_active });
            await fetchCombinations();
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

    const handleRestore = async (combo: Combination) => {
        if (!confirm(`Restore "${combo.code}"? This will reactivate the combination.`)) return;
        setActionLoadingId(combo.id);
        try {
            await restoreCombination(combo.id);
            setSuccessMessage(`"${combo.code}" restored successfully.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchCombinations();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to restore combination.');
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
                    <h1 className="text-2xl font-bold tracking-tight">Combination Management</h1>
                    <p className="text-muted-foreground">
                        Manage subject combinations (e.g. CS/MTH).
                    </p>
                </div>
                <Button className="gap-2" onClick={openCreateForm}>
                    <Plus className="h-4 w-4" />
                    Add Combination
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

            {/* Create / Edit Form */}
            {formMode !== 'closed' && (
                <Card ref={formRef} className="border-primary/30 shadow-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{formMode === 'create' ? 'New Combination' : `Edit: ${editingCombo?.code}`}</CardTitle>
                                <CardDescription>
                                    {formMode === 'create' ? 'Create a new subject combination.' : 'Update combination details.'}
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
                                    <Label htmlFor="code">Code *</Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleFormChange}
                                        placeholder="e.g. CS/MTH"
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
                                        placeholder="e.g. Computer Sci / Mathematics"
                                        error={getError('name')}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="first_department_id">First Department *</Label>
                                    <select
                                        id="first_department_id"
                                        name="first_department_id"
                                        value={formData.first_department_id}
                                        onChange={handleFormChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value={0}>Select Department...</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                        ))}
                                    </select>
                                    {getError('first_department_id') && <p className="text-xs text-destructive">{getError('first_department_id')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="second_department_id">Second Department *</Label>
                                    <select
                                        id="second_department_id"
                                        name="second_department_id"
                                        value={formData.second_department_id}
                                        onChange={handleFormChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value={0}>Select Department...</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                        ))}
                                    </select>
                                    {getError('second_department_id') && <p className="text-xs text-destructive">{getError('second_department_id')}</p>}
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

            {/* Combinations Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Departments</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Students</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading combinations...</p>
                                        </td>
                                    </tr>
                                ) : combinations.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Layers className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No combinations found</p>
                                            <p className="text-xs text-muted-foreground">Create one to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    combinations.map((combo) => (
                                        <tr key={combo.id} className="border-b transition-colors hover:bg-muted/50">
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary font-mono">
                                                    {combo.code}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{combo.name}</td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className="flex gap-2">
                                                    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium border border-secondary-foreground/20">
                                                        {combo.first_department?.code}
                                                    </span>
                                                    {combo.second_department && (
                                                        <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-medium border border-secondary-foreground/20">
                                                            {combo.second_department?.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="inline-flex items-center gap-1 text-sm">
                                                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {combo.students_count ?? 0}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${combo.is_active
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                    }`}>
                                                    {combo.is_active ? 'Active' : 'Inactive'}
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
                                                            onClick={() => handleRestore(combo)}
                                                            disabled={actionLoadingId === combo.id}
                                                        >
                                                            {actionLoadingId === combo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="h-4 w-4" /> Restore</>}
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                title={combo.is_active ? 'Deactivate' : 'Activate'}
                                                                onClick={() => handleToggleActive(combo)}
                                                                disabled={actionLoadingId === combo.id}
                                                            >
                                                                {combo.is_active
                                                                    ? <ToggleRight className="h-4 w-4 text-green-500" />
                                                                    : <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                                                }
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditForm(combo)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Delete" onClick={() => handleDelete(combo)} disabled={actionLoadingId === combo.id}>
                                                                {actionLoadingId === combo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
