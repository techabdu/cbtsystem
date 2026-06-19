'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUsers, deleteUser, toggleUserActive, restoreUser } from '@/lib/api/users';
import { getActiveDepartments } from '@/lib/api/departments';
import type { User, Department } from '@/lib/types/models';
import type { UserFilters } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Plus, Search, ChevronLeft, ChevronRight,
    MoreHorizontal, Eye, Pencil, Trash2, ToggleLeft, ToggleRight,
    Users, UserCheck, UserX, BookOpen,
    Loader2, RotateCcw, Archive, Upload
} from 'lucide-react';

const statusBadge = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function LecturersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 15, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);

    // Filters
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [trashedFilter, setTrashedFilter] = useState<'' | 'only' | 'with'>('');
    const [page, setPage] = useState(1);

    // Stats
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    const fetchLecturers = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: UserFilters = { per_page: 15, page, role: 'lecturer' };
            if (search) filters.search = search;
            if (deptFilter) filters.department_id = parseInt(deptFilter, 10);
            if (activeFilter) filters.is_active = activeFilter;
            if (trashedFilter) filters.trashed = trashedFilter;

            const res = await getUsers(filters);
            setUsers(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch lecturers:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, deptFilter, activeFilter, trashedFilter, page]);

    const fetchStats = useCallback(async () => {
        try {
            const [all, active, inactive] = await Promise.all([
                getUsers({ per_page: 1, role: 'lecturer' }),
                getUsers({ per_page: 1, role: 'lecturer', is_active: 'true' }),
                getUsers({ per_page: 1, role: 'lecturer', is_active: 'false' }),
            ]);
            setStats({
                total: all.pagination.total,
                active: active.pagination.total,
                inactive: inactive.pagination.total,
            });
        } catch {
            // silent
        }
    }, []);

    useEffect(() => { fetchLecturers(); }, [fetchLecturers]);
    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        getActiveDepartments()
            .then((res) => setDepartments(res.data.departments))
            .catch(console.error);
    }, []);

    const handleDelete = async (user: User) => {
        if (!confirm(`Are you sure you want to delete ${user.full_name}?\nThis will soft-delete and deactivate the account.`)) return;
        setActionLoadingId(user.id);
        try {
            await deleteUser(user.uuid);
            await fetchLecturers();
            await fetchStats();
        } catch (err) {
            console.error('Delete failed:', err);
        } finally {
            setActionLoadingId(null);
            setOpenMenuId(null);
        }
    };

    const handleToggleActive = async (user: User) => {
        setActionLoadingId(user.id);
        try {
            await toggleUserActive(user.uuid);
            await fetchLecturers();
        } catch (err) {
            console.error('Toggle active failed:', err);
        } finally {
            setActionLoadingId(null);
            setOpenMenuId(null);
        }
    };

    const handleRestore = async (user: User) => {
        if (!confirm(`Restore ${user.full_name}? This will reactivate their account.`)) return;
        setActionLoadingId(user.id);
        try {
            await restoreUser(user.uuid);
            await fetchLecturers();
            await fetchStats();
        } catch (err) {
            console.error('Restore failed:', err);
        } finally {
            setActionLoadingId(null);
            setOpenMenuId(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchLecturers();
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Lecturers</h1>
                    <p className="text-muted-foreground">Manage all lecturer accounts.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/edu_portal/lecturers/bulk-upload">
                        <Button variant="outline" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Bulk Upload
                        </Button>
                    </Link>
                    <Link href="/edu_portal/lecturers/create">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Lecturer
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Lecturers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All lecturers</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setActiveFilter('true'); setPage(1); }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.active}</div>
                        <p className="text-xs text-muted-foreground">Active accounts</p>
                    </CardContent>
                </Card>
                <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => { setActiveFilter('false'); setPage(1); }}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inactive</CardTitle>
                        <UserX className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inactive}</div>
                        <p className="text-xs text-muted-foreground">Inactive accounts</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Bar */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name, email, or staff ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <select
                            value={deptFilter}
                            onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Departments</option>
                            {departments.map((dept) => (
                                <option key={dept.id} value={dept.id}>
                                    {dept.name} ({dept.code})
                                </option>
                            ))}
                        </select>
                        <select
                            value={activeFilter}
                            onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Status</option>
                            <option value="true">Active</option>
                            <option value="false">Inactive</option>
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

            {/* Lecturers Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Staff ID</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Department</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Role</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading lecturers...</p>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No lecturers found</p>
                                            <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                            {/* Name */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                        {user.first_name?.[0]}{user.last_name?.[0]}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{user.full_name}</p>
                                                        <p className="text-xs text-muted-foreground truncate sm:hidden">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            {/* Email */}
                                            <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                                                <span className="truncate">{user.email}</span>
                                            </td>
                                            {/* Staff ID */}
                                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">
                                                {user.staff_id || '—'}
                                            </td>
                                            {/* Department */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {user.department ? (
                                                    <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                                        {user.department.code}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            {/* HOD badge */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.is_hod && (
                                                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">HOD</span>
                                                    )}
                                                    {user.is_school_exam_officer && (
                                                        <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">School Officer</span>
                                                    )}
                                                    {user.is_department_exam_officer && (
                                                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">Dept Officer</span>
                                                    )}
                                                    {!user.is_hod && !user.is_school_exam_officer && !user.is_department_exam_officer && (
                                                        <span className="text-muted-foreground text-xs">—</span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${user.is_active ? statusBadge.active : statusBadge.inactive}`}>
                                                    {user.is_active ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            {/* Joined */}
                                            <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                                                {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="relative inline-block">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                                        disabled={actionLoadingId === user.id}
                                                    >
                                                        {actionLoadingId === user.id
                                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                                            : <MoreHorizontal className="h-4 w-4" />
                                                        }
                                                    </Button>
                                                    {openMenuId === user.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                                                            <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
                                                                {trashedFilter === 'only' ? (
                                                                    <button
                                                                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors"
                                                                        onClick={() => handleRestore(user)}
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" /> Restore Lecturer
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                                                            onClick={() => { setOpenMenuId(null); router.push(`/edu_portal/lecturers/${user.id}`); }}
                                                                        >
                                                                            <Eye className="h-4 w-4" /> View Details
                                                                        </button>
                                                                        <button
                                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                                                            onClick={() => { setOpenMenuId(null); router.push(`/edu_portal/lecturers/${user.id}?edit=true`); }}
                                                                        >
                                                                            <Pencil className="h-4 w-4" /> Edit Lecturer
                                                                        </button>
                                                                        <button
                                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                                                            onClick={() => handleToggleActive(user)}
                                                                        >
                                                                            {user.is_active
                                                                                ? <><ToggleRight className="h-4 w-4 text-orange-500" /> Deactivate</>
                                                                                : <><ToggleLeft className="h-4 w-4 text-green-500" /> Activate</>
                                                                            }
                                                                        </button>
                                                                        <div className="my-1 border-t" />
                                                                        <button
                                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                                                                            onClick={() => handleDelete(user)}
                                                                        >
                                                                            <Trash2 className="h-4 w-4" /> Delete Lecturer
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
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
                    {!isLoading && pagination.total_pages > 0 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span>{' '}
                                of <span className="font-medium">{pagination.total}</span> lecturers
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
