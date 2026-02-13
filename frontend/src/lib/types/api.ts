
export interface ApiResponse<T = unknown> {
    success: boolean;
    message: string;
    data: T;
    meta?: {
        timestamp?: string;
        version?: string;
    };
    errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = unknown> {
    success: boolean;
    message: string;
    data: T[];
    meta?: {
        timestamp?: string;
        version?: string;
    };
    pagination: {
        current_page: number;
        total_pages: number;
        per_page: number;
        total: number;
    };
}

export interface AuthResponse {
    user: import('./models').User;
    token: string;
    expires_in: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    password_confirmation: string;
    student_id: string;
}

export interface UpdateProfileData {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    phone?: string;
    student_id?: string;
}

/* ------------------------------------------------------------------ */
/*  User Management (Admin)                                            */
/* ------------------------------------------------------------------ */

export interface CreateUserData {
    first_name: string;
    last_name: string;
    middle_name?: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: 'admin' | 'lecturer' | 'student';
    staff_id?: string;
    student_id?: string;
    phone?: string;
    is_active?: boolean;
    is_verified?: boolean;
}

export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    email?: string;
    password?: string;
    password_confirmation?: string;
    role?: 'admin' | 'lecturer' | 'student';
    staff_id?: string;
    student_id?: string;
    phone?: string;
    is_active?: boolean;
    is_verified?: boolean;
}

export interface UserFilters {
    role?: string;
    search?: string;
    is_active?: string;
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
    trashed?: 'only' | 'with';
}
