'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getHodAssignments,
    getHodLecturers,
    getHodCourses,
    hodAssignCourse,
    hodUnassignCourse,
} from '@/lib/api/hod';
import type { HodAssignment } from '@/lib/types/api';
import type { User, Course } from '@/lib/types/models';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    BookOpen, Users, ClipboardList, Plus, Trash2, AlertCircle,
    CheckCircle2, Loader2, Search, X, UserCheck, GraduationCap, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function HodCourseAssignmentsPage() {
    const [assignments, setAssignments] = useState<HodAssignment[]>([]);
    const [lecturers, setLecturers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Assign form state
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [selectedLecturer, setSelectedLecturer] = useState<string>('');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [assignRole, setAssignRole] = useState<'lecturer' | 'coordinator' | 'assistant'>('lecturer');

    // Search/filter
    const [searchTerm, setSearchTerm] = useState('');



    // Expanded course rows
    const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());

    /* ------------------------------------------------------------------ */
    /*  Data Fetching                                                      */
    /* ------------------------------------------------------------------ */

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [assignRes, lecRes, courseRes] = await Promise.all([
                getHodAssignments(),
                getHodLecturers(),
                getHodCourses(),
            ]);
            setAssignments(assignRes.data.courses);
            setLecturers(lecRes.data.lecturers);
            setCourses(courseRes.data.courses);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to load data. Make sure you are a Head of Department.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    /* ------------------------------------------------------------------ */
    /*  Stats                                                              */
    /* ------------------------------------------------------------------ */

    const totalCourses = assignments.length;
    const totalAssignments = assignments.reduce((sum, c) => sum + c.lecturers.length, 0);
    const unassignedCourses = assignments.filter(c => c.lecturers.length === 0).length;
    const activeLecturers = new Set(assignments.flatMap(c => c.lecturers.map(l => l.id))).size;

    /* ------------------------------------------------------------------ */
    /*  Handlers                                                           */
    /* ------------------------------------------------------------------ */

    const handleAssign = async () => {
        if (!selectedLecturer || !selectedCourse) return;
        setActionLoading('assign');
        setError('');
        setSuccess('');
        try {
            await hodAssignCourse({
                lecturer_id: selectedLecturer,
                course_id: selectedCourse,
                role: assignRole,
            });
            setSuccess('Lecturer assigned to course successfully.');
            setShowAssignForm(false);
            setSelectedLecturer('');
            setSelectedCourse('');
            setAssignRole('lecturer');
            await fetchData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to assign lecturer.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUnassign = async (lecturerId: string, courseId: string, lecturerName: string, courseCode: string) => {
        if (!confirm(`Unassign ${lecturerName} from ${courseCode}?`)) return;
        setActionLoading(`unassign-${lecturerId}-${courseId}`);
        setError('');
        setSuccess('');
        try {
            await hodUnassignCourse(lecturerId, courseId);
            setSuccess(`${lecturerName} unassigned from ${courseCode}.`);
            await fetchData();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to unassign lecturer.');
        } finally {
            setActionLoading(null);
        }
    };

    const toggleExpanded = (courseId: number) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) next.delete(courseId);
            else next.add(courseId);
            return next;
        });
    };

    /* ------------------------------------------------------------------ */
    /*  Filtered courses                                                   */
    /* ------------------------------------------------------------------ */

    const filteredAssignments = assignments.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            c.code.toLowerCase().includes(term) ||
            c.title.toLowerCase().includes(term) ||
            c.lecturers.some(l => l.full_name.toLowerCase().includes(term))
        );
    });

    /* ------------------------------------------------------------------ */
    /*  Loading State                                                      */
    /* ------------------------------------------------------------------ */

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Render                                                             */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Course Assignments</h1>
                    <p className="text-muted-foreground">
                        Assign lecturers to courses in your department.
                    </p>
                </div>
                <Button className="gap-2" onClick={() => setShowAssignForm(true)}>
                    <Plus className="h-4 w-4" /> Assign Lecturer
                </Button>
            </div>

            {/* Messages */}
            {success && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{success}</p>
                    <button onClick={() => setSuccess('')} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}
            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                    <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/40">
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalCourses}</p>
                                <p className="text-xs text-muted-foreground">Dept. Courses</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/40">
                                <ClipboardList className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalAssignments}</p>
                                <p className="text-xs text-muted-foreground">Assignments</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/40">
                                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeLecturers}</p>
                                <p className="text-xs text-muted-foreground">Active Lecturers</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-lg p-2.5 ${unassignedCourses > 0 ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-green-100 dark:bg-green-900/40'}`}>
                                <AlertCircle className={`h-5 w-5 ${unassignedCourses > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{unassignedCourses}</p>
                                <p className="text-xs text-muted-foreground">Unassigned</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Assign Form */}
            {showAssignForm && (
                <Card className="border-primary/30">
                    <CardHeader>
                        <CardTitle className="text-lg">Assign Lecturer to Course</CardTitle>
                        <CardDescription>Select a lecturer and a course from your department.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Lecturer *</label>
                                <select
                                    value={selectedLecturer}
                                    onChange={(e) => setSelectedLecturer(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">Select lecturer...</option>
                                    {lecturers.map((l) => (
                                        <option key={l.id} value={l.uuid}>
                                            {l.full_name} {l.staff_id ? `(${l.staff_id})` : ''} {l.is_hod ? '[HOD]' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Course *</label>
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="">Select course...</option>
                                    {courses.map((c) => (
                                        <option key={c.id} value={c.uuid}>
                                            {c.code} — {c.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Assignment Role</label>
                                <select
                                    value={assignRole}
                                    onChange={(e) => setAssignRole(e.target.value as typeof assignRole)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <option value="lecturer">Lecturer</option>
                                    <option value="coordinator">Coordinator</option>
                                    <option value="assistant">Assistant</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => { setShowAssignForm(false); setSelectedLecturer(''); setSelectedCourse(''); }}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAssign}
                                disabled={!selectedLecturer || !selectedCourse}
                                isLoading={actionLoading === 'assign'}
                                className="gap-2"
                            >
                                <UserCheck className="h-4 w-4" /> Assign
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search courses or lecturers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </div>

            {/* Assignments Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5" />
                        Course – Lecturer Assignments
                    </CardTitle>
                    <CardDescription>
                        Click on a course to see or manage its assigned lecturers.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredAssignments.length === 0 ? (
                        <div className="py-12 text-center text-muted-foreground">
                            <BookOpen className="mx-auto h-10 w-10 opacity-30" />
                            <p className="mt-2 text-sm">No courses found.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredAssignments.map((course) => (
                                <div key={course.id} className="rounded-lg border overflow-hidden">
                                    {/* Course Row (clickable) */}
                                    <button
                                        onClick={() => toggleExpanded(course.id)}
                                        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-mono font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                                {course.code}
                                            </span>
                                            <div>
                                                <p className="font-medium text-sm">{course.title}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {course.credit_hours ? `${course.credit_hours} credits` : ''}
                                                    {course.semester ? ` · ${course.semester}` : ''}
                                                    {` · ${course.students_count} students`}
                                                    {` · ${course.questions_count} questions`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${course.lecturers.length > 0
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                }`}>
                                                <Users className="h-3 w-3" />
                                                {course.lecturers.length} lecturer{course.lecturers.length !== 1 ? 's' : ''}
                                            </span>
                                            {expandedCourses.has(course.id) ? (
                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Expanded — Lecturer details */}
                                    {expandedCourses.has(course.id) && (
                                        <div className="border-t bg-muted/20 p-4">
                                            {course.lecturers.length === 0 ? (
                                                <p className="text-sm text-muted-foreground text-center py-3">
                                                    No lecturers assigned yet. Click &quot;Assign Lecturer&quot; above to add one.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {course.lecturers.map((lecturer) => (
                                                        <div key={lecturer.id} className="flex items-center justify-between rounded-md bg-background p-3 border">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                                                    {lecturer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <p className="text-sm font-medium">{lecturer.full_name}</p>
                                                                        {lecturer.is_hod && (
                                                                            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                                                HOD
                                                                            </span>
                                                                        )}
                                                                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${lecturer.pivot_role === 'coordinator'
                                                                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                                                                            : lecturer.pivot_role === 'assistant'
                                                                                ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                            }`}>
                                                                            {lecturer.pivot_role}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {lecturer.email} {lecturer.staff_id ? `· ${lecturer.staff_id}` : ''}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
                                                                onClick={() => handleUnassign(String(lecturer.id), String(course.id), lecturer.full_name, course.code)}
                                                                isLoading={actionLoading === `unassign-${lecturer.id}-${course.id}`}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" /> Remove
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
