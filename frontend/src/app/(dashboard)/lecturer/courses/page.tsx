'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLecturerMyCourses } from '@/lib/api/hod';
import type { Course } from '@/lib/types/models';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
    BookOpen, Users, FileQuestion, GraduationCap,
    Loader2, Search, ArrowRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LecturerCoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCourses = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await getLecturerMyCourses();
            setCourses(res.data.courses);
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Failed to load your courses.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const filteredCourses = courses.filter(c => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return c.code.toLowerCase().includes(term) || c.title.toLowerCase().includes(term);
    });

    /* ------------------------------------------------------------------ */
    /*  Stats                                                              */
    /* ------------------------------------------------------------------ */

    const totalStudents = courses.reduce((sum, c) => sum + (c.students_count || 0), 0);
    const totalQuestions = courses.reduce((sum, c) => sum + (c.questions_count || 0), 0);

    /* ------------------------------------------------------------------ */
    /*  Loading                                                            */
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
            <div>
                <h1 className="text-2xl font-bold tracking-tight">My Courses</h1>
                <p className="text-muted-foreground">
                    Courses assigned to you. Select a course to manage its question bank.
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/40">
                                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{courses.length}</p>
                                <p className="text-xs text-muted-foreground">Assigned Courses</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-emerald-100 p-2.5 dark:bg-emerald-900/40">
                                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalStudents}</p>
                                <p className="text-xs text-muted-foreground">Total Students</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/40">
                                <FileQuestion className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalQuestions}</p>
                                <p className="text-xs text-muted-foreground">Total Questions</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            {courses.length > 0 && (
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
            )}

            {/* Course Cards */}
            {filteredCourses.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/30" />
                        <p className="mt-2 text-sm text-muted-foreground">
                            {courses.length === 0
                                ? 'No courses assigned to you yet. Contact your Head of Department.'
                                : 'No courses match your search.'}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCourses.map((course) => (
                        <Card key={course.id} className="group hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-mono font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                                        {course.code}
                                    </span>
                                    {course.department && (
                                        <span className="text-xs text-muted-foreground">
                                            {course.department.code}
                                        </span>
                                    )}
                                </div>
                                <CardTitle className="text-base mt-2">{course.title}</CardTitle>
                                {course.description && (
                                    <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                                )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-md bg-muted/50 p-2">
                                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{course.students_count || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Students</p>
                                    </div>
                                    <div className="rounded-md bg-muted/50 p-2">
                                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{course.questions_count || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Questions</p>
                                    </div>
                                    <div className="rounded-md bg-muted/50 p-2">
                                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{course.exams_count || 0}</p>
                                        <p className="text-[10px] text-muted-foreground">Exams</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 pt-1">
                                    <Link href={`/lecturer/questions?course_id=${course.id}`}>
                                        <Button variant="outline" size="sm" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <FileQuestion className="h-4 w-4" />
                                            Set Questions
                                            <ArrowRight className="h-3 w-3 ml-auto" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
