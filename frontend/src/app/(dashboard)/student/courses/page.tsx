'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getAvailableCourses, getEnrolledCourses, enrollInCourse, unenrollFromCourse } from '@/lib/api/student';
import { Course } from '@/lib/types/models';
import { EnrollmentWindow } from '@/lib/types/api';
import { format } from 'date-fns';
import { Info, BookOpen, Clock, Users, GraduationCap, Building2, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';

export default function StudentCoursesPage() {
    const { user } = useAuthStore();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState<'my_courses' | 'available_courses'>('my_courses');

    // Data states
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [enrollmentWindow, setEnrollmentWindow] = useState<EnrollmentWindow | null>(null);

    // Loading states
    const [loadingEnrolled, setLoadingEnrolled] = useState(true);
    const [loadingAvailable, setLoadingAvailable] = useState(false);

    // Action loading states
    const [actionLoading, setActionLoading] = useState<number | null>(null); // course_id

    // Fetch data
    const fetchEnrolled = async () => {
        setLoadingEnrolled(true);
        try {
            const res = await getEnrolledCourses({ per_page: 50 }); // Fetch all/many
            setEnrolledCourses(res.data);
        } catch (error) {
            console.error('Failed to fetch enrolled courses', error);
        } finally {
            setLoadingEnrolled(false);
        }
    };

    const fetchAvailable = async () => {
        setLoadingAvailable(true);
        try {
            const res = await getAvailableCourses({ per_page: 50 }); // Fetch all/many
            setAvailableCourses(res.data);
            setEnrollmentWindow(res.meta.enrollment_window);
        } catch (error) {
            console.error('Failed to fetch available courses', error);
        } finally {
            setLoadingAvailable(false);
        }
    };

    // Initial load
    useEffect(() => {
        fetchEnrolled();
        // Since available courses response contains enrollment window info, fetch it initially too
        fetchAvailable();
    }, []);

    // Handle Enroll
    const handleEnroll = async (courseId: number) => {
        if (!enrollmentWindow?.is_open) return;
        setActionLoading(courseId);
        try {
            await enrollInCourse(courseId);
            // Refresh data
            await Promise.all([fetchEnrolled(), fetchAvailable()]);
        } catch (error) {
            console.error('Enrollment failed', error);
            alert('Failed to enroll. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    // Handle Unenroll
    const handleUnenroll = async (courseId: number) => {
        if (!enrollmentWindow?.is_open) return;
        if (!confirm('Are you sure you want to unenroll from this course?')) return;

        setActionLoading(courseId);
        try {
            await unenrollFromCourse(courseId);
            await Promise.all([fetchEnrolled(), fetchAvailable()]);
        } catch (error) {
            console.error('Unenrollment failed', error);
            alert('Failed to unenroll. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Course Management</h1>
                    <p className="text-muted-foreground">
                        Manage your course enrollments for the semester.
                    </p>
                </div>
                {enrollmentWindow && (
                    <div className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm ${enrollmentWindow.is_open
                            ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400'
                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400'
                        }`}>
                        <Clock className="h-4 w-4" />
                        <span>
                            Enrollment is <strong>{enrollmentWindow.is_open ? 'Open' : 'Closed'}</strong>
                            {enrollmentWindow.end_date && ` until ${format(new Date(enrollmentWindow.end_date), 'MMM d, yyyy')}`}
                        </span>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 rounded-lg bg-muted p-1 sm:w-fit">
                <button
                    onClick={() => setActiveTab('my_courses')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all sm:flex-none ${activeTab === 'my_courses'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                        }`}
                >
                    My Courses ({enrolledCourses.length})
                </button>
                <button
                    onClick={() => setActiveTab('available_courses')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all sm:flex-none ${activeTab === 'available_courses'
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
                        }`}
                >
                    Available Courses
                </button>
            </div>

            {/* Content */}
            <div className="min-h-[300px]">
                {activeTab === 'my_courses' && (
                    loadingEnrolled ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader className="h-24 bg-muted/50 rounded-t-lg" />
                                    <CardContent className="mt-4 h-20 bg-muted/50" />
                                </Card>
                            ))}
                        </div>
                    ) : enrolledCourses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center animate-in fade-in-50">
                            <BookOpen className="h-10 w-10 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold">No courses enrolled</h3>
                            <p className="mb-4 text-sm text-muted-foreground max-w-sm">
                                You haven't enrolled in any courses yet. Check the Available Courses tab to get started.
                            </p>
                            <Button onClick={() => setActiveTab('available_courses')}>
                                Browse Available Courses
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in-50">
                            {enrolledCourses.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    type="enrolled"
                                    onAction={() => handleUnenroll(course.id)}
                                    loading={actionLoading === course.id}
                                    enrollmentOpen={enrollmentWindow?.is_open || false}
                                />
                            ))}
                        </div>
                    )
                )}

                {activeTab === 'available_courses' && (
                    loadingAvailable ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader className="h-24 bg-muted/50 rounded-t-lg" />
                                    <CardContent className="mt-4 h-20 bg-muted/50" />
                                </Card>
                            ))}
                        </div>
                    ) : availableCourses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center animate-in fade-in-50">
                            <Info className="h-10 w-10 text-muted-foreground/50" />
                            <h3 className="mt-4 text-lg font-semibold">No courses available</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                There are no courses available for enrollment based on your combination at this time.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in-50">
                            {availableCourses.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    course={course}
                                    type="available"
                                    onAction={() => handleEnroll(course.id)}
                                    loading={actionLoading === course.id}
                                    enrollmentOpen={enrollmentWindow?.is_open || false}
                                />
                            ))}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

function CourseCard({
    course,
    type,
    onAction,
    loading,
    enrollmentOpen
}: {
    course: Course;
    type: 'enrolled' | 'available';
    onAction: () => void;
    loading: boolean;
    enrollmentOpen: boolean;
}) {
    return (
        <Card className="flex flex-col transition-all hover:shadow-md">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-base font-bold">{course.code}</CardTitle>
                        <CardDescription className="line-clamp-1 mt-1 text-sm">{course.title}</CardDescription>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground shrink-0">
                        {course.credit_hours} Units
                    </span>
                </div>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground pb-4">
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{course.department?.name || 'Department'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span>Level {course.level} • {course.semester} Semester</span>
                </div>
                {type === 'enrolled' ? (
                    <div className="mt-2 flex items-center gap-2 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" />
                        <span className="font-medium">Enrolled</span>
                    </div>
                ) : (
                    <div className="mt-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                        <Info className="h-4 w-4" />
                        <span className="font-medium">Available</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-0">
                {type === 'enrolled' ? (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={onAction}
                        disabled={loading || !enrollmentOpen}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Processing' : 'Unenroll'}
                    </Button>
                ) : (
                    <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={onAction}
                        disabled={loading || !enrollmentOpen}
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Enrolling' : 'Enroll Now'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
