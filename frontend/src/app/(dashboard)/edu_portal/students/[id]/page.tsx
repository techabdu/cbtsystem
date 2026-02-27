'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getUser, updateUser, deleteUser, toggleUserActive } from '@/lib/api/users';
import { getActiveCombinations } from '@/lib/api/combinations';
import { getActiveLevels } from '@/lib/api/levels';
import type { User, Combination, Level } from '@/lib/types/models';
import type { UpdateUserData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    ArrowLeft, Pencil, Save, X, Trash2,
    Eye, EyeOff, AlertCircle, CheckCircle2, Loader2,
    Mail, Phone, Calendar, UserCheck, UserX, Hash, BarChart3
} from 'lucide-react';

export default function StudentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const userId = Number(params.id);

    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(searchParams.get('edit') === 'true');
    const [isSaving, setIsSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [generalError, setGeneralError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [actionLoading, setActionLoading] = useState(false);
    const [combinations, setCombinations] = useState<Combination[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);

    const [form, setForm] = useState<UpdateUserData>({});

    const fetchUser = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getUser(userId);
            setUser(res.data.user);
            setForm({
                first_name: res.data.user.first_name,
                last_name: res.data.user.last_name,
                middle_name: res.data.user.middle_name || '',
                email: res.data.user.email,
                role: 'student',
                student_id: res.data.user.student_id || '',
                phone: res.data.user.phone || '',
                is_active: res.data.user.is_active,
                is_verified: res.data.user.is_verified,
                combination_id: res.data.user.combination_id,
                level_id: res.data.user.level_id,
            });
        } catch (err) {
            console.error('Failed to fetch user:', err);
            setGeneralError('Failed to load student. They may not exist.');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => { fetchUser(); }, [fetchUser]);

    useEffect(() => {
        Promise.all([getActiveCombinations(), getActiveLevels()])
            .then(([comboRes, levelRes]) => {
                setCombinations(comboRes.data.combinations);
                setLevels(levelRes.data.levels);
            })
            .catch(console.error);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFieldErrors((prev) => ({ ...prev, [name]: [] }));
        setGeneralError('');
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setForm((prev) => ({ ...prev, [name]: checked }));
        } else if (name === 'combination_id' || name === 'level_id') {
            setForm((prev) => ({ ...prev, [name]: value ? parseInt(value, 10) : undefined }));
        } else {
            setForm((prev) => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFieldErrors({});
        setGeneralError('');
        setSuccessMessage('');

        try {
            const payload: UpdateUserData = { ...form, role: 'student' };
            if (!payload.password) {
                delete payload.password;
                delete payload.password_confirmation;
            }

            const res = await updateUser(userId, payload);
            setUser(res.data.user);
            setSuccessMessage(res.message || 'Student updated successfully');
            setIsEditing(false);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            if (error.response?.data?.errors) {
                setFieldErrors(error.response.data.errors);
            }
            setGeneralError(error.response?.data?.message || 'Failed to update student.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!user) return;
        if (!confirm(`Are you sure you want to delete ${user.full_name}?`)) return;
        setActionLoading(true);
        try {
            await deleteUser(userId);
            router.push('/edu_portal/students');
        } catch (err) {
            console.error('Delete failed:', err);
            setGeneralError('Failed to delete student.');
            setActionLoading(false);
        }
    };

    const handleToggleActive = async () => {
        if (!user) return;
        setActionLoading(true);
        try {
            const res = await toggleUserActive(userId);
            setUser(res.data.user);
            setSuccessMessage(res.message || 'Status updated');
        } catch (err) {
            console.error('Toggle failed:', err);
            setGeneralError('Failed to toggle status.');
        } finally {
            setActionLoading(false);
        }
    };

    const cancelEdit = () => {
        setIsEditing(false);
        setFieldErrors({});
        setGeneralError('');
        if (user) {
            setForm({
                first_name: user.first_name,
                last_name: user.last_name,
                middle_name: user.middle_name || '',
                email: user.email,
                role: 'student',
                student_id: user.student_id || '',
                phone: user.phone || '',
                is_active: user.is_active,
                is_verified: user.is_verified,
                combination_id: user.combination_id,
                level_id: user.level_id,
            });
        }
    };

    const getError = (field: string) => fieldErrors[field]?.[0] || '';

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user && !isLoading) {
        return (
            <div className="space-y-4">
                <Link href="/edu_portal/students">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Students
                    </Button>
                </Link>
                <Card>
                    <CardContent className="py-16 text-center">
                        <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground/40" />
                        <p className="mt-2 text-sm text-muted-foreground">Student not found or has been deleted.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/edu_portal/students">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{user!.full_name}</h1>
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                Student
                            </span>
                        </div>
                        <p className="text-muted-foreground">{user!.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" className="gap-2" onClick={() => setIsEditing(true)}>
                                <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={handleToggleActive}
                                isLoading={actionLoading}
                            >
                                {user!.is_active
                                    ? <><UserX className="h-4 w-4 text-orange-500" /> Deactivate</>
                                    : <><UserCheck className="h-4 w-4 text-green-500" /> Activate</>
                                }
                            </Button>
                            <Button variant="destructive" className="gap-2" onClick={handleDelete} isLoading={actionLoading}>
                                <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" className="gap-2" onClick={cancelEdit}>
                                <X className="h-4 w-4" /> Cancel
                            </Button>
                            <Button className="gap-2" onClick={handleSave} isLoading={isSaving}>
                                <Save className="h-4 w-4" /> Save Changes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}
            {generalError && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{generalError}</p>
                </div>
            )}

            {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <Input id="first_name" name="first_name" value={form.first_name} onChange={handleChange} error={getError('first_name')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="middle_name">Middle Name</Label>
                                    <Input id="middle_name" name="middle_name" value={form.middle_name} onChange={handleChange} error={getError('middle_name')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <Input id="last_name" name="last_name" value={form.last_name} onChange={handleChange} error={getError('last_name')} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} error={getError('email')} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input id="phone" name="phone" value={form.phone} onChange={handleChange} error={getError('phone')} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Academic Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                                        Student (fixed)
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="student_id">Matric Number</Label>
                                    <Input id="student_id" name="student_id" value={form.student_id} onChange={handleChange} error={getError('student_id')} />
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="combination_id">Combination</Label>
                                    <select id="combination_id" name="combination_id" value={form.combination_id || ''} onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">Select combination...</option>
                                        {combinations.map((combo) => (
                                            <option key={combo.id} value={combo.id}>{combo.code} — {combo.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="level_id">Level</Label>
                                    <select id="level_id" name="level_id" value={form.level_id || ''} onChange={handleChange}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">Select level...</option>
                                        {levels.map((level) => (
                                            <option key={level.id} value={level.id}>{level.code} — {level.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

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

                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                            <CardDescription>Leave blank to keep the current password.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="password">New Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password" name="password" type={showPassword ? 'text' : 'password'}
                                            value={form.password || ''} onChange={handleChange} placeholder="Leave blank to keep" error={getError('password')}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation">Confirm New Password</Label>
                                    <Input id="password_confirmation" name="password_confirmation" type={showPassword ? 'text' : 'password'} value={form.password_confirmation || ''} onChange={handleChange} placeholder="Leave blank to keep" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button variant="outline" type="button" onClick={cancelEdit}>Cancel</Button>
                        <Button type="submit" isLoading={isSaving} className="gap-2">
                            <Save className="h-4 w-4" /> Save Changes
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="grid gap-6 md:grid-cols-3">
                    {/* Main Info */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Student Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl className="grid gap-6 sm:grid-cols-2">
                                <InfoRow icon={<Mail className="h-4 w-4" />} label="Email" value={user!.email} />
                                <InfoRow icon={<Phone className="h-4 w-4" />} label="Phone" value={user!.phone || '—'} />
                                <InfoRow icon={<Hash className="h-4 w-4" />} label="Matric Number" value={user!.student_id || '—'} />
                                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Joined"
                                    value={user!.created_at ? new Date(user!.created_at).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                />
                                <InfoRow icon={<Calendar className="h-4 w-4" />} label="Last Login"
                                    value={user!.last_login_at ? new Date(user!.last_login_at).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                />
                                {user!.combination && (
                                    <InfoRow icon={<Hash className="h-4 w-4" />} label="Combination"
                                        value={<span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                                            {user!.combination.code} — {user!.combination.name}
                                        </span>}
                                    />
                                )}
                                <InfoRow icon={<BarChart3 className="h-4 w-4" />} label="Level"
                                    value={user!.level
                                        ? <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                            {user!.level.code} — {user!.level.name}
                                        </span>
                                        : '—'
                                    }
                                />
                            </dl>
                        </CardContent>
                    </Card>

                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Account Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <StatusItem label="Active" active={user!.is_active} />
                            <StatusItem label="Email Verified" active={user!.is_verified} />
                            <StatusItem label="Profile Complete" active={user!.is_profile_complete} />
                        </CardContent>
                        <CardFooter className="flex-col gap-2">
                            <Button
                                variant="outline"
                                className="w-full gap-2"
                                onClick={handleToggleActive}
                                isLoading={actionLoading}
                            >
                                {user!.is_active
                                    ? <><UserX className="h-4 w-4 text-orange-500" /> Deactivate Account</>
                                    : <><UserCheck className="h-4 w-4 text-green-500" /> Activate Account</>
                                }
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 text-muted-foreground">{icon}</span>
            <div>
                <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
                <dd className="text-sm mt-0.5">{value}</dd>
            </div>
        </div>
    );
}

function StatusItem({ label, active }: { label: string; active: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm">{label}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${active
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                {active ? <CheckCircle2 className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {active ? 'Yes' : 'No'}
            </span>
        </div>
    );
}
