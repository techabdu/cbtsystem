import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware — Role-Based Route Protection
 *
 * This middleware runs on EVERY matched request and enforces:
 * 1. Unauthenticated users cannot access protected routes (redirected to /login)
 * 2. Authenticated users on auth pages (/login, /activate) are redirected to their dashboard
 * 3. Users cannot access routes for roles other than their own
 *    e.g. a student at /admin is redirected to /student
 */

const PUBLIC_PATHS = ['/login', '/activate', '/exams'];
// Paths accessible to all authenticated roles (no role-prefix required)
const SHARED_PATHS = ['/notifications'];
const ROLE_PATHS: Record<string, string> = {
    admin: '/admin',
    lecturer: '/lecturer',
    student: '/student',
};

function getDashboardForRole(role: string): string {
    return ROLE_PATHS[role] || '/student';
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const token = request.cookies.get('auth_token')?.value;
    const role = request.cookies.get('auth_user_role')?.value;

    // --- 1. Root path handling ---
    if (pathname === '/') {
        if (token && role) {
            return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // --- 2. Public pages ---
    if (PUBLIC_PATHS.includes(pathname)) {
        // Auth pages redirect logged-in users; /exams is always accessible
        if (pathname !== '/exams' && token && role) {
            return NextResponse.redirect(new URL(getDashboardForRole(role), request.url));
        }
        return NextResponse.next();
    }

    // --- 2b. Exam taking interface (/exam/*) — requires token but no role guard ---
    if (pathname.startsWith('/exam/')) {
        if (!token) {
            return NextResponse.redirect(new URL('/exams', request.url));
        }
        return NextResponse.next();
    }

    // --- 3. Protected routes — require authentication ---
    if (!token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // --- 4. Role-based isolation ---
    // Shared paths are accessible to all authenticated users — skip role guard
    if (SHARED_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Check if the current path belongs to a specific role
    for (const [routeRole, prefix] of Object.entries(ROLE_PATHS)) {
        if (pathname.startsWith(prefix)) {
            if (role !== routeRole) {
                // User is trying to access a route not meant for their role
                // Redirect them to their own dashboard
                const correctDashboard = getDashboardForRole(role || 'student');
                return NextResponse.redirect(new URL(correctDashboard, request.url));
            }
            break;
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes
         * - static files
         * - Next.js internals
         */
        '/((?!api|_next/static|_next/image|favicon\\.ico|images|icons).*)',
    ],
};
