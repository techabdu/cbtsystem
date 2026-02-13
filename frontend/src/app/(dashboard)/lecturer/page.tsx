'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, FileQuestion, Users, CalendarCheck } from 'lucide-react';

export default function LecturerDashboard() {
    const { user } = useAuthStore();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Lecturer Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.first_name}! Manage your courses and exams.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">My Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Assigned courses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Questions</CardTitle>
                        <FileQuestion className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">In question bank</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Published exams</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Total enrolled</p>
                    </CardContent>
                </Card>
            </div>

            {/* Profile Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Profile</CardTitle>
                    <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">Full Name</dt>
                            <dd className="text-sm">{user?.first_name} {user?.last_name}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                            <dd className="text-sm">{user?.email}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">Staff ID</dt>
                            <dd className="text-sm">{user?.staff_id || '—'}</dd>
                        </div>
                        <div>
                            <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                            <dd className="text-sm capitalize">{user?.role}</dd>
                        </div>
                    </dl>
                </CardContent>
            </Card>
        </div>
    );
}
