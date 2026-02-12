
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
    email: z.string().email('Please enter a valid email address'),
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
            const user = useAuthStore.getState().user;
            if (user) {
                if (user.role === ROLES.ADMIN) router.push(ROUTES.DASHBOARD.ADMIN);
                else if (user.role === ROLES.LECTURER) router.push(ROUTES.DASHBOARD.LECTURER);
                else router.push(ROUTES.DASHBOARD.STUDENT);
            }
        } catch (error) {
            const err = error as AxiosError<{ message: string }>;
            setFormError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        }
    };

    return (
        <div className={cn('grid gap-6', className)}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            placeholder="name@example.com"
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isLoading}
                            error={errors.email?.message}
                            {...register('email')}
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
                        <div className="text-sm font-medium text-destructive">
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
