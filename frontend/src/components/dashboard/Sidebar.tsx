
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/authStore';
import { ROLES, ROUTES } from '@/lib/constants';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    FileQuestion,
    Settings,
    GraduationCap,
    Building2,
    Layers,
    BarChart3,
    ClipboardList,
    ClipboardCheck,
    Bell,
    FileText,
} from 'lucide-react';
import { User } from '@/lib/types/models';

type SidebarProps = React.HTMLAttributes<HTMLDivElement>;

interface SidebarLink {
    href: string;
    label: string;
    icon: React.ElementType;
    roles: User['role'][];
    hodOnly?: boolean;
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname();
    const { user } = useAuthStore();

    const role = user?.role;

    const links: SidebarLink[] = [
        // Student Links
        {
            href: ROUTES.DASHBOARD.STUDENT,
            label: 'Dashboard',
            icon: LayoutDashboard,
            roles: [ROLES.STUDENT],
        },
        {
            href: '/student/courses',
            label: 'My Courses',
            icon: BookOpen,
            roles: [ROLES.STUDENT],
        },
        {
            href: '/student/exams',
            label: 'My Exams',
            icon: ClipboardCheck,
            roles: [ROLES.STUDENT],
        },
        {
            href: '/student/practice',
            label: 'Practice',
            icon: BookOpen,
            roles: [ROLES.STUDENT],
        },
        {
            href: '/student/results',
            label: 'Results',
            icon: GraduationCap,
            roles: [ROLES.STUDENT],
        },

        // Lecturer Links
        {
            href: ROUTES.DASHBOARD.LECTURER,
            label: 'Dashboard',
            icon: LayoutDashboard,
            roles: [ROLES.LECTURER],
        },
        {
            href: '/lecturer/courses',
            label: 'My Courses',
            icon: BookOpen,
            roles: [ROLES.LECTURER],
        },
        {
            href: '/lecturer/questions',
            label: 'Question Bank',
            icon: FileQuestion,
            roles: [ROLES.LECTURER],
        },
        {
            href: '/lecturer/exams',
            label: 'Exams',
            icon: ClipboardList,
            roles: [ROLES.LECTURER],
        },
        {
            href: '/lecturer/course-assignments',
            label: 'Course Assignments',
            icon: ClipboardList,
            roles: [ROLES.LECTURER],
            hodOnly: true,
        },
        {
            href: '/lecturer/exam-reviews',
            label: 'Exam Reviews',
            icon: ClipboardCheck,
            roles: [ROLES.LECTURER],
            hodOnly: true,
        },
        {
            href: '/notifications',
            label: 'Notifications',
            icon: Bell,
            roles: [ROLES.LECTURER, ROLES.STUDENT],
        },

        // Admin Links
        {
            href: ROUTES.DASHBOARD.ADMIN,
            label: 'Dashboard',
            icon: LayoutDashboard,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/admin/users',
            label: 'Users',
            icon: Users,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/admin/departments',
            label: 'Departments',
            icon: Building2,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/admin/combinations',
            label: 'Combinations',
            icon: Layers,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/admin/levels',
            label: 'Levels',
            icon: BarChart3,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/admin/courses',
            label: 'Courses',
            icon: BookOpen,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/admin/exams',
            label: 'Exams',
            icon: FileText,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/admin/settings',
            label: 'Settings',
            icon: Settings,
            roles: [ROLES.ADMIN],
        },
        {
            href: '/notifications',
            label: 'Notifications',
            icon: Bell,
            roles: [ROLES.ADMIN],
        },
    ];

    const filteredLinks = links.filter((link) => {
        if (!role || !link.roles.includes(role)) return false;
        if (link.hodOnly && !user?.is_hod) return false;
        return true;
    });

    return (
        <div className={cn('pb-12', className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        CBT System
                    </h2>
                    <div className="space-y-1">
                        {filteredLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                            >
                                <span
                                    className={cn(
                                        'flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                                        pathname === link.href ? 'bg-accent text-accent-foreground' : 'transparent'
                                    )}
                                >
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.label}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
