'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, MonitorCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { startOfflineExam } from '@/lib/api/sessions';

/* ------------------------------------------------------------------ */
/*  Validation schema                                                   */
/* ------------------------------------------------------------------ */

const entrySchema = z.object({
    matric_number: z.string().min(1, 'Matric number is required'),
    access_code: z.string().min(1, 'Access code is required'),
});

type EntryValues = z.infer<typeof entrySchema>;

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function OfflineExamEntryPage() {
    const [formError, setFormError] = React.useState<string | null>(null);
    const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EntryValues>({
        resolver: zodResolver(entrySchema),
    });

    const onSubmit = async (values: EntryValues) => {
        setFormError(null);
        setSuccessMsg(null);
        setIsSubmitting(true);

        try {
            const res = await startOfflineExam({
                matric_number: values.matric_number.trim(),
                access_code: values.access_code.trim(),
            });

            const data = res.data;

            // Store bearer token for offline exam API calls
            sessionStorage.setItem('offline_exam_token', data.token);

            const maxAge = data.exam.duration_minutes * 60 + 1800;
            document.cookie = `auth_user_role=student; path=/; max-age=${maxAge}`;

            // Store session data for the exam interface
            sessionStorage.setItem('exam_session', JSON.stringify(data));

            setSuccessMsg(
                data.resumed
                    ? `Session resumed — ${data.student.full_name}. Redirecting...`
                    : `Welcome, ${data.student.full_name}. Starting exam...`
            );

            setTimeout(() => {
                window.location.href = `/exam/${data.session_id}`;
            }, 1500);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            if (e.response?.data?.errors) {
                const msgs = Object.values(e.response.data.errors).flat();
                setFormError(msgs.join(' '));
            } else {
                setFormError(e.response?.data?.message || 'Failed to start exam. Please try again.');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container relative min-h-screen flex-col items-center justify-center flex">
            <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
                {/* Branding */}
                <div className="flex flex-col space-y-2 text-center">
                    <div className="flex items-center justify-center gap-2 text-lg font-medium mb-2">
                        <MonitorCheck className="h-6 w-6" />
                        CBT System
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Exam Entry
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Enter your matric number and semester access code to begin
                    </p>
                </div>

                {/* Form */}
                <div className={cn('grid gap-6')}>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="matric_number">Matric Number</Label>
                                <Input
                                    id="matric_number"
                                    placeholder="e.g. NCE/22/CS/001"
                                    type="text"
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    autoFocus
                                    disabled={isSubmitting}
                                    error={errors.matric_number?.message}
                                    {...register('matric_number')}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="access_code">Access Code</Label>
                                <Input
                                    id="access_code"
                                    placeholder="Enter your semester access code"
                                    type="text"
                                    autoCapitalize="none"
                                    autoComplete="off"
                                    autoCorrect="off"
                                    disabled={isSubmitting}
                                    error={errors.access_code?.message}
                                    {...register('access_code')}
                                />
                            </div>

                            {formError && (
                                <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
                                    {formError}
                                </div>
                            )}

                            {successMsg && (
                                <div className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                                    {successMsg}
                                </div>
                            )}

                            <Button disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Start Exam
                            </Button>
                        </div>
                    </form>
                </div>

                <p className="px-8 text-center text-xs text-muted-foreground">
                    If you encounter any issues, contact your invigilator immediately.
                </p>
            </div>
        </div>
    );
}
