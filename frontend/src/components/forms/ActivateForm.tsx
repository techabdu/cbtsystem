'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/authStore';
import { cn } from '@/lib/utils';
import { ROLES, ROUTES } from '@/lib/constants';

const activateSchema = z.object({
    identifier: z.string().min(1, 'Matric number or file number is required'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number')
        .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
});

type ActivateValues = z.infer<typeof activateSchema>;

export function ActivateForm({ className }: { className?: string }) {
    const router = useRouter();
    const { activateAccount, isLoading } = useAuthStore();
    const [formError, setFormError] = React.useState<string | null>(null);
    const [showPassword, setShowPassword] = React.useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ActivateValues>({
        resolver: zodResolver(activateSchema),
    });

    const onSubmit = async (data: ActivateValues) => {
        setFormError(null);
        try {
            await activateAccount(data);

            // After successful activation (auto-login), redirect to dashboard
            const user = useAuthStore.getState().user;
            if (user) {
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
            const apiErrors = err.response?.data?.errors;
            if (apiErrors) {
                const firstError = Object.values(apiErrors).flat()[0];
                setFormError(firstError || 'Activation failed.');
            } else {
                setFormError(err.response?.data?.message || 'Activation failed. Please try again.');
            }
        }
    };

    return (
        <div className={cn('grid gap-6', className)}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="identifier">Matric Number / File Number</Label>
                        <Input
                            id="identifier"
                            placeholder="e.g. CSC/2020/001 or STF/001"
                            type="text"
                            autoCapitalize="characters"
                            autoComplete="username"
                            autoCorrect="off"
                            disabled={isLoading}
                            error={errors.identifier?.message}
                            {...register('identifier')}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Create Password</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                disabled={isLoading}
                                error={errors.password?.message}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Min 8 characters with uppercase, lowercase, number, and special character.
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">Confirm Password</Label>
                        <Input
                            id="password_confirmation"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            disabled={isLoading}
                            error={errors.password_confirmation?.message}
                            {...register('password_confirmation')}
                        />
                    </div>

                    {formError && (
                        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                            {formError}
                        </div>
                    )}

                    <Button disabled={isLoading} className="gap-2">
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <ShieldCheck className="h-4 w-4" />
                        )}
                        Activate Account
                    </Button>
                </div>
            </form>
        </div>
    );
}
