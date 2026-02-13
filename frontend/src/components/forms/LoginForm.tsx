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
import { ROLES, ROUTES } from '@/lib/constants';

const loginSchema = z.object({
    identifier: z.string().min(1, 'Matric number, file number, or email is required'),
    password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm({ className }: { className?: string }) {
    const router = useRouter();
    const { login, isLoading } = useAuthStore();
    const [formError, setFormError] = React.useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginValues>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginValues) => {
        setFormError(null);
        try {
            await login(data);

            // After successful login, read user from store and redirect to correct dashboard
            const user = useAuthStore.getState().user;
            if (user) {
                // Students with incomplete profiles must complete it first
                if (user.role === ROLES.STUDENT && !user.is_profile_complete) {
                    router.push('/student/complete-profile');
                    return;
                }

                switch (user.role) {
                    case ROLES.ADMIN:
                        router.push(ROUTES.DASHBOARD.ADMIN);
                        break;
                    case ROLES.LECTURER:
                        router.push(ROUTES.DASHBOARD.LECTURER);
                        break;
                    default:
                        router.push(ROUTES.DASHBOARD.STUDENT);
                        break;
                }
            }
        } catch (error) {
            const err = error as AxiosError<{ message: string; errors?: Record<string, string[]> }>;
            // Extract field-level errors if present
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                // Show the first field error
                const firstError = Object.values(apiErrors).flat()[0];
                setFormError(firstError || 'Login failed.');
            } else {
                setFormError(err.response?.data?.message || 'Login failed. Please check your credentials.');
            }
        }
    };

    return (
        <div className={cn('grid gap-6', className)}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="identifier">Matric Number / File Number / Email</Label>
                        <Input
                            id="identifier"
                            placeholder="e.g. CSC/2020/001 or STF/001 or email"
                            type="text"
                            autoCapitalize="none"
                            autoComplete="username"
                            autoCorrect="off"
                            disabled={isLoading}
                            error={errors.identifier?.message}
                            {...register('identifier')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            autoComplete="current-password"
                            disabled={isLoading}
                            error={errors.password?.message}
                            {...register('password')}
                        />
                    </div>

                    {formError && (
                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                            {formError}
                        </div>
                    )}

                    <Button disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Sign In
                    </Button>
                </div>
            </form>
        </div>
    );
}
