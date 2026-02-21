'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createExam } from '@/lib/api/exams';
import { getLecturerMyCourses } from '@/lib/api/hod';
import type { Course } from '@/lib/types/models';
import type { CreateExamData } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Loader2,
    ClipboardList,
    Check,
} from 'lucide-react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const EXAM_TYPES = [
    { value: 'quiz', label: 'Quiz' },
    { value: 'midterm', label: 'Midterm' },
    { value: 'final', label: 'Final' },
    { value: 'practice', label: 'Practice' },
    { value: 'makeup', label: 'Makeup' },
] as const;

const STEPS = [
    { label: 'Basic Info', description: 'Title, type, course' },
    { label: 'Schedule & Config', description: 'Timing, marks, settings' },
    { label: 'Review', description: 'Confirm and create' },
];

/* ------------------------------------------------------------------ */
/*  Default form data                                                   */
/* ------------------------------------------------------------------ */

const defaultData: CreateExamData = {
    course_id: 0,
    title: '',
    description: '',
    instructions: '',
    exam_type: 'midterm',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    total_marks: 100,
    passing_marks: 50,
    randomize_questions: false,
    randomize_options: false,
    questions_per_page: 1,
    allow_backtrack: true,
    show_results_immediately: false,
    show_correct_answers: false,
    requires_password: false,
    exam_password: '',
    is_practice: false,
    enable_proctoring: false,
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function CreateExamPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [formData, setFormData] = useState<CreateExamData>({ ...defaultData });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    /* ------------------------------------------------------------------ */
    /*  Load courses                                                        */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        (async () => {
            setLoadingCourses(true);
            try {
                const res = await getLecturerMyCourses();
                setCourses(res.data.courses);
                if (res.data.courses.length > 0) {
                    setFormData(prev => ({ ...prev, course_id: res.data.courses[0].id }));
                }
            } catch (err) {
                console.error('Failed to fetch courses:', err);
            } finally {
                setLoadingCourses(false);
            }
        })();
    }, []);

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                             */
    /* ------------------------------------------------------------------ */

    const set = <K extends keyof CreateExamData>(key: K, value: CreateExamData[K]) => {
        setFormData(prev => ({ ...prev, [key]: value }));
        setFieldErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
    };

    const getError = (field: string) => fieldErrors[field]?.[0] || '';

    const toDatetimeLocal = (iso: string) => {
        if (!iso) return '';
        try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
    };

    const validateStep1 = (): boolean => {
        const errs: Record<string, string[]> = {};
        if (!formData.course_id) errs.course_id = ['Please select a course.'];
        if (!formData.title.trim()) errs.title = ['Title is required.'];
        if (!formData.exam_type) errs.exam_type = ['Exam type is required.'];
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const validateStep2 = (): boolean => {
        const errs: Record<string, string[]> = {};
        if (!formData.start_time) errs.start_time = ['Start time is required.'];
        if (!formData.end_time) errs.end_time = ['End time is required.'];
        if (formData.start_time && formData.end_time && formData.end_time <= formData.start_time) {
            errs.end_time = ['End time must be after start time.'];
        }
        if (!formData.duration_minutes || formData.duration_minutes < 1) {
            errs.duration_minutes = ['Duration must be at least 1 minute.'];
        }
        if (!formData.total_marks || formData.total_marks < 1) {
            errs.total_marks = ['Total marks must be at least 1.'];
        }
        if (formData.passing_marks > formData.total_marks) {
            errs.passing_marks = ['Passing marks cannot exceed total marks.'];
        }
        if (formData.requires_password && !formData.exam_password?.trim()) {
            errs.exam_password = ['Password is required when password protection is enabled.'];
        }
        setFieldErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleNext = () => {
        if (step === 1 && !validateStep1()) return;
        if (step === 2 && !validateStep2()) return;
        setStep(s => s + 1);
    };

    const handleBack = () => {
        setStep(s => s - 1);
        setFieldErrors({});
        setErrorMessage('');
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        setErrorMessage('');
        setSuccessMessage('');
        try {
            const submitData: CreateExamData = {
                ...formData,
                // Convert datetime-local to ISO if not already
                start_time: formData.start_time ? new Date(formData.start_time).toISOString() : formData.start_time,
                end_time: formData.end_time ? new Date(formData.end_time).toISOString() : formData.end_time,
            };
            if (!submitData.requires_password) {
                delete submitData.exam_password;
            }
            const res = await createExam(submitData);
            setSuccessMessage('Exam created! Redirecting to add questions...');
            setTimeout(() => {
                router.push(`/lecturer/exams/${res.data.id}`);
            }, 1500);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            if (error.response?.data?.errors) {
                setFieldErrors(error.response.data.errors);
                // Go back to the step that has the error
                setStep(1);
            }
            setErrorMessage(error.response?.data?.message || 'Failed to create exam. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Render helpers                                                      */
    /* ------------------------------------------------------------------ */

    const selectedCourse = courses.find(c => c.id === formData.course_id);

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <Link href="/lecturer/exams">
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Create Exam</h1>
                    <p className="text-muted-foreground">Set up a new exam for your course.</p>
                </div>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-0">
                {STEPS.map((s, i) => {
                    const stepNum = i + 1;
                    const isCompleted = step > stepNum;
                    const isCurrent = step === stepNum;
                    return (
                        <div key={s.label} className="flex items-center flex-1">
                            <div className="flex flex-col items-center gap-1">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${isCompleted
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : isCurrent
                                        ? 'border-primary bg-background text-primary'
                                        : 'border-muted-foreground/30 bg-background text-muted-foreground'
                                    }`}>
                                    {isCompleted ? <Check className="h-4 w-4" /> : stepNum}
                                </div>
                                <div className="text-center hidden sm:block">
                                    <p className={`text-xs font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {s.label}
                                    </p>
                                </div>
                            </div>
                            {i < STEPS.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 ${step > stepNum ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}
            {errorMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                </div>
            )}

            {/* Step 1: Basic Info */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ClipboardList className="h-5 w-5" />
                            Basic Information
                        </CardTitle>
                        <CardDescription>Enter the core details for this exam.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Course */}
                        <div className="space-y-2">
                            <Label htmlFor="course_id">Course *</Label>
                            {loadingCourses ? (
                                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    <span className="text-sm text-muted-foreground">Loading courses...</span>
                                </div>
                            ) : (
                                <select
                                    id="course_id"
                                    value={formData.course_id}
                                    onChange={(e) => set('course_id', Number(e.target.value))}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value={0}>Select Course...</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                                    ))}
                                </select>
                            )}
                            {getError('course_id') && <p className="text-xs text-destructive">{getError('course_id')}</p>}
                        </div>

                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Exam Title *</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => set('title', e.target.value)}
                                placeholder="e.g. Midterm Examination — Computer Science 101"
                                maxLength={255}
                                required
                            />
                            {getError('title') && <p className="text-xs text-destructive">{getError('title')}</p>}
                        </div>

                        {/* Exam Type */}
                        <div className="space-y-2">
                            <Label htmlFor="exam_type">Exam Type *</Label>
                            <select
                                id="exam_type"
                                value={formData.exam_type}
                                onChange={(e) => set('exam_type', e.target.value as CreateExamData['exam_type'])}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {EXAM_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                            {getError('exam_type') && <p className="text-xs text-destructive">{getError('exam_type')}</p>}
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <textarea
                                id="description"
                                value={formData.description || ''}
                                onChange={(e) => set('description', e.target.value)}
                                placeholder="Brief description of the exam..."
                                rows={2}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>

                        {/* Instructions */}
                        <div className="space-y-2">
                            <Label htmlFor="instructions">Instructions <span className="text-muted-foreground text-xs">(optional)</span></Label>
                            <textarea
                                id="instructions"
                                value={formData.instructions || ''}
                                onChange={(e) => set('instructions', e.target.value)}
                                placeholder="Instructions shown to students before the exam starts..."
                                rows={3}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                            />
                        </div>

                        {/* Is Practice */}
                        <div className="flex items-center gap-3 rounded-lg border border-input p-3">
                            <input
                                type="checkbox"
                                id="is_practice"
                                checked={formData.is_practice || false}
                                onChange={(e) => set('is_practice', e.target.checked)}
                                className="h-4 w-4 rounded border-input"
                            />
                            <div>
                                <Label htmlFor="is_practice" className="cursor-pointer font-medium">Practice Exam</Label>
                                <p className="text-xs text-muted-foreground">Students can take this exam multiple times for practice. Results are shown immediately.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Schedule & Config */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Schedule &amp; Configuration</CardTitle>
                        <CardDescription>Set timing, marks, and exam behavior.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Start & End Time */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time *</Label>
                                <Input
                                    id="start_time"
                                    type="datetime-local"
                                    value={toDatetimeLocal(formData.start_time)}
                                    onChange={(e) => set('start_time', e.target.value)}
                                    required
                                />
                                {getError('start_time') && <p className="text-xs text-destructive">{getError('start_time')}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">End Time *</Label>
                                <Input
                                    id="end_time"
                                    type="datetime-local"
                                    value={toDatetimeLocal(formData.end_time)}
                                    onChange={(e) => set('end_time', e.target.value)}
                                    required
                                />
                                {getError('end_time') && <p className="text-xs text-destructive">{getError('end_time')}</p>}
                            </div>
                        </div>

                        {/* Duration, Total Marks, Passing Marks */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="duration_minutes">Duration (minutes) *</Label>
                                <Input
                                    id="duration_minutes"
                                    type="number"
                                    min={1}
                                    max={600}
                                    value={formData.duration_minutes}
                                    onChange={(e) => set('duration_minutes', Number(e.target.value))}
                                    required
                                />
                                {getError('duration_minutes') && <p className="text-xs text-destructive">{getError('duration_minutes')}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="total_marks">Total Marks *</Label>
                                <Input
                                    id="total_marks"
                                    type="number"
                                    min={1}
                                    value={formData.total_marks}
                                    onChange={(e) => set('total_marks', Number(e.target.value))}
                                    required
                                />
                                {getError('total_marks') && <p className="text-xs text-destructive">{getError('total_marks')}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="passing_marks">Passing Marks *</Label>
                                <Input
                                    id="passing_marks"
                                    type="number"
                                    min={0}
                                    max={formData.total_marks}
                                    value={formData.passing_marks}
                                    onChange={(e) => set('passing_marks', Number(e.target.value))}
                                    required
                                />
                                {getError('passing_marks') && <p className="text-xs text-destructive">{getError('passing_marks')}</p>}
                            </div>
                        </div>

                        {/* Questions per page */}
                        <div className="space-y-2">
                            <Label htmlFor="questions_per_page">Questions Per Page</Label>
                            <Input
                                id="questions_per_page"
                                type="number"
                                min={1}
                                max={50}
                                value={formData.questions_per_page || 1}
                                onChange={(e) => set('questions_per_page', Number(e.target.value))}
                            />
                            <p className="text-xs text-muted-foreground">How many questions to show on each page during the exam.</p>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium">Exam Behavior</p>
                            {([
                                { key: 'randomize_questions' as const, label: 'Randomize Questions', desc: 'Shuffle question order for each student.' },
                                { key: 'randomize_options' as const, label: 'Randomize Options', desc: 'Shuffle answer choices for multiple choice questions.' },
                                { key: 'allow_backtrack' as const, label: 'Allow Backtracking', desc: 'Students can go back to previous questions.' },
                                { key: 'show_results_immediately' as const, label: 'Show Results Immediately', desc: 'Display score right after submission.' },
                                { key: 'show_correct_answers' as const, label: 'Show Correct Answers', desc: 'Reveal correct answers after submission.' },
                                { key: 'enable_proctoring' as const, label: 'Enable Proctoring', desc: 'Enable exam monitoring features.' },
                            ] as const).map(({ key, label, desc }) => (
                                <div key={key} className="flex items-center gap-3 rounded-lg border border-input p-3">
                                    <input
                                        type="checkbox"
                                        id={key}
                                        checked={Boolean(formData[key])}
                                        onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.checked }))}
                                        className="h-4 w-4 rounded border-input"
                                    />
                                    <div>
                                        <Label htmlFor={key} className="cursor-pointer font-medium text-sm">{label}</Label>
                                        <p className="text-xs text-muted-foreground">{desc}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Password protection */}
                            <div className="flex items-center gap-3 rounded-lg border border-input p-3">
                                <input
                                    type="checkbox"
                                    id="requires_password"
                                    checked={formData.requires_password || false}
                                    onChange={(e) => set('requires_password', e.target.checked)}
                                    className="h-4 w-4 rounded border-input"
                                />
                                <div className="flex-1">
                                    <Label htmlFor="requires_password" className="cursor-pointer font-medium text-sm">Password Protection</Label>
                                    <p className="text-xs text-muted-foreground">Require a password to enter the exam.</p>
                                </div>
                            </div>
                            {formData.requires_password && (
                                <div className="space-y-2 pl-7">
                                    <Label htmlFor="exam_password">Exam Password *</Label>
                                    <Input
                                        id="exam_password"
                                        type="text"
                                        value={formData.exam_password || ''}
                                        onChange={(e) => set('exam_password', e.target.value)}
                                        placeholder="Enter exam password..."
                                        maxLength={100}
                                    />
                                    {getError('exam_password') && <p className="text-xs text-destructive">{getError('exam_password')}</p>}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Review &amp; Create</CardTitle>
                        <CardDescription>Double-check the exam details before creating.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Basic Info */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Basic Information</p>
                            <dl className="space-y-2">
                                <ReviewRow label="Course" value={selectedCourse ? `${selectedCourse.code} — ${selectedCourse.title}` : `ID: ${formData.course_id}`} />
                                <ReviewRow label="Title" value={formData.title} />
                                <ReviewRow label="Exam Type" value={formData.exam_type} />
                                <ReviewRow label="Practice Exam" value={formData.is_practice ? 'Yes' : 'No'} />
                                {formData.description && <ReviewRow label="Description" value={formData.description} />}
                            </dl>
                        </div>

                        <div className="border-t" />

                        {/* Schedule */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Schedule</p>
                            <dl className="space-y-2">
                                <ReviewRow label="Start Time" value={formData.start_time ? new Date(formData.start_time).toLocaleString() : '—'} />
                                <ReviewRow label="End Time" value={formData.end_time ? new Date(formData.end_time).toLocaleString() : '—'} />
                                <ReviewRow label="Duration" value={`${formData.duration_minutes} minutes`} />
                                <ReviewRow label="Total Marks" value={String(formData.total_marks)} />
                                <ReviewRow label="Passing Marks" value={String(formData.passing_marks)} />
                            </dl>
                        </div>

                        <div className="border-t" />

                        {/* Config */}
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Configuration</p>
                            <dl className="space-y-2">
                                <ReviewRow label="Questions per Page" value={String(formData.questions_per_page || 1)} />
                                <ReviewRow label="Randomize Questions" value={formData.randomize_questions ? 'Yes' : 'No'} />
                                <ReviewRow label="Randomize Options" value={formData.randomize_options ? 'Yes' : 'No'} />
                                <ReviewRow label="Allow Backtracking" value={formData.allow_backtrack ? 'Yes' : 'No'} />
                                <ReviewRow label="Show Results Immediately" value={formData.show_results_immediately ? 'Yes' : 'No'} />
                                <ReviewRow label="Show Correct Answers" value={formData.show_correct_answers ? 'Yes' : 'No'} />
                                <ReviewRow label="Password Protected" value={formData.requires_password ? 'Yes' : 'No'} />
                                <ReviewRow label="Proctoring" value={formData.enable_proctoring ? 'Enabled' : 'Disabled'} />
                            </dl>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                            <p className="text-sm text-amber-800 dark:text-amber-300">
                                After creating the exam, you will be redirected to add questions from your question bank.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
                <div>
                    {step > 1 && (
                        <Button variant="outline" onClick={handleBack} className="gap-2">
                            <ChevronLeft className="h-4 w-4" />
                            Back
                        </Button>
                    )}
                </div>
                <div className="flex gap-3">
                    <Link href="/lecturer/exams">
                        <Button variant="ghost">Cancel</Button>
                    </Link>
                    {step < 3 ? (
                        <Button onClick={handleNext} className="gap-2">
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} isLoading={isSaving} className="gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Create Exam
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Review Row helper                                                   */
/* ------------------------------------------------------------------ */

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start gap-3 text-sm">
            <dt className="w-44 shrink-0 text-muted-foreground">{label}</dt>
            <dd className="font-medium break-words">{value}</dd>
        </div>
    );
}
