'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUser } from '@/lib/api/users';
import { getActiveDepartments } from '@/lib/api/departments';
import { getActiveCombinations } from '@/lib/api/combinations';
import { getActiveLevels } from '@/lib/api/levels';
import type { CreateUserData } from '@/lib/types/api';
import type { Department, Combination, Level } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, UserPlus, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function CreateUserPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [generalError, setGeneralError] = useState('');
    const [departments, setDepartments] = useState<Department[]>([]);
    const [combinations, setCombinations] = useState<Combination[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);

    const [form, setForm] = useState<CreateUserData>({
        first_name: '',
        last_name: '',
        middle_name: '',
        email: '',
        role: 'student',
        department_id: undefined,
        combination_id: undefined,
        staff_id: '',
        student_id: '',
        phone: '',
        is_active: true,
        level_id: undefined,
    });

    // Fetch departments and combinations
    useEffect(() => {
        Promise.all([
            getActiveDepartments(),
            getActiveCombinations(),
            getActiveLevels(),
        ]).then(([deptRes, comboRes, levelRes]) => {
            setDepartments(deptRes.data.departments);
            setCombinations(comboRes.data.combinations);
            setLevels(levelRes.data.levels);
        }).catch(console.error);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFieldErrors((prev) => ({ ...prev, [name]: [] }));
        setGeneralError('');

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setForm((prev) => ({ ...prev, [name]: checked }));
        } else if (name === 'department_id' || name === 'combination_id' || name === 'level_id') {
            setForm((prev) => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setFieldErrors({});
        setGeneralError('');
        setSuccessMessage('');

        try {
            const res = await createUser(form);
            setSuccessMessage(res.message || 'User created successfully. They can now activate their account.');
            // Reset form
            setForm({
                first_name: '', last_name: '', middle_name: '', email: '',
                role: 'student', department_id: undefined,
                staff_id: '', student_id: '', phone: '', is_active: true,
            });
            // Redirect after brief delay so success is visible
            setTimeout(() => router.push('/admin/users'), 1500);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            if (error.response?.data?.errors) {
                setFieldErrors(error.response.data.errors);
            }
            setGeneralError(error.response?.data?.message || 'Failed to create user. Please check your input.');
        } finally {
            setIsLoading(false);
        }
    };

    const getError = (field: string) => fieldErrors[field]?.[0] || '';

    // Logic: Lecturers -> Department, Students -> Combination
    const showDepartment = form.role === 'lecturer' || form.role === 'admin';
    const showCombination = form.role === 'student';
    const showStudentId = form.role === 'student';
    const showStaffId = form.role === 'lecturer' || form.role === 'admin';

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/users">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create User</h1>
                    <p className="text-muted-foreground">Add a new admin, lecturer, or student account.</p>
                </div>
            </div>

            {/* Activation Info Banner */}
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/30 dark:text-blue-300">
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium">No password needed</p>
                    <p className="text-blue-700 dark:text-blue-400">
                        The user will create their own password when they first activate their account
                        using their matric number or file number.
                    </p>
                </div>
            </div>

            {/* Success Toast */}
            {successMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}

            {/* Error Banner */}
            {generalError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{generalError}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Information</CardTitle>
                        <CardDescription>Basic details about the user.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="first_name">First Name *</Label>
                                <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} placeholder="John" error={getError('first_name')} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="middle_name">Middle Name</Label>
                                <Input id="middle_name" name="middle_name" value={form.middle_name} onChange={handleChange} placeholder="A." error={getError('middle_name')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="last_name">Last Name *</Label>
                                <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} placeholder="Doe" error={getError('last_name')} required />
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="user@college.edu" error={getError('email')} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+234XXXXXXXXXX" error={getError('phone')} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Role, Department & Identification */}
                <Card>
                    <CardHeader>
                        <CardTitle>Role, Department & Identification</CardTitle>
                        <CardDescription>Assign a role, department, and identification number.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="role">Role *</Label>
                                <select
                                    id="role"
                                    name="role"
                                    value={form.role}
                                    onChange={handleChange}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    required
                                >
                                    <option value="student">Student</option>
                                    <option value="lecturer">Lecturer</option>
                                    <option value="admin">Admin</option>
                                </select>
                                {getError('role') && <span className="text-xs text-red-500">{getError('role')}</span>}
                            </div>
                            {showDepartment && (
                                <div className="space-y-2">
                                    <Label htmlFor="department_id">
                                        Department {form.role !== 'admin' ? '*' : ''}
                                    </Label>
                                    <select
                                        id="department_id"
                                        name="department_id"
                                        value={form.department_id || ''}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required={form.role === 'student' || form.role === 'lecturer'}
                                    >
                                        <option value="">Select department...</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name} ({dept.code})
                                            </option>
                                        ))}
                                    </select>
                                    {getError('department_id') && <span className="text-xs text-red-500">{getError('department_id')}</span>}
                                </div>
                            )}

                            {showCombination && (
                                <div className="space-y-2">
                                    <Label htmlFor="combination_id">Subject Combination *</Label>
                                    <select
                                        id="combination_id"
                                        name="combination_id"
                                        value={form.combination_id || ''}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value="">Select combination...</option>
                                        {combinations.map((combo) => (
                                            <option key={combo.id} value={combo.id}>
                                                {combo.code} - {combo.name}
                                            </option>
                                        ))}
                                    </select>
                                    {getError('combination_id') && <span className="text-xs text-red-500">{getError('combination_id')}</span>}
                                </div>
                            )}
                        </div>

                        {/* Level selector for students */}
                        {showCombination && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="level_id">Level *</Label>
                                    <select
                                        id="level_id"
                                        name="level_id"
                                        value={form.level_id || ''}
                                        onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        required
                                    >
                                        <option value="">Select level...</option>
                                        {levels.map((level) => (
                                            <option key={level.id} value={level.id}>
                                                {level.code} — {level.name}
                                            </option>
                                        ))}
                                    </select>
                                    {getError('level_id') && <span className="text-xs text-red-500">{getError('level_id')}</span>}
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2">
                            {showStudentId && (
                                <div className="space-y-2">
                                    <Label htmlFor="student_id">Matric Number *</Label>
                                    <Input
                                        id="student_id"
                                        name="student_id"
                                        value={form.student_id}
                                        onChange={handleChange}
                                        placeholder="CSC/2024/001"
                                        error={getError('student_id')}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The student will use this to activate their account and log in.
                                    </p>
                                </div>
                            )}
                            {showStaffId && (
                                <div className="space-y-2">
                                    <Label htmlFor="staff_id">File Number *</Label>
                                    <Input
                                        id="staff_id"
                                        name="staff_id"
                                        value={form.staff_id}
                                        onChange={handleChange}
                                        placeholder="STF/2024/001"
                                        error={getError('staff_id')}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The user will use this to activate their account and log in.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Active flag & HOD toggle */}
                        <div className="flex flex-wrap gap-6 pt-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="h-4 w-4 rounded border-input" />
                                Account Active
                            </label>
                            {form.role === 'lecturer' && (
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_hod"
                                        checked={form.is_hod || false}
                                        onChange={handleChange}
                                        className="h-4 w-4 rounded border-input"
                                    />
                                    <span>Head of Department (HOD)</span>
                                </label>
                            )}
                        </div>
                        {form.role === 'lecturer' && form.is_hod && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                Only one HOD per department. If another lecturer is currently HOD in this department, they will be replaced.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Submit */}
                <div className="flex justify-end gap-3">
                    <Link href="/admin/users">
                        <Button variant="outline" type="button">Cancel</Button>
                    </Link>
                    <Button type="submit" isLoading={isLoading} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Create User
                    </Button>
                </div>
            </form>
        </div>
    );
}
