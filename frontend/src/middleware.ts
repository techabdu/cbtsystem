
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    // Paths that are public
    const publicPaths = ['/login', '/register', '/'];
    if (publicPaths.includes(pathname)) {
        if (token) {
            // If user is logged in, redirect to dashboard (e.g. /student as default)
            // Ideally, we'd check the role from another cookie or decoding the token
            return NextResponse.redirect(new URL('/student', request.url));
        }
        return NextResponse.next();
    }

    // Protected paths
    if (!token && !publicPaths.includes(pathname)) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
