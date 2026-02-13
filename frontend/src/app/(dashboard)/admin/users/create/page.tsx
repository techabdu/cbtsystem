'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUser } from '@/lib/api/users';
import type { CreateUserData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function CreateUserPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [generalError, setGeneralError] = useState('');

    const [form, setForm] = useState<CreateUserData>({
        first_name: '',
        last_name: '',
        middle_name: '',
        email: '',
        password: '',
        password_confirmation: '',
        role: 'lecturer',
        staff_id: '',
        student_id: '',
        phone: '',
        is_active: true,
        is_verified: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFieldErrors((prev) => ({ ...prev, [name]: [] }));
        setGeneralError('');

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setForm((prev) => ({ ...prev, [name]: checked }));
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
            setSuccessMessage(res.message || 'User created successfully');
            // Reset form
            setForm({
                first_name: '', last_name: '', middle_name: '', email: '',
                password: '', password_confirmation: '', role: 'lecturer',
                staff_id: '', student_id: '', phone: '', is_active: true, is_verified: false,
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

                {/* Role & Identification */}
                <Card>
                    <CardHeader>
                        <CardTitle>Role & Identification</CardTitle>
                        <CardDescription>Assign a role and identification number.</CardDescription>
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
                                    <option value="lecturer">Lecturer</option>
                                    <option value="admin">Admin</option>
                                    <option value="student">Student</option>
                                </select>
                                {getError('role') && <span className="text-xs text-red-500">{getError('role')}</span>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={form.role === 'student' ? 'student_id' : 'staff_id'}>
                                    {form.role === 'student' ? 'Student ID' : 'Staff ID'}
                                </Label>
                                {form.role === 'student' ? (
                                    <Input id="student_id" name="student_id" value={form.student_id} onChange={handleChange} placeholder="2024/CS/001" error={getError('student_id')} />
                                ) : (
                                    <Input id="staff_id" name="staff_id" value={form.staff_id} onChange={handleChange} placeholder="STAFF/2024/001" error={getError('staff_id')} />
                                )}
                            </div>
                        </div>

                        {/* Flags */}
                        <div className="flex flex-wrap gap-6 pt-2">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleChange} className="h-4 w-4 rounded border-input" />
                                Account Active
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="checkbox" name="is_verified" checked={form.is_verified} onChange={handleChange} className="h-4 w-4 rounded border-input" />
                                Email Verified
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Password */}
                <Card>
                    <CardHeader>
                        <CardTitle>Security</CardTitle>
                        <CardDescription>Set the user&rsquo;s password. Must contain uppercase, lowercase, number, and special character.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password *</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={form.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        error={getError('password')}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password_confirmation">Confirm Password *</Label>
                                <Input
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password_confirmation}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
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
