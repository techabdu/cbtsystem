'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Header } from '@/components/dashboard/Header';
import { useAuthStore } from '@/lib/store/authStore';
import { ROUTES } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
    children: React.ReactNode;
}

/**
 * Dashboard Layout with client-side auth + role guard.
 *
 * The edge middleware already blocks unauthorized access, but this
 * provides a secondary check and handles hydration edge cases.
 *
 * All redirects are inside useEffect to avoid "Cannot update a component
 * while rendering a different component" errors.
 */
export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isAuthenticated, isLoading, isHydrated, checkAuth } = useAuthStore();
    const [isReady, setIsReady] = useState(false);

    // On mount, verify the token is still valid
    useEffect(() => {
        if (isHydrated) {
            checkAuth().finally(() => setIsReady(true));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isHydrated]);

    // Handle redirects in useEffect (not during render)
    useEffect(() => {
        if (!isReady || isLoading) return;

        // Not authenticated — redirect to login
        if (!isAuthenticated || !user) {
            router.replace('/login');
            return;
        }

        // Role-based guard: verify user is on the correct role route
        const rolePrefix = `/${user.role}`;
        if (!pathname.startsWith(rolePrefix)) {
            const correctDashboard = user.role === 'admin'
                ? ROUTES.DASHBOARD.ADMIN
                : user.role === 'lecturer'
                    ? ROUTES.DASHBOARD.LECTURER
                    : ROUTES.DASHBOARD.STUDENT;
            router.replace(correctDashboard);
        }
    }, [isReady, isLoading, isAuthenticated, user, pathname, router]);

    // Show spinner while loading/checking auth
    if (!isHydrated || !isReady || isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // If not authenticated or wrong role, show spinner while redirect happens
    if (!isAuthenticated || !user) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const rolePrefix = `/${user.role}`;
    if (!pathname.startsWith(rolePrefix)) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-background">
            <Header />
            <div className="flex-1 items-start md:grid md:grid-cols-[240px_1fr]">
                <aside className="fixed top-16 z-30 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r bg-background md:sticky md:block">
                    <Sidebar />
                </aside>
                <main className="flex w-full flex-col overflow-hidden p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
