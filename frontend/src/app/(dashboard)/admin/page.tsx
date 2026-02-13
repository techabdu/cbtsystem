'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, BookOpen, Settings, Shield } from 'lucide-react';

export default function AdminDashboard() {
    const { user } = useAuthStore();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome back, {user?.first_name}! System overview and management.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Active accounts</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Courses</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">Active courses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Health</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">OK</div>
                        <p className="text-xs text-muted-foreground">All systems operational</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Settings</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">—</div>
                        <p className="text-xs text-muted-foreground">System settings</p>
                    </CardContent>
                </Card>
            </div>

            {/* Profile Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Admin Profile</CardTitle>
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
