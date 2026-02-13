'use client';

import { useAuthStore } from '@/lib/store/authStore';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, MonitorCheck, User } from 'lucide-react';

export function Header() {
    const { user, logout } = useAuthStore();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

    // Role badge color
    const roleBadgeColor = {
        admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        lecturer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        student: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    }[user?.role || 'student'];

    return (
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-4 md:px-6">
                {/* Logo / Brand */}
                <div className="flex items-center gap-2 font-semibold">
                    <MonitorCheck className="h-5 w-5 text-primary" />
                    <span className="hidden sm:inline">CBT System</span>
                </div>

                {/* Right side — User info + Logout */}
                <div className="ml-auto flex items-center gap-3">
                    {user && (
                        <>
                            {/* Role Badge */}
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${roleBadgeColor}`}>
                                {user.role}
                            </span>

                            {/* User Name */}
                            <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="hidden text-sm font-medium sm:inline">
                                    {user.first_name} {user.last_name}
                                </span>
                            </div>

                            {/* Logout */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleLogout}
                                title="Sign out"
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <LogOut className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
