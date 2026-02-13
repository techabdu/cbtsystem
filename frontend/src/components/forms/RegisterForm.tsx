'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[@$!%*?&]/, 'Password must contain at least one special character (@$!%*?&)'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
    first_name: z.string().min(2, 'First name is required'),
    last_name: z.string().min(2, 'Last name is required'),
    student_id: z.string().min(3, 'Student ID is required'),
}).refine((data) => data.password === data.password_confirmation, {
    message: "Passwords don't match",
    path: ['password_confirmation'],
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm({ className }: { className?: string }) {
    const router = useRouter();
    const { register: registerUser, isLoading } = useAuthStore();
    const [formError, setFormError] = React.useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterValues>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterValues) => {
        setFormError(null);
        setFieldErrors({});
        try {
            await registerUser(data);
            // After registration, send student to complete their profile
            router.push('/student/complete-profile');
        } catch (error) {
            const err = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>;
            // Extract field-level errors if present (e.g. "email already exists")
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                const mapped: Record<string, string> = {};
                for (const [field, messages] of Object.entries(apiErrors)) {
                    mapped[field] = messages[0];
                }
                setFieldErrors(mapped);
                // Show the first error as the general message
                setFormError(Object.values(mapped)[0] || 'Registration failed.');
            } else {
                setFormError(err.response?.data?.message || 'Registration failed.');
            }
        }
    };

    // Helper: get error for a field (from Zod or API)
    const getFieldError = (field: keyof RegisterValues): string | undefined => {
        return errors[field]?.message || fieldErrors[field];
    };

    return (
        <div className={cn('grid gap-6', className)}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                disabled={isLoading}
                                error={getFieldError('first_name')}
                                {...register('first_name')}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                disabled={isLoading}
                                error={getFieldError('last_name')}
                                {...register('last_name')}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="student@college.edu"
                            disabled={isLoading}
                            error={getFieldError('email')}
                            {...register('email')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="student_id">Student ID</Label>
                        <Input
                            id="student_id"
                            placeholder="202X/XX/XXX"
                            disabled={isLoading}
                            error={getFieldError('student_id')}
                            {...register('student_id')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            disabled={isLoading}
                            error={getFieldError('password')}
                            {...register('password')}
                        />
                        <p className="text-xs text-muted-foreground">
                            Min 8 chars, with uppercase, lowercase, number, and special character.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm Password</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            disabled={isLoading}
                            error={getFieldError('password_confirmation')}
                            {...register('password_confirmation')}
                        />
                    </div>

                    {formError && (
                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                            {formError}
                        </div>
                    )}

                    <Button disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                    </Button>
                </div>
            </form>
        </div>
    );
}
