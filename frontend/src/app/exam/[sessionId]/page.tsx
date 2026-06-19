'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import {
    getSessionStatus,
    getSessionQuestions,
    saveAnswer as saveAnswerApi,
    toggleQuestionFlag,
    submitExam,
} from '@/lib/api/sessions';
import { useExamSecurity } from '@/hooks/useExamSecurity';
import type {
    ExamSessionStatus,
    ExamSessionQuestion,
    ExamSubmitResult,
} from '@/lib/types/api';
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
    Flag,
    Save,
    AlertTriangle,
    Trophy,
    XCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Timer Hook                                                          */
/* ------------------------------------------------------------------ */

function useTimer(initialSeconds: number, onExpire: () => void) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const startedRef = useRef(false);
    const onExpireRef = useRef(onExpire);
    onExpireRef.current = onExpire;

    useEffect(() => {
        if (initialSeconds > 0) {
            setSeconds(initialSeconds);
            startedRef.current = true;
        }
    }, [initialSeconds]);

    useEffect(() => {
        // Don't fire expire until the timer has actually been initialized with a real value
        if (!startedRef.current) return;

        if (seconds <= 0) {
            onExpireRef.current();
            return;
        }
        const id = setInterval(() => {
            setSeconds(s => {
                if (s <= 1) {
                    clearInterval(id);
                    onExpireRef.current();
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [seconds]); // eslint-disable-line react-hooks/exhaustive-deps

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const formatted = hours > 0
        ? `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
        : `${mins}:${String(secs).padStart(2, '0')}`;

    const isWarning = seconds <= 300; // 5 min
    const isCritical = seconds <= 60;  // 1 min

    return { seconds, formatted, isWarning, isCritical };
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function ExamPage() {
    const params = useParams();
    const sessionId = params.sessionId as string;

    // State
    const [status, setStatus] = useState<ExamSessionStatus | null>(null);
    const [questions, setQuestions] = useState<ExamSessionQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, string | null>>({});
    const [flagged, setFlagged] = useState<Set<number>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [submitResult, setSubmitResult] = useState<ExamSubmitResult | null>(null);
    const [timeRemaining, setTimeRemaining] = useState(0);

    // Anti-cheating security
    useExamSecurity({
        sessionId,
        enabled: !submitResult && !isLoading,
    });

    // Refs for auto-save
    const saveQueueRef = useRef<Set<number>>(new Set());
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* ------------------------------------------------------------------ */
    /*  Load session + questions                                            */
    /* ------------------------------------------------------------------ */

    const loadSession = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Load session data from sessionStorage first (set by offline entry page)
            const cached = sessionStorage.getItem('exam_session');
            if (cached) {
                const data = JSON.parse(cached);
                if (data.session_uuid === sessionId) {
                    setTimeRemaining(data.time_remaining_seconds);
                }
            }

            const [statusRes, questionsRes] = await Promise.all([
                getSessionStatus(sessionId),
                getSessionQuestions(sessionId),
            ]);

            // Check if auto-submitted due to timeout
            if (statusRes.data.status === 'submitted' || statusRes.data.status === 'auto_submitted') {
                // Session was auto-submitted, show a message
                setSubmitResult(statusRes.data as unknown as ExamSubmitResult);
                setIsLoading(false);
                return;
            }

            setStatus(statusRes.data);
            setTimeRemaining(questionsRes.data.time_remaining_seconds);

            const qs = questionsRes.data.questions;
            setQuestions(qs);

            // Restore saved answers
            const restoredAnswers: Record<number, string | null> = {};
            const restoredFlags = new Set<number>();

            for (const q of qs) {
                if (q.saved_answer) {
                    const ans = q.saved_answer.answer;
                    restoredAnswers[q.question_id] = Array.isArray(ans) ? ans[0] : ans;
                    if (q.saved_answer.is_flagged) {
                        restoredFlags.add(q.question_id);
                    }
                }
            }

            setAnswers(restoredAnswers);
            setFlagged(restoredFlags);
            setCurrentIndex(statusRes.data.current_question_index || 0);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string }, status?: number } };
            const msg = e.response?.data?.message || 'Failed to load exam session.';
            setError(msg);
            // Clear stale session data
            sessionStorage.removeItem('exam_session');
        } finally {
            setIsLoading(false);
        }
    }, [sessionId]);

    useEffect(() => { loadSession(); }, [loadSession]);

    /* ------------------------------------------------------------------ */
    /*  Auto-save                                                           */
    /* ------------------------------------------------------------------ */

    const flushSaveQueue = useCallback(async () => {
        const queue = saveQueueRef.current;
        if (queue.size === 0) return;

        const questionIds = Array.from(queue);
        queue.clear();

        setSaveStatus('saving');
        try {
            for (const qId of questionIds) {
                await saveAnswerApi(sessionId, {
                    question_id: qId,
                    answer: answers[qId] ?? null,
                    is_flagged: flagged.has(qId),
                });
            }
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
            setSaveStatus('error');
            // Re-queue failed saves
            questionIds.forEach(id => queue.add(id));
        }
    }, [sessionId, answers, flagged]);

    const queueSave = useCallback((questionId: number) => {
        saveQueueRef.current.add(questionId);
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            flushSaveQueue();
        }, 3000); // Save after 3 seconds of inactivity
    }, [flushSaveQueue]);

    // Flush on unmount
    useEffect(() => {
        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, []);

    /* ------------------------------------------------------------------ */
    /*  Answer handler                                                      */
    /* ------------------------------------------------------------------ */

    const setAnswer = (questionId: number, value: string | null) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
        queueSave(questionId);
    };

    /* ------------------------------------------------------------------ */
    /*  Flag handler                                                        */
    /* ------------------------------------------------------------------ */

    const handleFlag = async (questionId: number) => {
        setFlagged(prev => {
            const next = new Set(prev);
            if (next.has(questionId)) {
                next.delete(questionId);
            } else {
                next.add(questionId);
            }
            return next;
        });

        try {
            await toggleQuestionFlag(sessionId, { question_id: questionId });
        } catch {
            // Revert on error
            setFlagged(prev => {
                const next = new Set(prev);
                if (next.has(questionId)) {
                    next.delete(questionId);
                } else {
                    next.add(questionId);
                }
                return next;
            });
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Submit                                                              */
    /* ------------------------------------------------------------------ */

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setShowConfirm(false);
        setError('');

        // Flush pending saves first
        await flushSaveQueue();

        try {
            const res = await submitExam(sessionId);
            setSubmitResult(res.data);
            // Clear session data
            sessionStorage.removeItem('exam_session');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to submit exam.');
            setIsSubmitting(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Timer expiry                                                        */
    /* ------------------------------------------------------------------ */

    const handleTimeExpire = useCallback(() => {
        if (!submitResult && !isSubmitting) {
            handleSubmit();
        }
    }, [submitResult, isSubmitting]); // eslint-disable-line react-hooks/exhaustive-deps

    const timer = useTimer(timeRemaining, handleTimeExpire);

    /* ------------------------------------------------------------------ */
    /*  Browser unload warning                                              */
    /* ------------------------------------------------------------------ */

    useEffect(() => {
        if (submitResult) return;

        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [submitResult]);

    /* ------------------------------------------------------------------ */
    /*  Loading state                                                       */
    /* ------------------------------------------------------------------ */

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center space-y-3">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Loading exam...</p>
                </div>
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Submit result view                                                  */
    /* ------------------------------------------------------------------ */

    if (submitResult) {
        return <SubmitResultView result={submitResult} />;
    }

    /* ------------------------------------------------------------------ */
    /*  Error state                                                         */
    /* ------------------------------------------------------------------ */

    if (error && questions.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="py-8 text-center space-y-4">
                        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
                        <p className="text-sm font-medium text-destructive">{error}</p>
                        <Button variant="outline" onClick={() => window.location.href = '/exams'}>
                            Back to Entry
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!status || questions.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="py-8 text-center space-y-4">
                        <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">No exam data available.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Exam interface                                                      */
    /* ------------------------------------------------------------------ */

    const currentQuestion = questions[currentIndex];
    const totalQuestions = questions.length;
    const answeredCount = Object.values(answers).filter(a => a !== null && a !== undefined && a !== '').length;
    const progress = Math.round((answeredCount / totalQuestions) * 100);
    const isLastQuestion = currentIndex === totalQuestions - 1;
    const isFirstQuestion = currentIndex === 0;
    const allowBacktrack = status.exam.allow_backtrack;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Top bar */}
            <div className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="text-sm font-semibold truncate">{status.exam.title}</h1>
                        {status.exam.course_code && (
                            <p className="text-xs text-muted-foreground font-mono">{status.exam.course_code}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* Save indicator */}
                        <div className="text-xs text-muted-foreground">
                            {saveStatus === 'saving' && (
                                <span className="flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                                </span>
                            )}
                            {saveStatus === 'saved' && (
                                <span className="flex items-center gap-1 text-emerald-600">
                                    <Save className="h-3 w-3" /> Saved
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span className="flex items-center gap-1 text-destructive">
                                    <AlertCircle className="h-3 w-3" /> Save failed
                                </span>
                            )}
                        </div>

                        {/* Timer */}
                        <div className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-mono font-bold ${
                            timer.isCritical
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 animate-pulse'
                                : timer.isWarning
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400'
                                    : 'bg-muted text-foreground'
                        }`}>
                            <Clock className="h-4 w-4" />
                            {timer.formatted}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-4">
                {/* Error banner */}
                {error && (
                    <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* Question info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Question {currentIndex + 1} of {totalQuestions}</span>
                    <span>{answeredCount} / {totalQuestions} answered</span>
                </div>

                {/* Question Card */}
                {currentQuestion && (
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                                <CardTitle className="text-base font-semibold leading-relaxed flex-1">
                                    <span className="text-muted-foreground font-mono text-sm mr-2">{currentIndex + 1}.</span>
                                    {currentQuestion.question_text}
                                </CardTitle>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                                        {currentQuestion.question_type.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{currentQuestion.points} pt{currentQuestion.points !== 1 ? 's' : ''}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <QuestionInput
                                question={currentQuestion}
                                answer={answers[currentQuestion.question_id] ?? null}
                                onChange={(val) => setAnswer(currentQuestion.question_id, val)}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Flag button */}
                {currentQuestion && (
                    <div className="flex justify-center">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleFlag(currentQuestion.question_id)}
                            className={`gap-2 ${flagged.has(currentQuestion.question_id) ? 'text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700' : 'text-muted-foreground'}`}
                        >
                            <Flag className="h-3.5 w-3.5" />
                            {flagged.has(currentQuestion.question_id) ? 'Flagged' : 'Flag for review'}
                        </Button>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                        disabled={isFirstQuestion || (!allowBacktrack && !isFirstQuestion)}
                        className="gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>

                    {/* Question dots */}
                    <div className="flex items-center gap-1 flex-wrap justify-center max-w-sm">
                        {questions.map((q, idx) => {
                            const answered = answers[q.question_id] !== undefined && answers[q.question_id] !== null && answers[q.question_id] !== '';
                            const isFlagged = flagged.has(q.question_id);
                            const isCurrent = idx === currentIndex;
                            const canNavigate = allowBacktrack || idx >= currentIndex;

                            return (
                                <button
                                    key={q.question_id}
                                    onClick={() => canNavigate && setCurrentIndex(idx)}
                                    disabled={!canNavigate}
                                    className={`h-7 w-7 rounded text-xs font-medium transition-colors relative ${
                                        isCurrent
                                            ? 'bg-primary text-primary-foreground'
                                            : answered
                                                ? 'bg-primary/15 text-primary dark:bg-primary/25'
                                                : canNavigate
                                                    ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                    : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                                    }`}
                                    title={`Question ${idx + 1}${isFlagged ? ' (flagged)' : ''}`}
                                >
                                    {idx + 1}
                                    {isFlagged && (
                                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {isLastQuestion ? (
                        <Button
                            onClick={() => setShowConfirm(true)}
                            className="gap-2"
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
            </div>

            {/* Confirm Dialog */}
            {showConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <Card className="w-full max-w-md shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                Submit Exam?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                You have answered <strong>{answeredCount}</strong> of <strong>{totalQuestions}</strong> questions.
                                {answeredCount < totalQuestions && (
                                    <span className="text-amber-600 dark:text-amber-400"> {totalQuestions - answeredCount} question(s) unanswered.</span>
                                )}
                            </p>
                            {flagged.size > 0 && (
                                <p className="text-sm text-amber-600 dark:text-amber-400">
                                    You have {flagged.size} flagged question(s) for review.
                                </p>
                            )}
                            <p className="text-sm font-medium text-destructive">
                                This action cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSubmitting}>
                                    Continue Exam
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="gap-2"
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
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
    question,
    answer,
    onChange,
}: {
    question: ExamSessionQuestion;
    answer: string | null;
    onChange: (val: string | null) => void;
}) {
    if (question.question_type === 'multiple_choice') {
        return (
            <div className="space-y-2">
                {(question.options || []).map(opt => (
                    <label
                        key={opt.key}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                            answer === opt.key
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-input hover:bg-muted/50'
                        }`}
                    >
                        <input
                            type="radio"
                            name={`q_${question.question_id}`}
                            value={opt.key}
                            checked={answer === opt.key}
                            onChange={() => onChange(opt.key)}
                            className="h-4 w-4 text-primary border-input"
                        />
                        <span className="font-mono font-bold text-sm text-muted-foreground w-5 shrink-0">{opt.key}.</span>
                        <span className="text-sm">{opt.value}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (question.question_type === 'true_false') {
        return (
            <div className="flex gap-3">
                {(['true', 'false'] as const).map(val => (
                    <label
                        key={val}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                            answer === val
                                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                                : 'border-input hover:bg-muted/50'
                        }`}
                    >
                        <input
                            type="radio"
                            name={`q_${question.question_id}`}
                            value={val}
                            checked={answer === val}
                            onChange={() => onChange(val)}
                            className="h-4 w-4 text-primary"
                        />
                        <span className="text-sm font-medium capitalize">{val}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (question.question_type === 'fill_in_blank') {
        return (
            <input
                type="text"
                value={answer || ''}
                onChange={(e) => onChange(e.target.value || null)}
                placeholder="Type your answer here..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
        );
    }

    if (question.question_type === 'essay') {
        return (
            <textarea
                value={answer || ''}
                onChange={(e) => onChange(e.target.value || null)}
                placeholder="Write your answer here..."
                rows={8}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
        );
    }

    return <p className="text-sm text-muted-foreground">Unsupported question type.</p>;
}

/* ------------------------------------------------------------------ */
/*  Submit Result View                                                  */
/* ------------------------------------------------------------------ */

function SubmitResultView({ result }: { result: ExamSubmitResult }) {
    const isAutoSubmit = result.status === 'auto_submitted';

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-2xl space-y-6">
                {/* Status header */}
                <div className="text-center space-y-3">
                    {result.passed ? (
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 mx-auto">
                            <Trophy className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                    ) : (
                        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 mx-auto">
                            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                    )}
                    <h1 className="text-2xl font-bold">
                        {isAutoSubmit ? 'Exam Auto-Submitted' : 'Exam Submitted'}
                    </h1>
                    {isAutoSubmit && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            Your exam was automatically submitted because time expired.
                        </p>
                    )}
                </div>

                {/* Score card */}
                {result.show_results && (
                    <Card>
                        <CardContent className="py-6">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                                <div>
                                    <p className="text-2xl font-bold">{result.total_score}/{result.total_marks}</p>
                                    <p className="text-xs text-muted-foreground">Score</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{result.percentage}%</p>
                                    <p className="text-xs text-muted-foreground">Percentage</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{result.correct_count}/{result.total_questions}</p>
                                    <p className="text-xs text-muted-foreground">Correct</p>
                                </div>
                                <div>
                                    <p className={`text-2xl font-bold ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {result.passed ? 'PASS' : 'FAIL'}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Status</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {!result.show_results && (
                    <Card>
                        <CardContent className="py-8 text-center">
                            <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                Your exam has been submitted successfully. Results will be available later.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Per-question results */}
                {result.show_results && result.show_answers && result.results.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-lg font-semibold">Question Breakdown</h2>
                        {result.results.map((r, idx) => (
                            <Card key={r.question_id} className={`border-l-4 ${
                                r.is_correct === null
                                    ? 'border-l-amber-400'
                                    : r.is_correct
                                        ? 'border-l-emerald-500'
                                        : 'border-l-red-500'
                            }`}>
                                <CardContent className="py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium">
                                                <span className="text-muted-foreground font-mono mr-1">{idx + 1}.</span>
                                                {r.question_text}
                                            </p>
                                            <div className="mt-1 space-y-0.5 text-xs">
                                                <p className="text-muted-foreground">
                                                    Your answer: <span className="font-medium text-foreground">{r.your_answer || '(no answer)'}</span>
                                                </p>
                                                {!r.is_correct && r.correct_answer && (
                                                    <p className="text-emerald-600 dark:text-emerald-400">
                                                        Correct: <span className="font-medium">{r.correct_answer}</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-xs font-bold shrink-0 ${
                                            r.is_correct === null
                                                ? 'text-amber-600'
                                                : r.is_correct
                                                    ? 'text-emerald-600'
                                                    : 'text-red-600'
                                        }`}>
                                            {r.points_awarded}/{r.points_possible}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Action */}
                <div className="flex justify-center">
                    <Button
                        onClick={() => {
                            // Clear exam auth and redirect to entry
                            sessionStorage.removeItem('offline_exam_token');
                            sessionStorage.removeItem('exam_session');
                            document.cookie = 'auth_user_role=; path=/; max-age=0';
                            window.location.href = '/exams';
                        }}
                        variant="outline"
                    >
                        Done
                    </Button>
                </div>
            </div>
        </div>
    );
}
