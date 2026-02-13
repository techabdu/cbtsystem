'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle } from 'lucide-react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/constants';

const profileSchema = z.object({
    first_name: z.string().min(2, 'First name is required'),
    last_name: z.string().min(2, 'Last name is required'),
    middle_name: z.string().optional().or(z.literal('')),
    phone: z.string().min(7, 'A valid phone number is required').max(20),
    student_id: z.string().min(3, 'Student ID is required').max(50),
});

type ProfileValues = z.infer<typeof profileSchema>;

export default function CompleteProfilePage() {
    const router = useRouter();
    const { user, updateProfile, isLoading } = useAuthStore();
    const [formError, setFormError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProfileValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            first_name: user?.first_name || '',
            last_name: user?.last_name || '',
            middle_name: user?.middle_name || '',
            phone: user?.phone || '',
            student_id: user?.student_id || '',
        },
    });

    // If profile is already complete, redirect to dashboard
    React.useEffect(() => {
        if (user?.is_profile_complete) {
            router.replace(ROUTES.DASHBOARD.STUDENT);
        }
    }, [user, router]);

    const onSubmit = async (data: ProfileValues) => {
        setFormError(null);
        try {
            await updateProfile({
                first_name: data.first_name,
                last_name: data.last_name,
                middle_name: data.middle_name || undefined,
                phone: data.phone,
                student_id: data.student_id,
            });
            setSuccess(true);
            // brief pause for UX then redirect
            setTimeout(() => {
                router.push(ROUTES.DASHBOARD.STUDENT);
            }, 800);
        } catch (error) {
            const err = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>;
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                const firstError = Object.values(apiErrors).flat()[0];
                setFormError(firstError || 'Update failed.');
            } else {
                setFormError(err.response?.data?.message || 'Profile update failed.');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Complete Your Profile</h1>
                <p className="text-muted-foreground">
                    Please fill in the required information to continue using the platform.
                </p>
            </div>

            <Card className="max-w-2xl">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                            <UserCircle className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>
                                Fields marked with <span className="text-destructive">*</span> are required
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid gap-5">
                            {/* Name Row */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="first_name">
                                        First Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="first_name"
                                        disabled={isLoading}
                                        error={errors.first_name?.message}
                                        {...register('first_name')}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="middle_name">Middle Name</Label>
                                    <Input
                                        id="middle_name"
                                        disabled={isLoading}
                                        error={errors.middle_name?.message}
                                        {...register('middle_name')}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="last_name">
                                        Last Name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="last_name"
                                        disabled={isLoading}
                                        error={errors.last_name?.message}
                                        {...register('last_name')}
                                    />
                                </div>
                            </div>

                            {/* Contact */}
                            <div className="grid gap-2">
                                <Label htmlFor="phone">
                                    Phone Number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+234 800 000 0000"
                                    disabled={isLoading}
                                    error={errors.phone?.message}
                                    {...register('phone')}
                                />
                            </div>

                            {/* Student ID */}
                            <div className="grid gap-2">
                                <Label htmlFor="student_id">
                                    Student ID <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="student_id"
                                    placeholder="202X/XX/XXX"
                                    disabled={isLoading}
                                    error={errors.student_id?.message}
                                    {...register('student_id')}
                                />
                            </div>

                            {/* Error / Success messages */}
                            {formError && (
                                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                                    {formError}
                                </div>
                            )}
                            {success && (
                                <div className="rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Profile updated successfully! Redirecting…
                                </div>
                            )}

                            <Button disabled={isLoading || success} className="w-full sm:w-auto">
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save & Continue
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
