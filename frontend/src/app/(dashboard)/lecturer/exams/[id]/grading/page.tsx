'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getManualGrading, gradeAnswer } from '@/lib/api/exams';
import type { ManualGradingResponse, GradingSession, UngradedAnswer } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Save,
    FileText,
    PenLine,
    User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Badge helpers                                                       */
/* ------------------------------------------------------------------ */

const Q_TYPE_BADGES: Record<string, string> = {
    fill_in_blank: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
    essay: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
};

const Q_TYPE_LABELS: Record<string, string> = {
    fill_in_blank: 'Fill-in-the-blank',
    essay: 'Essay',
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function ManualGradingPage() {
    const params = useParams();
    const examId = Number(params.id);

    const [data, setData] = useState<ManualGradingResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    // Track expanded sessions
    const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

    // Per-answer grading state: { answerId: { points, feedback, saving, saved, error } }
    const [gradingState, setGradingState] = useState<Record<number, {
        points: string;
        feedback: string;
        saving: boolean;
        saved: boolean;
        error: string;
    }>>({});

    /* ------------------------------------------------------------------ */
    /*  Fetch data                                                          */
    /* ------------------------------------------------------------------ */

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await getManualGrading(examId);
            setData(res.data);
            // Auto-expand first session
            if (res.data.sessions.length > 0) {
                setExpandedSessions(new Set([res.data.sessions[0].session_id]));
            }
            // Initialize grading state for all ungraded answers
            const state: typeof gradingState = {};
            for (const session of res.data.sessions) {
                for (const answer of session.ungraded_answers) {
                    state[answer.id] = {
                        points: '',
                        feedback: '',
                        saving: false,
                        saved: false,
                        error: '',
                    };
                }
            }
            setGradingState(state);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to load grading data.');
        } finally {
            setIsLoading(false);
        }
    }, [examId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ------------------------------------------------------------------ */
    /*  Toggle session expansion                                            */
    /* ------------------------------------------------------------------ */

    const toggleSession = (sessionId: number) => {
        setExpandedSessions(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
            } else {
                next.add(sessionId);
            }
            return next;
        });
    };

    /* ------------------------------------------------------------------ */
    /*  Grade an answer                                                     */
    /* ------------------------------------------------------------------ */

    const handleGradeAnswer = async (answerId: number, maxPoints: number) => {
        const state = gradingState[answerId];
        if (!state) return;

        const points = parseFloat(state.points);
        if (isNaN(points) || points < 0 || points > maxPoints) {
            setGradingState(prev => ({
                ...prev,
                [answerId]: { ...prev[answerId], error: `Points must be between 0 and ${maxPoints}` },
            }));
            return;
        }

        setGradingState(prev => ({
            ...prev,
            [answerId]: { ...prev[answerId], saving: true, error: '', saved: false },
        }));

        try {
            const res = await gradeAnswer(answerId, {
                points_awarded: points,
                feedback: state.feedback || undefined,
            });

            setGradingState(prev => ({
                ...prev,
                [answerId]: { ...prev[answerId], saving: false, saved: true },
            }));

            // Update the session score in local data
            if (data && res.data) {
                setData(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev };
                    updated.sessions = updated.sessions.map(s => {
                        // Find the session that contains this answer
                        const hasAnswer = s.ungraded_answers.some(a => a.id === answerId);
                        if (!hasAnswer) return s;

                        return {
                            ...s,
                            total_score: res.data.session_score.total_score,
                            percentage: res.data.session_score.percentage,
                            // Remove the graded answer from ungraded list
                            ungraded_answers: s.ungraded_answers.filter(a => a.id !== answerId),
                            total_ungraded: s.total_ungraded - 1,
                        };
                    }).filter(s => s.total_ungraded > 0); // Remove fully graded sessions
                    updated.sessions_needing_grading = updated.sessions.length;
                    return updated;
                });
            }

            // Clear saved indicator after 3s
            setTimeout(() => {
                setGradingState(prev => ({
                    ...prev,
                    [answerId]: prev[answerId] ? { ...prev[answerId], saved: false } : prev[answerId],
                }));
            }, 3000);
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setGradingState(prev => ({
                ...prev,
                [answerId]: { ...prev[answerId], saving: false, error: e.response?.data?.message || 'Failed to save grade.' },
            }));
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Loading / Error states                                              */
    /* ------------------------------------------------------------------ */

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-4">
                <Link href={`/lecturer/exams/${examId}?tab=results`}>
                    <Button variant="outline" className="gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Back to Exam
                    </Button>
                </Link>
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error || 'Failed to load grading data.'}</p>
                </div>
            </div>
        );
    }

    const totalUngraded = data.sessions.reduce((acc, s) => acc + s.total_ungraded, 0);
    const allGraded = data.sessions.length === 0;

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Link href={`/lecturer/exams/${examId}?tab=results`}>
                    <Button variant="ghost" size="icon">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manual Grading</h1>
                    <p className="text-sm text-muted-foreground">
                        {data.exam_title} &bull; {data.course_code}
                    </p>
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total Submissions" value={data.total_sessions} color="blue" />
                <StatCard label="Need Grading" value={data.sessions_needing_grading} color="amber" />
                <StatCard label="Ungraded Answers" value={totalUngraded} color="red" />
                <StatCard label="Fully Graded" value={data.total_sessions - data.sessions_needing_grading} color="emerald" />
            </div>

            {/* All graded state */}
            {allGraded && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                        <h3 className="mt-4 text-lg font-semibold">All Answers Graded</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            All fill-in-the-blank and essay answers have been graded for this exam.
                        </p>
                        <Link href={`/lecturer/exams/${examId}?tab=results`}>
                            <Button className="mt-4 gap-2">
                                <ChevronLeft className="h-4 w-4" />
                                Back to Results
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Sessions needing grading */}
            {data.sessions.map((session) => (
                <SessionGradingCard
                    key={session.session_id}
                    session={session}
                    isExpanded={expandedSessions.has(session.session_id)}
                    onToggle={() => toggleSession(session.session_id)}
                    gradingState={gradingState}
                    onUpdateState={(answerId, field, value) => {
                        setGradingState(prev => ({
                            ...prev,
                            [answerId]: { ...prev[answerId], [field]: value, error: '' },
                        }));
                    }}
                    onGrade={handleGradeAnswer}
                />
            ))}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Session Grading Card                                                */
