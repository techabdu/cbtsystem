'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    verifyQuestion,
    getQuestionStats,
} from '@/lib/api/questions';
import { getCourses } from '@/lib/api/courses';
import type { Question, Course } from '@/lib/types/models';
import type { QuestionFilters, CreateQuestionData, UpdateQuestionData, QuestionStats } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Plus, Search, ChevronLeft, ChevronRight,
    Pencil, Trash2, X, FileQuestion,
    Loader2, CheckCircle2, AlertCircle,
    ToggleLeft, ToggleRight, Shield, Eye, EyeOff,
    MinusCircle, PlusCircle, BarChart3,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type FormMode = 'closed' | 'create' | 'edit';

const QUESTION_TYPES = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'true_false', label: 'True/False' },
    { value: 'fill_in_blank', label: 'Fill in Blank' },
    { value: 'essay', label: 'Essay' },
] as const;

const DIFFICULTY_LEVELS = [
    { value: 'easy', label: 'Easy', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
    { value: 'hard', label: 'Hard', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
] as const;

const TYPE_BADGES: Record<string, string> = {
    multiple_choice: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    true_false: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    fill_in_blank: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    essay: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const TYPE_LABELS: Record<string, string> = {
    multiple_choice: 'MCQ',
    true_false: 'T/F',
    fill_in_blank: 'Fill-in',
    essay: 'Essay',
};

/* ------------------------------------------------------------------ */
/*  Default Form Data                                                  */
/* ------------------------------------------------------------------ */

const defaultFormData: CreateQuestionData = {
    course_id: 0,
    question_text: '',
    question_type: 'multiple_choice',
    options: [
        { key: 'A', value: '' },
        { key: 'B', value: '' },
        { key: 'C', value: '' },
        { key: 'D', value: '' },
    ],
    correct_answer: '',
    points: 1,
    difficulty_level: 'medium',
    topic: '',
    tags: [],
    is_active: true,
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LecturerQuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [stats, setStats] = useState<QuestionStats | null>(null);
    const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, per_page: 20, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterCourseId, setFilterCourseId] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');
    const [filterDifficulty, setFilterDifficulty] = useState<string>('');
    const [page, setPage] = useState(1);

    // Form state
    const [formMode, setFormMode] = useState<FormMode>('closed');
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [formData, setFormData] = useState<CreateQuestionData>({ ...defaultFormData });
    const [isSaving, setIsSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Preview state
    const [previewId, setPreviewId] = useState<number | null>(null);

    // Ref for scroll-to-form
    const formRef = useRef<HTMLDivElement>(null);

    /* ------------------------------------------------------------------ */
    /*  Fetch Data                                                         */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        (async () => {
            try {
                const [coursesRes, statsRes] = await Promise.all([
                    getCourses({ per_page: 100 }),
                    getQuestionStats(),
                ]);
                setCourses(coursesRes.data);
                setStats(statsRes.data);
            } catch (err) {
                console.error('Failed to fetch courses/stats:', err);
            }
        })();
    }, []);

    const fetchQuestions = useCallback(async () => {
        setIsLoading(true);
        try {
            const filters: QuestionFilters = { per_page: 20, page };
            if (search) filters.search = search;
            if (filterCourseId) filters.course_id = Number(filterCourseId);
            if (filterType) filters.question_type = filterType;
            if (filterDifficulty) filters.difficulty_level = filterDifficulty;

            const res = await getQuestions(filters);
            setQuestions(res.data);
            setPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch questions:', err);
        } finally {
            setIsLoading(false);
        }
    }, [search, page, filterCourseId, filterType, filterDifficulty]);

    useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

    const refreshStats = async () => {
        try {
            const statsRes = await getQuestionStats();
            setStats(statsRes.data);
        } catch { /* silently continue */ }
    };

    /* ------------------------------------------------------------------ */
    /*  Form helpers                                                       */
    /* ------------------------------------------------------------------ */

    const openCreateForm = () => {
        setFormMode('create');
        setEditingQuestion(null);
        setFormData({
            ...defaultFormData,
            course_id: courses[0]?.id || 0,
        });
        setFieldErrors({});
        setErrorMessage('');
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            formRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
        }, 100);
    };

    const openEditForm = (q: Question) => {
        setFormMode('edit');
        setEditingQuestion(q);
        setFormData({
            course_id: q.course_id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options || defaultFormData.options,
            correct_answer: q.correct_answer as string || '',
            points: q.points,
            difficulty_level: q.difficulty_level,
            topic: q.topic || '',
            tags: q.tags || [],
            is_active: q.is_active,
        });
        setFieldErrors({});
        setErrorMessage('');
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            formRef.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus();
        }, 100);
    };

    const closeForm = () => {
        setFormMode('closed');
        setEditingQuestion(null);
        setFieldErrors({});
        setErrorMessage('');
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setFieldErrors({});
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // Build data — strip options for non-MCQ types
            const submitData = { ...formData };
            if (submitData.question_type !== 'multiple_choice') {
                delete submitData.options;
            }
            if (submitData.question_type === 'essay') {
                delete submitData.correct_answer;
            }
            if (submitData.question_type === 'true_false') {
                submitData.correct_answer = String(submitData.correct_answer);
            }

            if (formMode === 'create') {
                await createQuestion(submitData);
                setSuccessMessage('Question created successfully');
            } else if (formMode === 'edit' && editingQuestion) {
                const updateData: UpdateQuestionData = { ...submitData };
                await updateQuestion(editingQuestion.id, updateData);
                setSuccessMessage('Question updated successfully');
            }
            closeForm();
            await fetchQuestions();
            await refreshStats();
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
            if (error.response?.data?.errors) {
                setFieldErrors(error.response.data.errors);
            }
            setErrorMessage(error.response?.data?.message || 'Something went wrong.');
        } finally {
            setIsSaving(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Option Management (for MCQ)                                        */
    /* ------------------------------------------------------------------ */

    const addOption = () => {
        const opts = formData.options || [];
        const nextKey = String.fromCharCode(65 + opts.length); // A, B, C, D, E...
        setFormData(prev => ({
            ...prev,
            options: [...(prev.options || []), { key: nextKey, value: '' }],
        }));
    };

    const removeOption = (index: number) => {
        setFormData(prev => ({
            ...prev,
            options: (prev.options || []).filter((_, i) => i !== index),
        }));
    };

    const updateOption = (index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            options: (prev.options || []).map((opt, i) => i === index ? { ...opt, value } : opt),
        }));
    };

    /* ------------------------------------------------------------------ */
    /*  Actions                                                            */
    /* ------------------------------------------------------------------ */

    const handleDelete = async (q: Question) => {
        if (!confirm(`Delete this question?\n\n"${q.question_text.substring(0, 100)}..."`)) return;
        setActionLoadingId(q.id);
        try {
            await deleteQuestion(q.id);
            setSuccessMessage('Question deleted.');
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchQuestions();
            await refreshStats();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to delete question.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleVerify = async (q: Question) => {
        setActionLoadingId(q.id);
        try {
            await verifyQuestion(q.id);
            setSuccessMessage('Question verified successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchQuestions();
            await refreshStats();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to verify question.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
    };

    const getError = (field: string) => fieldErrors[field]?.[0] || '';

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Question Bank</h1>
                    <p className="text-muted-foreground">
                        Create and manage exam questions for your courses.
                    </p>
                </div>
                <Button className="gap-2" onClick={openCreateForm}>
                    <Plus className="h-4 w-4" />
                    New Question
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary/10 p-2">
                                    <FileQuestion className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Questions</p>
                                    <p className="text-2xl font-bold">{stats.total}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-green-500/10 p-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Verified</p>
                                    <p className="text-2xl font-bold">{stats.verified}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-500/10 p-2">
                                    <BarChart3 className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Active</p>
                                    <p className="text-2xl font-bold">{stats.active}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(stats.by_type).map(([type, count]) => (
                                    <span key={type} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TYPE_BADGES[type] || ''}`}>
                                        {TYPE_LABELS[type]}: {count}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Messages */}
            {successMessage && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{successMessage}</p>
                </div>
            )}
            {errorMessage && formMode === 'closed' && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{errorMessage}</p>
                </div>
            )}

            {/* Create / Edit Form (inline card) */}
            {formMode !== 'closed' && (
                <Card ref={formRef} className="border-primary/30 shadow-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>{formMode === 'create' ? 'New Question' : 'Edit Question'}</CardTitle>
                                <CardDescription>
                                    {formMode === 'create' ? 'Add a new question to the question bank.' : 'Update question details.'}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closeForm}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {errorMessage && (
                            <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <p className="text-sm">{errorMessage}</p>
                            </div>
                        )}
                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            {/* Row 1: Course & Type */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="course_id">Course *</Label>
                                    <select
                                        id="course_id"
                                        value={formData.course_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, course_id: Number(e.target.value) }))}
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value={0}>Select Course...</option>
                                        {courses.map((c) => (
                                            <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                                        ))}
                                    </select>
                                    {getError('course_id') && <p className="text-xs text-destructive">{getError('course_id')}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="question_type">Question Type *</Label>
                                    <select
                                        id="question_type"
                                        value={formData.question_type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, question_type: e.target.value as CreateQuestionData['question_type'] }))}
                                        required
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {QUESTION_TYPES.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Question Text */}
                            <div className="space-y-2">
                                <Label htmlFor="question_text">Question Text *</Label>
                                <textarea
                                    id="question_text"
                                    value={formData.question_text}
                                    onChange={(e) => setFormData(prev => ({ ...prev, question_text: e.target.value }))}
                                    placeholder="Enter the question text..."
                                    rows={3}
                                    maxLength={10000}
                                    required
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                                />
                                {getError('question_text') && <p className="text-xs text-destructive">{getError('question_text')}</p>}
                            </div>

                            {/* Options (for MCQ only) */}
                            {formData.question_type === 'multiple_choice' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Options *</Label>
                                        <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1">
                                            <PlusCircle className="h-3.5 w-3.5" /> Add Option
                                        </Button>
                                    </div>
                                    {(formData.options || []).map((opt, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center rounded-md bg-muted px-2.5 py-1.5 text-sm font-bold min-w-[2rem]">
                                                {opt.key}
                                            </span>
                                            <Input
                                                value={opt.value}
                                                onChange={(e) => updateOption(idx, e.target.value)}
                                                placeholder={`Option ${opt.key}...`}
                                                className="flex-1"
                                                required
                                            />
                                            <label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer" title="Mark as correct">
                                                <input
                                                    type="radio"
                                                    name="correct_answer_mcq"
                                                    checked={formData.correct_answer === opt.key}
                                                    onChange={() => setFormData(prev => ({ ...prev, correct_answer: opt.key }))}
                                                    className="h-4 w-4"
                                                />
                                                Correct
                                            </label>
                                            {(formData.options?.length || 0) > 2 && (
                                                <Button type="button" variant="ghost" size="icon" onClick={() => removeOption(idx)} className="shrink-0">
                                                    <MinusCircle className="h-4 w-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    {getError('options') && <p className="text-xs text-destructive">{getError('options')}</p>}
                                    {getError('correct_answer') && <p className="text-xs text-destructive">{getError('correct_answer')}</p>}
                                </div>
                            )}

                            {/* Correct Answer (True/False) */}
                            {formData.question_type === 'true_false' && (
                                <div className="space-y-2">
                                    <Label>Correct Answer *</Label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="correct_answer_tf"
                                                checked={formData.correct_answer === 'true'}
                                                onChange={() => setFormData(prev => ({ ...prev, correct_answer: 'true' }))}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm font-medium">True</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="correct_answer_tf"
                                                checked={formData.correct_answer === 'false'}
                                                onChange={() => setFormData(prev => ({ ...prev, correct_answer: 'false' }))}
                                                className="h-4 w-4"
                                            />
                                            <span className="text-sm font-medium">False</span>
                                        </label>
                                    </div>
                                    {getError('correct_answer') && <p className="text-xs text-destructive">{getError('correct_answer')}</p>}
                                </div>
                            )}

                            {/* Correct Answer (Fill in Blank) */}
                            {formData.question_type === 'fill_in_blank' && (
                                <div className="space-y-2">
                                    <Label htmlFor="correct_answer_fib">Correct Answer *</Label>
                                    <Input
                                        id="correct_answer_fib"
                                        value={String(formData.correct_answer || '')}
                                        onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: e.target.value }))}
                                        placeholder="Enter the expected answer..."
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">The exact text students must type</p>
                                    {getError('correct_answer') && <p className="text-xs text-destructive">{getError('correct_answer')}</p>}
                                </div>
                            )}

                            {/* Essay notice */}
                            {formData.question_type === 'essay' && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                                    <p className="text-sm text-blue-800 dark:text-blue-300">
                                        Essay questions require manual grading. No correct answer is needed.
                                    </p>
                                </div>
                            )}

                            {/* Row 3: Points, Difficulty, Topic */}
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label htmlFor="points">Points</Label>
                                    <Input
                                        id="points"
                                        type="number"
                                        step="0.01"
                                        min={0.01}
                                        max={999.99}
                                        value={formData.points ?? ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, points: Number(e.target.value) || undefined }))}
                                        placeholder="1.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="difficulty_level">Difficulty</Label>
                                    <select
                                        id="difficulty_level"
                                        value={formData.difficulty_level || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, difficulty_level: e.target.value as CreateQuestionData['difficulty_level'] || undefined }))}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="">Not Set</option>
                                        {DIFFICULTY_LEVELS.map((d) => (
                                            <option key={d.value} value={d.value}>{d.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="topic">Topic</Label>
                                    <Input
                                        id="topic"
                                        value={formData.topic || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                                        placeholder="e.g. Algorithms, Genetics"
                                        maxLength={200}
                                    />
                                </div>
                            </div>

                            {/* Active + Submit */}
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active ?? true}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                        className="h-4 w-4 rounded border-input"
                                    />
                                    Active
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                                <Button type="submit" isLoading={isSaving} className="gap-2">
                                    {formMode === 'create' ? (
                                        <><Plus className="h-4 w-4" /> Create Question</>
                                    ) : (
                                        <><Pencil className="h-4 w-4" /> Save Changes</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Search & Filter Bar */}
            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
                        <div className="flex-1 relative min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search question text or topic..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={filterCourseId}
                            onChange={(e) => { setFilterCourseId(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Courses</option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>{c.code}</option>
                            ))}
                        </select>
                        <select
                            value={filterType}
                            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Types</option>
                            {QUESTION_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                        <select
                            value={filterDifficulty}
                            onChange={(e) => { setFilterDifficulty(e.target.value); setPage(1); }}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <option value="">All Difficulties</option>
                            {DIFFICULTY_LEVELS.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                        </select>
                        <Button type="submit" variant="secondary" className="gap-2">
                            <Search className="h-4 w-4" />
                            Search
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Questions Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Question</th>
                                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Course</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Type</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Difficulty</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Points</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden lg:table-cell">Used</th>
                                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                            <p className="mt-2 text-sm text-muted-foreground">Loading questions...</p>
                                        </td>
                                    </tr>
                                ) : questions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                            <p className="mt-2 text-sm text-muted-foreground">No questions found</p>
                                            <p className="text-xs text-muted-foreground">Create one to get started</p>
                                        </td>
                                    </tr>
                                ) : (
                                    questions.map((q) => (
                                        <tr key={q.id} className="border-b transition-colors hover:bg-muted/50">
                                            {/* Question Text */}
                                            <td className="px-4 py-3 max-w-xs">
                                                <div>
                                                    <p className="font-medium truncate max-w-[300px]">{q.question_text}</p>
                                                    {q.topic && (
                                                        <p className="text-xs text-muted-foreground mt-0.5">
                                                            Topic: {q.topic}
                                                        </p>
                                                    )}
                                                </div>
                                                {/* Inline preview */}
                                                {previewId === q.id && q.options && (
                                                    <div className="mt-2 space-y-1 rounded-lg bg-muted/50 p-2">
                                                        {q.options.map((opt) => (
                                                            <div key={opt.key} className="flex items-center gap-2 text-xs">
                                                                <span className="font-mono font-bold">{opt.key}.</span>
                                                                <span>{opt.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>
                                            {/* Course */}
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono">
                                                    {q.course?.code || '—'}
                                                </span>
                                            </td>
                                            {/* Type */}
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGES[q.question_type] || ''}`}>
                                                    {TYPE_LABELS[q.question_type] || q.question_type}
                                                </span>
                                            </td>
                                            {/* Difficulty */}
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                {q.difficulty_level ? (
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${DIFFICULTY_LEVELS.find(d => d.value === q.difficulty_level)?.color || ''}`}>
                                                        {q.difficulty_level}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </td>
                                            {/* Points */}
                                            <td className="px-4 py-3 text-center hidden sm:table-cell">
                                                <span className="text-sm font-medium">{q.points}</span>
                                            </td>
                                            {/* Used */}
                                            <td className="px-4 py-3 text-center hidden lg:table-cell">
                                                <span className="text-sm">{q.times_used ?? 0}×</span>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${q.is_active
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                                        }`}>
                                                        {q.is_active ? 'Active' : 'Inactive'}
                                                    </span>
                                                    {q.is_verified && (
                                                        <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 dark:text-blue-400">
                                                            <Shield className="h-3 w-3" /> Verified
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* Preview toggle (MCQ only) */}
                                                    {q.question_type === 'multiple_choice' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title={previewId === q.id ? 'Hide Options' : 'Show Options'}
                                                            onClick={() => setPreviewId(previewId === q.id ? null : q.id)}
                                                        >
                                                            {previewId === q.id
                                                                ? <EyeOff className="h-4 w-4" />
                                                                : <Eye className="h-4 w-4" />
                                                            }
                                                        </Button>
                                                    )}
                                                    {/* Verify (only if not already verified) */}
                                                    {!q.is_verified && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Verify"
                                                            onClick={() => handleVerify(q)}
                                                            disabled={actionLoadingId === q.id}
                                                        >
                                                            {actionLoadingId === q.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Shield className="h-4 w-4 text-blue-500" />
                                                            }
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Edit"
                                                        onClick={() => openEditForm(q)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Delete"
                                                        onClick={() => handleDelete(q)}
                                                        disabled={actionLoadingId === q.id}
                                                    >
                                                        {actionLoadingId === q.id
                                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                                            : <Trash2 className="h-4 w-4 text-destructive" />
                                                        }
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!isLoading && pagination.total_pages > 1 && (
                        <div className="flex items-center justify-between border-t px-4 py-3">
                            <p className="text-sm text-muted-foreground">
                                Showing <span className="font-medium">{(pagination.current_page - 1) * pagination.per_page + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</span>{' '}
                                of <span className="font-medium">{pagination.total}</span> questions
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page <= 1}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {pagination.current_page} of {pagination.total_pages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={pagination.current_page >= pagination.total_pages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
