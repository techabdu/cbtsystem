'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    getCourse,
    getCourseStudents,
    getCourseLecturers,
    enrollStudent,
    unenrollStudent,
    assignLecturer,
    unassignLecturer,
} from '@/lib/api/courses';
import { getUsers } from '@/lib/api/users';
import type { Course } from '@/lib/types/models';
import type { EnrolledStudent, CourseLecturer } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    ArrowLeft, BookOpen, Users, GraduationCap,
    Loader2, CheckCircle2, AlertCircle, Plus,
    Trash2, Search, ChevronLeft, ChevronRight,
    X, UserPlus, FileQuestion, ClipboardList,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserOption {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    student_id?: string;
    staff_id?: string;
    role: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminCourseDetailPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = Number(params.id);

    // Course data
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Students tab
    const [students, setStudents] = useState<EnrolledStudent[]>([]);
    const [studentPagination, setStudentPagination] = useState({ current_page: 1, total_pages: 1, per_page: 20, total: 0 });
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentPage, setStudentPage] = useState(1);

    // Lecturers tab
    const [lecturers, setLecturers] = useState<CourseLecturer[]>([]);
    const [isLoadingLecturers, setIsLoadingLecturers] = useState(false);

    // Active tab
    const [activeTab, setActiveTab] = useState<'students' | 'lecturers'>('students');

    // Enroll form
    const [showEnrollForm, setShowEnrollForm] = useState(false);
    const [enrollStudentId, setEnrollStudentId] = useState<string>('');
    const [availableStudents, setAvailableStudents] = useState<UserOption[]>([]);
    const [isSearchingStudents, setIsSearchingStudents] = useState(false);
    const [studentSearchTerm, setStudentSearchTerm] = useState('');

    // Assign lecturer form
    const [showAssignForm, setShowAssignForm] = useState(false);
    const [assignLecturerId, setAssignLecturerId] = useState<string>('');
    const [assignRole, setAssignRole] = useState<'lecturer' | 'coordinator' | 'assistant'>('lecturer');
    const [availableLecturers, setAvailableLecturers] = useState<UserOption[]>([]);
    const [isSearchingLecturers, setIsSearchingLecturers] = useState(false);
    const [lecturerSearchTerm, setLecturerSearchTerm] = useState('');

    // Messages
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

    /* ------------------------------------------------------------------ */
    /*  Fetch course                                                       */
    /* ------------------------------------------------------------------ */

    const fetchCourse = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getCourse(courseId);
            setCourse(res.data.course);
        } catch (err) {
            console.error('Failed to fetch course:', err);
            setErrorMessage('Failed to load course.');
        } finally {
            setIsLoading(false);
        }
    }, [courseId]);

    useEffect(() => { fetchCourse(); }, [fetchCourse]);

    /* ------------------------------------------------------------------ */
    /*  Fetch students                                                     */
    /* ------------------------------------------------------------------ */

    const fetchStudents = useCallback(async () => {
        setIsLoadingStudents(true);
        try {
            const res = await getCourseStudents(courseId, {
                search: studentSearch || undefined,
                per_page: 20,
                page: studentPage,
            });
            setStudents(res.data);
            setStudentPagination(res.pagination);
        } catch (err) {
            console.error('Failed to fetch students:', err);
        } finally {
            setIsLoadingStudents(false);
        }
    }, [courseId, studentSearch, studentPage]);

    useEffect(() => {
        if (activeTab === 'students') fetchStudents();
    }, [fetchStudents, activeTab]);

    /* ------------------------------------------------------------------ */
    /*  Fetch lecturers                                                    */
    /* ------------------------------------------------------------------ */

    const fetchLecturers = useCallback(async () => {
        setIsLoadingLecturers(true);
        try {
            const res = await getCourseLecturers(courseId);
            setLecturers(res.data.lecturers);
        } catch (err) {
            console.error('Failed to fetch lecturers:', err);
        } finally {
            setIsLoadingLecturers(false);
        }
    }, [courseId]);

    useEffect(() => {
        if (activeTab === 'lecturers') fetchLecturers();
    }, [fetchLecturers, activeTab]);

    /* ------------------------------------------------------------------ */
    /*  Search for users to enroll / assign                                */
    /* ------------------------------------------------------------------ */

    const searchStudents = async (term: string) => {
        setStudentSearchTerm(term);
        if (term.length < 2) { setAvailableStudents([]); return; }
        setIsSearchingStudents(true);
        try {
            const res = await getUsers({ role: 'student', search: term, per_page: 10 });
            setAvailableStudents(res.data as unknown as UserOption[]);
        } catch {
            setAvailableStudents([]);
        } finally {
            setIsSearchingStudents(false);
        }
    };

    const searchLecturers = async (term: string) => {
        setLecturerSearchTerm(term);
        if (term.length < 2) { setAvailableLecturers([]); return; }
        setIsSearchingLecturers(true);
        try {
            const res = await getUsers({ role: 'lecturer', search: term, per_page: 10 });
            setAvailableLecturers(res.data as unknown as UserOption[]);
        } catch {
            setAvailableLecturers([]);
        } finally {
            setIsSearchingLecturers(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Actions                                                            */
    /* ------------------------------------------------------------------ */

    const handleEnrollStudent = async () => {
        if (!enrollStudentId) return;
        setActionLoadingId(-1);
        setErrorMessage('');
        try {
            await enrollStudent(courseId, { student_id: Number(enrollStudentId) });
            setSuccessMessage('Student enrolled successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            setShowEnrollForm(false);
            setEnrollStudentId('');
            setStudentSearchTerm('');
            setAvailableStudents([]);
            await fetchStudents();
            await fetchCourse();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to enroll student.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleUnenrollStudent = async (studentId: number, studentName: string) => {
        if (!confirm(`Unenroll "${studentName}" from this course?`)) return;
        setActionLoadingId(studentId);
        try {
            await unenrollStudent(courseId, studentId);
            setSuccessMessage(`"${studentName}" unenrolled.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchStudents();
            await fetchCourse();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to unenroll student.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleAssignLecturer = async () => {
        if (!assignLecturerId) return;
        setActionLoadingId(-2);
        setErrorMessage('');
        try {
            await assignLecturer(courseId, {
                lecturer_id: Number(assignLecturerId),
                role: assignRole,
            });
            setSuccessMessage('Lecturer assigned successfully.');
            setTimeout(() => setSuccessMessage(''), 3000);
            setShowAssignForm(false);
            setAssignLecturerId('');
            setLecturerSearchTerm('');
            setAvailableLecturers([]);
            await fetchLecturers();
            await fetchCourse();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to assign lecturer.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleUnassignLecturer = async (lecturerId: number, lecturerName: string) => {
        if (!confirm(`Unassign "${lecturerName}" from this course?`)) return;
        setActionLoadingId(lecturerId);
        try {
            await unassignLecturer(courseId, lecturerId);
            setSuccessMessage(`"${lecturerName}" unassigned.`);
            setTimeout(() => setSuccessMessage(''), 3000);
            await fetchLecturers();
            await fetchCourse();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setErrorMessage(error.response?.data?.message || 'Failed to unassign lecturer.');
            setTimeout(() => setErrorMessage(''), 5000);
        } finally {
            setActionLoadingId(null);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Render: Loading / Error states                                     */
    /* ------------------------------------------------------------------ */

    if (isLoading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex h-96 flex-col items-center justify-center gap-4">
                <AlertCircle className="h-12 w-12 text-muted-foreground/40" />
                <p className="text-muted-foreground">Course not found</p>
                <Button variant="outline" onClick={() => router.push('/admin/courses')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Courses
                </Button>
            </div>
        );
    }

    /* ------------------------------------------------------------------ */
    /*  Render: Main                                                       */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-6">
            {/* Back + Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/admin/courses')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{course.title}</h1>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary font-mono">{course.code}</span>
                            {course.department && (
                                <span>• {course.department.name}</span>
                            )}
                            {course.level && <span>• {course.level}</span>}
                            {course.semester && <span>• {course.semester} Semester</span>}
                        </div>
                    </div>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${course.is_active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                    }`}>
                    {course.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>

            {/* Course Info Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Students</p>
                            <p className="text-xl font-bold">{course.students_count ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                            <GraduationCap className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Lecturers</p>
                            <p className="text-xl font-bold">{course.lecturers_count ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/40">
                            <FileQuestion className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Questions</p>
                            <p className="text-xl font-bold">{course.questions_count ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 pt-6">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
                            <ClipboardList className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Exams</p>
                            <p className="text-xl font-bold">{course.exams_count ?? 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Course details */}
            {course.description && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{course.description}</p>
                    </CardContent>
                </Card>
            )}

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

            {/* Tab Switcher */}
            <div className="flex gap-2">
                <Button
                    variant={activeTab === 'students' ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => setActiveTab('students')}
                >
                    <Users className="h-4 w-4" /> Enrolled Students
                </Button>
                <Button
                    variant={activeTab === 'lecturers' ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => setActiveTab('lecturers')}
                >
                    <GraduationCap className="h-4 w-4" /> Assigned Lecturers
                </Button>
            </div>

            {/* ---------------------------------------------------------- */}
            {/*  Students Tab                                               */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 'students' && (
                <>
                    {/* Enroll form */}
                    {showEnrollForm ? (
                        <Card className="border-primary/30 shadow-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">Enroll Student</CardTitle>
                                        <CardDescription>Search for a student to enroll in this course.</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => { setShowEnrollForm(false); setEnrollStudentId(''); setAvailableStudents([]); setStudentSearchTerm(''); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Search Student</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Type name, email, or student ID..."
                                            value={studentSearchTerm}
                                            onChange={(e) => searchStudents(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    {isSearchingStudents && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                                        </p>
                                    )}
                                    {availableStudents.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto rounded-md border">
                                            {availableStudents.map((s) => (
                                                <button
                                                    type="button"
                                                    key={s.id}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0 ${enrollStudentId === String(s.id) ? 'bg-primary/10 font-medium' : ''}`}
                                                    onClick={() => setEnrollStudentId(String(s.id))}
                                                >
                                                    <p className="font-medium">{s.full_name || `${s.first_name} ${s.last_name}`}</p>
                                                    <p className="text-xs text-muted-foreground">{s.email} {s.student_id && `• ${s.student_id}`}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => { setShowEnrollForm(false); setEnrollStudentId(''); setAvailableStudents([]); setStudentSearchTerm(''); }}>Cancel</Button>
                                    <Button
                                        onClick={handleEnrollStudent}
                                        disabled={!enrollStudentId || actionLoadingId === -1}
                                        isLoading={actionLoadingId === -1}
                                        className="gap-2"
                                    >
                                        <UserPlus className="h-4 w-4" /> Enroll Student
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex justify-end">
                            <Button className="gap-2" onClick={() => setShowEnrollForm(true)}>
                                <Plus className="h-4 w-4" /> Enroll Student
                            </Button>
                        </div>
                    )}

                    {/* Search bar */}
                    <Card>
                        <CardContent className="pt-6">
                            <form onSubmit={(e) => { e.preventDefault(); setStudentPage(1); }} className="flex gap-3">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search enrolled students..."
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Button type="submit" variant="secondary" className="gap-2">
                                    <Search className="h-4 w-4" /> Search
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Students Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Student ID</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Email</th>
                                            <th className="px-4 py-3 text-center font-medium text-muted-foreground hidden sm:table-cell">Enrolled</th>
                                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoadingStudents ? (
                                            <tr>
                                                <td colSpan={6} className="py-16 text-center">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                                    <p className="mt-2 text-sm text-muted-foreground">Loading students...</p>
                                                </td>
                                            </tr>
                                        ) : students.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-16 text-center">
                                                    <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                                    <p className="mt-2 text-sm text-muted-foreground">No enrolled students</p>
                                                    <p className="text-xs text-muted-foreground">Enroll students to get started</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            students.map((student) => (
                                                <tr key={student.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-xs">{student.student_id || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{student.full_name || `${student.first_name} ${student.last_name}`}</td>
                                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{student.email}</td>
                                                    <td className="px-4 py-3 text-center text-xs text-muted-foreground hidden sm:table-cell">
                                                        {student.enrollments?.[0]?.enrollment_date || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${student.enrollments?.[0]?.status === 'active'
                                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                            }`}>
                                                            {student.enrollments?.[0]?.status || 'unknown'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Unenroll"
                                                            onClick={() => handleUnenrollStudent(student.id, student.full_name || `${student.first_name} ${student.last_name}`)}
                                                            disabled={actionLoadingId === student.id}
                                                        >
                                                            {actionLoadingId === student.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Trash2 className="h-4 w-4 text-destructive" />
                                                            }
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {!isLoadingStudents && studentPagination.total_pages > 1 && (
                                <div className="flex items-center justify-between border-t px-4 py-3">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {(studentPagination.current_page - 1) * studentPagination.per_page + 1} to{' '}
                                        {Math.min(studentPagination.current_page * studentPagination.per_page, studentPagination.total)}{' '}
                                        of {studentPagination.total} students
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={studentPagination.current_page <= 1}
                                            onClick={() => setStudentPage((p) => Math.max(1, p - 1))}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            Page {studentPagination.current_page} of {studentPagination.total_pages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={studentPagination.current_page >= studentPagination.total_pages}
                                            onClick={() => setStudentPage((p) => p + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Lecturers Tab                                              */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 'lecturers' && (
                <>
                    {/* Assign form */}
                    {showAssignForm ? (
                        <Card className="border-primary/30 shadow-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-base">Assign Lecturer</CardTitle>
                                        <CardDescription>Search for a lecturer to assign to this course.</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => { setShowAssignForm(false); setAssignLecturerId(''); setAvailableLecturers([]); setLecturerSearchTerm(''); }}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Search Lecturer</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Type name, email, or staff ID..."
                                            value={lecturerSearchTerm}
                                            onChange={(e) => searchLecturers(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>
                                    {isSearchingLecturers && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Searching...
                                        </p>
                                    )}
                                    {availableLecturers.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto rounded-md border">
                                            {availableLecturers.map((l) => (
                                                <button
                                                    type="button"
                                                    key={l.id}
                                                    className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors border-b last:border-b-0 ${assignLecturerId === String(l.id) ? 'bg-primary/10 font-medium' : ''}`}
                                                    onClick={() => setAssignLecturerId(String(l.id))}
                                                >
                                                    <p className="font-medium">{l.full_name || `${l.first_name} ${l.last_name}`}</p>
                                                    <p className="text-xs text-muted-foreground">{l.email} {l.staff_id && `• ${l.staff_id}`}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <select
                                        value={assignRole}
                                        onChange={(e) => setAssignRole(e.target.value as 'lecturer' | 'coordinator' | 'assistant')}
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <option value="lecturer">Lecturer</option>
                                        <option value="coordinator">Coordinator</option>
                                        <option value="assistant">Assistant</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => { setShowAssignForm(false); setAssignLecturerId(''); setAvailableLecturers([]); setLecturerSearchTerm(''); }}>Cancel</Button>
                                    <Button
                                        onClick={handleAssignLecturer}
                                        disabled={!assignLecturerId || actionLoadingId === -2}
                                        isLoading={actionLoadingId === -2}
                                        className="gap-2"
                                    >
                                        <UserPlus className="h-4 w-4" /> Assign Lecturer
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="flex justify-end">
                            <Button className="gap-2" onClick={() => setShowAssignForm(true)}>
                                <Plus className="h-4 w-4" /> Assign Lecturer
                            </Button>
                        </div>
                    )}

                    {/* Lecturers Table */}
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/50">
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Staff ID</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                                            <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Email</th>
                                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Role</th>
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoadingLecturers ? (
                                            <tr>
                                                <td colSpan={5} className="py-16 text-center">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                                    <p className="mt-2 text-sm text-muted-foreground">Loading lecturers...</p>
                                                </td>
                                            </tr>
                                        ) : lecturers.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-16 text-center">
                                                    <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/40" />
                                                    <p className="mt-2 text-sm text-muted-foreground">No lecturers assigned</p>
                                                    <p className="text-xs text-muted-foreground">Assign lecturers to this course</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            lecturers.map((lecturer) => (
                                                <tr key={lecturer.id} className="border-b transition-colors hover:bg-muted/50">
                                                    <td className="px-4 py-3">
                                                        <span className="font-mono text-xs">{lecturer.staff_id || '—'}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">{lecturer.full_name}</td>
                                                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{lecturer.email}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${lecturer.role === 'coordinator'
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                : lecturer.role === 'assistant'
                                                                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                                    : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                                            }`}>
                                                            {lecturer.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            title="Unassign"
                                                            onClick={() => handleUnassignLecturer(lecturer.id, lecturer.full_name)}
                                                            disabled={actionLoadingId === lecturer.id}
                                                        >
                                                            {actionLoadingId === lecturer.id
                                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                                : <Trash2 className="h-4 w-4 text-destructive" />
                                                            }
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
