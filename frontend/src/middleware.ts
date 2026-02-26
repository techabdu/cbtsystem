import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware for route protection and role-based redirection.
 *
 * Reads `auth_token` and `auth_user_role` cookies set by the auth store
 * (see authStore.ts → setCookie).
 *
 * Behaviour:
 * - Unauthenticated requests to protected routes → redirect to /login
 * - Authenticated users on /login or / → redirect to their role dashboard
 * - Authenticated users on a wrong-role route → redirect to their dashboard
 */

const PUBLIC_PATHS = ['/login', '/activate'];

const ROLE_DASHBOARDS: Record<string, string> = {
    admin: '/admin',
    lecturer: '/lecturer',
    student: '/student',
    cbt: '/cbt',
    edu_portal: '/edu_portal',
};

/** Paths that all authenticated users can access regardless of role. */
const SHARED_PROTECTED_PATHS = ['/notifications'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const token = request.cookies.get('auth_token')?.value;
    const role = request.cookies.get('auth_user_role')?.value;

    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

    /* ---------------------------------------------------------------- */
    /* Unauthenticated                                                   */
    /* ---------------------------------------------------------------- */
    if (!token) {
        // Allow public pages
        if (isPublicPath || pathname === '/') {
            return NextResponse.next();
        }
        // Block all other routes — send to login
        const loginUrl = request.nextUrl.clone();
        loginUrl.pathname = '/login';
        return NextResponse.redirect(loginUrl);
    }

    /* ---------------------------------------------------------------- */
    /* Authenticated                                                     */
    /* ---------------------------------------------------------------- */

    // Authenticated user on login/activate → send to their dashboard
    if (isPublicPath || pathname === '/') {
        const dashboard = (role && ROLE_DASHBOARDS[role]) ?? '/student';
        const dashboardUrl = request.nextUrl.clone();
        dashboardUrl.pathname = dashboard;
        return NextResponse.redirect(dashboardUrl);
    }

    // Shared paths are accessible to all authenticated roles
    if (SHARED_PROTECTED_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Role-based route guard: ensure user stays on their own role prefix
    if (role) {
        const correctPrefix = ROLE_DASHBOARDS[role];
        if (correctPrefix && !pathname.startsWith(correctPrefix)) {
            const dashboardUrl = request.nextUrl.clone();
            dashboardUrl.pathname = correctPrefix;
            return NextResponse.redirect(dashboardUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    /**
     * Match all routes except Next.js internals and static files.
     * api routes are excluded so they're handled by the backend proxy.
     */
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|api/).*)',
    ],
};
