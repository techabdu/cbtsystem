'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPracticeExam, submitPracticeExam } from '@/lib/api/exams';
import type { Exam, ExamQuestion } from '@/lib/types/models';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Loader2,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Clock,
    Send,
} from 'lucide-react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function PracticeExamPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;

    const [exam, setExam] = useState<Exam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Answer state — ephemeral, not in Zustand
    const [answers, setAnswers] = useState<Record<number, string | null>>({});
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    /* ------------------------------------------------------------------ */
    /*  Fetch exam                                                          */
    /* ------------------------------------------------------------------ */

    const fetchExam = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await getPracticeExam(examId);
            setExam(res.data);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to load practice exam.');
        } finally {
            setIsLoading(false);
        }
    }, [examId]);

    useEffect(() => { fetchExam(); }, [fetchExam]);

    /* ------------------------------------------------------------------ */
    /*  Answer handlers                                                     */
    /* ------------------------------------------------------------------ */

    const setAnswer = (questionId: number, value: string | null) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    /* ------------------------------------------------------------------ */
    /*  Submit                                                              */
    /* ------------------------------------------------------------------ */

    const handleSubmit = async () => {
        if (!exam?.questions) return;
        setIsSubmitting(true);
        setShowConfirm(false);
        try {
            const answerPayload = exam.questions.map(eq => ({
                question_id: eq.question_id,
                answer: answers[eq.question_id] ?? null,
            }));
            const res = await submitPracticeExam(examId, { answers: answerPayload });
            // Store results in sessionStorage for the results page
            sessionStorage.setItem(`practice_result_${examId}`, JSON.stringify(res.data));
            router.push(`/student/practice/${examId}/results`);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to submit exam. Please try again.');
            setIsSubmitting(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Loading / Error                                                     */
    /* ------------------------------------------------------------------ */

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !exam) {
        return (
            <div className="space-y-4 max-w-2xl mx-auto">
                <Link href="/student/practice">
                    <Button variant="outline" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Practice
                    </Button>
                </Link>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error || 'Exam not found.'}</p>
                </div>
            </div>
        );
    }

    const questions = exam.questions || [];
    const totalQuestions = questions.length;

    if (totalQuestions === 0) {
        return (
            <div className="space-y-4 max-w-2xl mx-auto">
                <Link href="/student/practice">
                    <Button variant="outline" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Practice
                    </Button>
                </Link>
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-sm text-muted-foreground">This practice exam has no questions yet.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentExamQuestion = questions[currentIndex] as ExamQuestion;
    const currentQuestion = currentExamQuestion?.question;
    const answeredCount = Object.values(answers).filter(a => a !== null && a !== '').length;
    const progress = Math.round((answeredCount / totalQuestions) * 100);
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const isFirstQuestion = currentIndex === 0;

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-4 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">{exam.title}</h1>
                    {exam.course && (
                        <p className="text-sm text-muted-foreground font-mono mt-0.5">{exam.course.code} — {exam.course.title}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                    <Clock className="h-4 w-4" />
                    <span>{exam.duration_minutes}m</span>
                </div>
            </div>

            {/* Instructions */}
            {exam.instructions && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                    <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">{exam.instructions}</p>
                </div>
            )}

            {/* Progress bar */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Question {currentIndex + 1} of {totalQuestions}</span>
                    <span>{answeredCount} / {totalQuestions} answered</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-teal-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Question Card */}
            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                        <CardTitle className="text-base font-semibold leading-relaxed flex-1">
                            <span className="text-muted-foreground font-mono text-sm mr-2">{currentIndex + 1}.</span>
                            {currentQuestion?.question_text || `Question ${currentExamQuestion?.question_id}`}
                        </CardTitle>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                            {currentQuestion?.question_type && (
                                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                                    {currentQuestion.question_type.replace(/_/g, ' ')}
                                </span>
                            )}
                            <span className="text-xs text-muted-foreground">{currentExamQuestion?.points} pt{currentExamQuestion?.points !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <QuestionInput
                        examQuestion={currentExamQuestion}
                        answer={answers[currentExamQuestion?.question_id] ?? null}
                        onChange={(val) => setAnswer(currentExamQuestion.question_id, val)}
                    />
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
                <Button
                    variant="outline"
                    onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    disabled={isFirstQuestion}
                    className="gap-2"
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>

                {/* Question dots */}
                <div className="flex items-center gap-1 flex-wrap justify-center max-w-sm">
                    {questions.map((eq, idx) => {
                        const answered = answers[eq.question_id] !== undefined && answers[eq.question_id] !== null && answers[eq.question_id] !== '';
                        return (
                            <button
                                key={eq.id}
                                onClick={() => setCurrentIndex(idx)}
                                className={`h-6 w-6 rounded text-xs font-medium transition-colors ${idx === currentIndex
                                    ? 'bg-teal-600 text-white'
                                    : answered
                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                                title={`Question ${idx + 1}`}
                            >
                                {idx + 1}
                            </button>
                        );
                    })}
                </div>

                {isLastQuestion ? (
                    <Button
                        onClick={() => setShowConfirm(true)}
                        className="gap-2 bg-teal-600 hover:bg-teal-700"
                        disabled={isSubmitting}
                    >
                        <Send className="h-4 w-4" />
                        Submit
                    </Button>
                ) : (
                    <Button
                        onClick={() => setCurrentIndex(i => Math.min(totalQuestions - 1, i + 1))}
                        className="gap-2"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Submit from any point */}
            {!isLastQuestion && (
                <div className="flex justify-center">
                    <Button
                        variant="outline"
                        onClick={() => setShowConfirm(true)}
                        disabled={isSubmitting}
                        size="sm"
                        className="gap-2 text-muted-foreground"
                    >
                        <Send className="h-4 w-4" />
                        Submit Now ({answeredCount}/{totalQuestions} answered)
                    </Button>
                </div>
            )}

            {/* Confirm Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle>Submit Practice Exam?</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
                                {answeredCount < totalQuestions && (
                                    <span className="text-amber-600 dark:text-amber-400"> {totalQuestions - answeredCount} question(s) unanswered.</span>
                                )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Your results will be shown immediately after submission.
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                                    Continue Exam
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    isLoading={isSubmitting}
                                    className="gap-2 bg-teal-600 hover:bg-teal-700"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Confirm Submit
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Question Input Component                                            */
/* ------------------------------------------------------------------ */

function QuestionInput({
    examQuestion,
    answer,
    onChange,
}: {
    examQuestion: ExamQuestion;
    answer: string | null;
    onChange: (val: string | null) => void;
}) {
    const question = examQuestion?.question;
    if (!question) {
        return <p className="text-sm text-muted-foreground">Question data unavailable.</p>;
    }

    /* Multiple Choice */
    if (question.question_type === 'multiple_choice') {
        return (
            <div className="space-y-2">
                {(question.options || []).map(opt => (
                    <label
                        key={opt.key}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${answer === opt.key
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                            : 'border-input hover:bg-muted/50'
                            }`}
                    >
                        <input
                            type="radio"
                            name={`q_${examQuestion.question_id}`}
                            value={opt.key}
                            checked={answer === opt.key}
                            onChange={() => onChange(opt.key)}
                            className="h-4 w-4 text-teal-600 border-input"
                        />
                        <span className="font-mono font-bold text-sm text-muted-foreground w-5 shrink-0">{opt.key}.</span>
                        <span className="text-sm">{opt.value}</span>
                    </label>
                ))}
            </div>
        );
    }

    /* True/False */
    if (question.question_type === 'true_false') {
        return (
            <div className="flex gap-3">
                {(['true', 'false'] as const).map(val => (
                    <label
                        key={val}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${answer === val
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30'
                            : 'border-input hover:bg-muted/50'
                            }`}
                    >
                        <input
                            type="radio"
                            name={`q_${examQuestion.question_id}`}
                            value={val}
                            checked={answer === val}
                            onChange={() => onChange(val)}
                            className="h-4 w-4 text-teal-600"
                        />
                        <span className="text-sm font-medium capitalize">{val}</span>
                    </label>
                ))}
            </div>
        );
    }

    /* Fill in Blank */
    if (question.question_type === 'fill_in_blank') {
        return (
            <div className="space-y-2">
                <input
                    type="text"
                    value={answer || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    placeholder="Type your answer here..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>
        );
    }

    /* Essay */
    if (question.question_type === 'essay') {
        return (
            <div className="space-y-2">
                <textarea
                    value={answer || ''}
                    onChange={(e) => onChange(e.target.value || null)}
                    placeholder="Write your essay answer here..."
                    rows={6}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
            </div>
        );
    }

    return <p className="text-sm text-muted-foreground">Unsupported question type.</p>;
}