/* ------------------------------------------------------------------ */

function SessionGradingCard({
    session,
    isExpanded,
    onToggle,
    gradingState,
    onUpdateState,
    onGrade,
}: {
    session: GradingSession;
    isExpanded: boolean;
    onToggle: () => void;
    gradingState: Record<number, { points: string; feedback: string; saving: boolean; saved: boolean; error: string }>;
    onUpdateState: (answerId: number, field: string, value: string) => void;
    onGrade: (answerId: number, maxPoints: number) => void;
}) {
    return (
        <Card>
            <CardHeader
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-base">{session.student_name}</CardTitle>
                            <CardDescription>
                                {session.student_matric && <span className="font-mono">{session.student_matric}</span>}
                                {session.student_matric && ' \u2022 '}
                                Score: {session.total_score.toFixed(1)} ({session.percentage.toFixed(1)}%)
                                {' \u2022 '}
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    {session.total_ungraded} answer{session.total_ungraded !== 1 ? 's' : ''} to grade
                                </span>
                            </CardDescription>
                        </div>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                </div>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                    {session.ungraded_answers.map((answer, idx) => (
                        <AnswerGradingRow
                            key={answer.id}
                            answer={answer}
                            index={idx + 1}
                            state={gradingState[answer.id]}
                            onUpdateState={(field, value) => onUpdateState(answer.id, field, value)}
                            onGrade={() => onGrade(answer.id, answer.max_points)}
                        />
                    ))}
                </CardContent>
            )}
        </Card>
    );
}

/* ------------------------------------------------------------------ */
/*  Answer Grading Row                                                  */
/* ------------------------------------------------------------------ */

function AnswerGradingRow({
    answer,
    index,
    state,
    onUpdateState,
    onGrade,
}: {
    answer: UngradedAnswer;
    index: number;
    state?: { points: string; feedback: string; saving: boolean; saved: boolean; error: string };
    onUpdateState: (field: string, value: string) => void;
    onGrade: () => void;
}) {
    if (!state) return null;

    return (
        <div className="rounded-lg border p-4 space-y-3">
            {/* Question header */}
            <div className="flex items-start gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold font-mono">
                    {index}
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${Q_TYPE_BADGES[answer.question_type] || ''}`}>
                            {Q_TYPE_LABELS[answer.question_type]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            Max: {answer.max_points} pt{answer.max_points !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <p className="text-sm font-medium">{answer.question_text}</p>
                </div>
            </div>

            {/* Student's answer */}
            <div className="ml-8">
                <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Student&apos;s Answer</span>
                </div>
                <div className="rounded-md bg-muted/50 border p-3">
                    <p className="text-sm whitespace-pre-wrap">
                        {answer.answer_text || <span className="text-muted-foreground italic">No answer provided</span>}
                    </p>
                </div>
            </div>

            {/* Grading input */}
            <div className="ml-8 flex items-end gap-3 flex-wrap">
                <div className="space-y-1.5">
                    <Label htmlFor={`pts_${answer.id}`} className="text-xs">Points (0 - {answer.max_points})</Label>
                    <Input
                        id={`pts_${answer.id}`}
                        type="number"
                        min={0}
                        max={answer.max_points}
                        step={0.5}
                        value={state.points}
                        onChange={(e) => onUpdateState('points', e.target.value)}
                        placeholder="0"
                        className="w-24 h-9"
                    />
                </div>
                <div className="flex-1 min-w-[200px] space-y-1.5">
                    <Label htmlFor={`fb_${answer.id}`} className="text-xs">Feedback (optional)</Label>
                    <Input
                        id={`fb_${answer.id}`}
                        value={state.feedback}
                        onChange={(e) => onUpdateState('feedback', e.target.value)}
                        placeholder="Optional feedback for the student..."
                        className="h-9"
                    />
                </div>
                <Button
                    size="sm"
                    onClick={onGrade}
                    disabled={state.saving || !state.points}
                    className="gap-1.5 h-9"
                >
                    {state.saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : state.saved ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                        <PenLine className="h-3.5 w-3.5" />
                    )}
                    {state.saved ? 'Saved' : 'Grade'}
                </Button>
            </div>

            {/* Error / Success messages */}
            {state.error && (
                <div className="ml-8 flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {state.error}
                </div>
            )}
            {state.saved && (
                <div className="ml-8 flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Grade saved successfully
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
        emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400',
        amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
        red: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
    };
    return (
        <Card>
            <CardContent className="pt-6">
                <div className={`rounded-lg p-2 w-fit mb-2 ${colorMap[color] || colorMap.blue}`}>
                    <PenLine className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
        </Card>
    );
}
