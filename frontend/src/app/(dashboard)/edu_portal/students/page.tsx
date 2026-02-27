'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getUsers, deleteUser, toggleUserActive, restoreUser } from '@/lib/api/users';
import { getActiveLevels } from '@/lib/api/levels';
import type { User, Level } from '@/lib/types/models';
import type { UserFilters } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Plus, Search, ChevronLeft, ChevronRight,
    MoreHorizontal, Eye, Pencil, Trash2, ToggleLeft, ToggleRight,
    Users, UserCheck, UserX, GraduationCap,
    Loader2, RotateCcw, Archive
} from 'lucide-react';

const statusBadge = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    inactive: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export default function StudentsPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 15, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const [levels, setLevels] = useState<Level[]>([]);

    // Filters
    const [search, setSearch] = useState('');
    const [levelFilter, setLevelFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [trashedFilter, setTrashedFilter] = useState<'' | 'only' | 'with'>('');
    const [page, setPage] = useState(1);

    // Stats
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

    const fetchStudents = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: UserFilters = { per_page: 15, page, role: 'student' };
            if (search) filters.search = search;
            if (levelFilter) filters.level_id = parseInt(levelFilter, 10);
            if (activeFilter) filters.is_active = activeFilter;
            if (trashedFilter) filters.trashed = trashedFilter;

            const res = await getUsers(filters);
            setUsers(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, levelFilter, activeFilter, trashedFilter, page]);

    const fetchStats = useCallback(async () => {
        try {
            const [all, active, inactive] = await Promise.all([
                getUsers({ per_page: 1, role: 'student' }),
                getUsers({ per_page: 1, role: 'student', is_active: 'true' }),
                getUsers({ per_page: 1, role: 'student', is_active: 'false' }),
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

    useEffect(() => { fetchStudents(); }, [fetchStudents]);
    useEffect(() => { fetchStats(); }, [fetchStats]);

    useEffect(() => {
        getActiveLevels()
            .then((res) => setLevels(res.data.levels))
            .catch(console.error);
    }, []);

    const handleDelete = async (user: User) => {
        if (!confirm(`Are you sure you want to delete ${user.full_name}?\nThis will soft-delete and deactivate the account.`)) return;
        setActionLoadingId(user.id);
        try {
            await deleteUser(user.id);
            await fetchStudents();
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
            await toggleUserActive(user.id);
            await fetchStudents();
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
            await restoreUser(user.id);
            await fetchStudents();
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
        fetchStudents();
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Students</h1>
                    <p className="text-muted-foreground">Manage all student accounts.</p>
                </div>
                <Link href="/edu_portal/students/create">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Student
                    </Button>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All students</p>
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
                                    placeholder="Search by name, email, or matric no..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <select
                            value={levelFilter}
                            onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Levels</option>
                            {levels.map((level) => (
                                <option key={level.id} value={level.id}>
                                    {level.code} — {level.name}
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

            {/* Students Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Email</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Matric No</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Combination</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Level</th>
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
                                            <p className="mt-2 text-sm text-muted-foreground">Loading students...</p>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No students found</p>
                                            <p className="text-xs text-muted-foreground">Try adjusting your search or filters</p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((user) => (
                                        <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                            {/* Name */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
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
                                            {/* Matric No */}
                                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">
                                                {user.student_id || '—'}
                                            </td>
                                            {/* Combination */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                {user.combination ? (
                                                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                                        {user.combination.code}
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            {/* Level */}
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                {user.level ? (
                                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                        {user.level.code}
                                                    </span>
                                                ) : '—'}
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
                                                                        <RotateCcw className="h-4 w-4" /> Restore Student
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button
                                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                                                            onClick={() => { setOpenMenuId(null); router.push(`/edu_portal/students/${user.id}`); }}
                                                                        >
                                                                            <Eye className="h-4 w-4" /> View Details
                                                                        </button>
                                                                        <button
                                                                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                                                                            onClick={() => { setOpenMenuId(null); router.push(`/edu_portal/students/${user.id}?edit=true`); }}
                                                                        >
                                                                            <Pencil className="h-4 w-4" /> Edit Student
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
                                                                            <Trash2 className="h-4 w-4" /> Delete Student
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
                                of <span className="font-medium">{pagination.total}</span> students
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
