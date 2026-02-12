
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export const ROLES = {
    ADMIN: 'admin',
    LECTURER: 'lecturer',
    STUDENT: 'student',
} as const;

export const ROUTES = {
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: {
        STUDENT: '/student',
        LECTURER: '/lecturer',
        ADMIN: '/admin',
    },
} as const;
