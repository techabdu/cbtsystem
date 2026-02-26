'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/authStore';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { getUsers } from '@/lib/api/users';
import { getActiveDepartments } from '@/lib/api/departments';
import { getActiveCombinations } from '@/lib/api/combinations';
import type { User, Department, Combination } from '@/lib/types/models';
import {
    Loader2,
    AlertCircle,
    Users,
    GraduationCap,
    Building2,
    Layers,
    UserCheck,
    ArrowRight,
    BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';

/* ------------------------------------------------------------------ */
/*  Stat card                                                           */
/* ------------------------------------------------------------------ */

interface StatCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: React.ElementType;
    iconColor?: string;
    href?: string;
}

function StatCard({ title, value, description, icon: Icon, iconColor, href }: StatCardProps) {
    const inner = (
        <Card className={href ? 'transition-shadow hover:shadow-md cursor-pointer' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${iconColor ?? 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
    return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ------------------------------------------------------------------ */
/*  Recent activations list                                             */
/* ------------------------------------------------------------------ */

interface RecentUserRowProps {
    user: User;
}

function RecentUserRow({ user }: RecentUserRowProps) {
    const roleColors: Record<string, string> = {
        student: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
        lecturer: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
        admin: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
        cbt: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        edu_portal: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    };

    return (
        <div className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
                <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${roleColors[user.role] ?? 'bg-muted text-muted-foreground'}`}
                >
                    {user.role.replace('_', ' ')}
                </span>
                {user.created_at && (
                    <span className="hidden text-xs text-muted-foreground sm:block">
                        {format(new Date(user.created_at), 'MMM dd')}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Department enrollment row                                           */
/* ------------------------------------------------------------------ */

function DepartmentRow({ dept }: { dept: Department }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs font-bold text-muted-foreground">
                    {dept.code}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{dept.name}</p>
                    {dept.school && (
                        <p className="text-xs text-muted-foreground truncate">{dept.school.name}</p>
                    )}
                </div>
            </div>
            <div className="shrink-0 text-right">
                {dept.courses_count !== undefined && (
                    <p className="text-sm font-semibold">{dept.courses_count}</p>
                )}
                <p className="text-xs text-muted-foreground">courses</p>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */

export default function EduPortalDashboard() {
    const { user } = useAuthStore();

    /* --- users data --- */
    const [students, setStudents] = useState<User[]>([]);
    const [lecturers, setLecturers] = useState<User[]>([]);
    const [recentUsers, setRecentUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState('');
    const [totalStudents, setTotalStudents] = useState(0);
    const [totalLecturers, setTotalLecturers] = useState(0);

    /* --- departments data --- */
    const [departments, setDepartments] = useState<Department[]>([]);
    const [deptLoading, setDeptLoading] = useState(true);

    /* --- combinations data --- */
    const [combinations, setCombinations] = useState<Combination[]>([]);
    const [combLoading, setCombLoading] = useState(true);

    /* --- fetch users --- */
    useEffect(() => {
        const fetchUsers = async () => {
            setUsersLoading(true);
            setUsersError('');
            try {
                const [studentRes, lecturerRes, recentRes] = await Promise.all([
                    getUsers({ role: 'student', per_page: 1 }),
                    getUsers({ role: 'lecturer', per_page: 1 }),
                    getUsers({ per_page: 8, sort_by: 'created_at', sort_dir: 'desc' }),
                ]);
                setTotalStudents(studentRes.pagination.total);
                setTotalLecturers(lecturerRes.pagination.total);
                setStudents(studentRes.data);
                setLecturers(lecturerRes.data);
                setRecentUsers(recentRes.data);
            } catch (err: unknown) {
                const e = err as { response?: { data?: { message?: string } } };
                setUsersError(e.response?.data?.message ?? 'Failed to load user data.');
            } finally {
                setUsersLoading(false);
            }
        };
        fetchUsers();
    }, []);

    /* --- fetch departments --- */
    useEffect(() => {
        getActiveDepartments()
            .then((res) => setDepartments(res.data.departments ?? []))
            .catch(() => {/* non-critical */})
            .finally(() => setDeptLoading(false));
    }, []);

    /* --- fetch combinations --- */
    useEffect(() => {
        getActiveCombinations()
            .then((res) => setCombinations(res.data.combinations ?? []))
            .catch(() => {/* non-critical */})
            .finally(() => setCombLoading(false));
    }, []);

    const isStatsLoading = usersLoading || deptLoading || combLoading;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Edu Portal Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.first_name}! Enrollment overview and institution management.
                </p>
            </div>

            {/* Error banner */}
            {usersError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{usersError}</p>
                </div>
            )}

            {/* Stats grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Students"
                    value={usersLoading ? '—' : totalStudents}
                    description="Registered student accounts"
                    icon={GraduationCap}
                    iconColor="text-sky-500"
                    href="/edu_portal/users"
                />
                <StatCard
                    title="Total Lecturers"
                    value={usersLoading ? '—' : totalLecturers}
                    description="Registered lecturer accounts"
                    icon={Users}
                    iconColor="text-violet-500"
                    href="/edu_portal/users"
                />
                <StatCard
                    title="Active Departments"
                    value={deptLoading ? '—' : departments.length}
                    description="Currently active departments"
                    icon={Building2}
                    iconColor="text-emerald-500"
                    href="/edu_portal/departments"
                />
                <StatCard
                    title="Active Combinations"
                    value={combLoading ? '—' : combinations.length}
                    description="Active study combinations"
                    icon={Layers}
                    iconColor="text-orange-500"
                    href="/edu_portal/combinations"
                />
            </div>

            {/* Two-column layout: recent activations + department overview */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent user registrations */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Registrations</CardTitle>
                            <CardDescription>Latest user accounts created in the system</CardDescription>
                        </div>
                        <Link href="/edu_portal/users" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {usersLoading ? (
                            <div className="flex min-h-[10rem] items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : recentUsers.length === 0 ? (
                            <div className="py-8 text-center">
                                <UserCheck className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                <p className="mt-2 text-sm text-muted-foreground">No users found.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recentUsers.map((u) => (
                                    <RecentUserRow key={u.id} user={u} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Department overview */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Departments</CardTitle>
                            <CardDescription>Active departments with course counts</CardDescription>
                        </div>
                        <Link href="/edu_portal/departments" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            Manage <ArrowRight className="h-3 w-3" />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {deptLoading ? (
                            <div className="flex min-h-[10rem] items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : departments.length === 0 ? (
                            <div className="py-8 text-center">
                                <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
                                <p className="mt-2 text-sm text-muted-foreground">No departments found.</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {departments.slice(0, 8).map((dept) => (
                                    <DepartmentRow key={dept.id} dept={dept} />
                                ))}
                                {departments.length > 8 && (
                                    <p className="pt-1 text-center text-xs text-muted-foreground">
                                        +{departments.length - 8} more departments
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Combination overview */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Study Combinations</CardTitle>
                        <CardDescription>Active dual-department programs</CardDescription>
                    </div>
                    <Link href="/edu_portal/combinations" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                        Manage <ArrowRight className="h-3 w-3" />
                    </Link>
                </CardHeader>
                <CardContent>
                    {combLoading ? (
                        <div className="flex min-h-[6rem] items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : combinations.length === 0 ? (
                        <div className="py-6 text-center">
                            <Layers className="mx-auto h-8 w-8 text-muted-foreground/40" />
                            <p className="mt-2 text-sm text-muted-foreground">No active combinations found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {combinations.slice(0, 9).map((comb) => (
                                <div
                                    key={comb.id}
                                    className="rounded-md border bg-muted/30 p-3 space-y-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-bold text-muted-foreground">
                                            {comb.code}
                                        </span>
                                        {comb.students_count !== undefined && (
                                            <span className="text-xs text-muted-foreground">
                                                {comb.students_count} student{comb.students_count !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-medium leading-tight">{comb.name}</p>
                                    {comb.first_department && comb.second_department && (
                                        <p className="text-xs text-muted-foreground">
                                            {comb.first_department.code} + {comb.second_department.code}
                                        </p>
                                    )}
                                </div>
                            ))}
                            {combinations.length > 9 && (
                                <div className="rounded-md border border-dashed p-3 flex items-center justify-center">
                                    <Link href="/edu_portal/combinations" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                                        +{combinations.length - 9} more
                                    </Link>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick navigation shortcuts */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Navigate to management sections</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { href: '/edu_portal/users', label: 'Manage Users', icon: Users, color: 'text-sky-600' },
                            { href: '/edu_portal/departments', label: 'Departments', icon: Building2, color: 'text-emerald-600' },
                            { href: '/edu_portal/combinations', label: 'Combinations', icon: Layers, color: 'text-orange-600' },
                            { href: '/edu_portal/courses', label: 'Courses', icon: BookOpen, color: 'text-violet-600' },
                        ].map(({ href, label, icon: Icon, color }) => (
                            <Link key={href} href={href}>
                                <div className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer">
                                    <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                                    <span className="text-sm font-medium">{label}</span>
                                    <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
