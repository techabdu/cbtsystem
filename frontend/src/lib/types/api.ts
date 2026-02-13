
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

/* ------------------------------------------------------------------ */
/*  Department Management (Admin)                                      */
/* ------------------------------------------------------------------ */

export interface CreateDepartmentData {
    code: string;
    name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateDepartmentData {
    code?: string;
    name?: string;
    description?: string;
    is_active?: boolean;
}

export interface DepartmentFilters {
    search?: string;
    is_active?: string;
    trashed?: '' | 'only' | 'with';
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

/* ------------------------------------------------------------------ */
/*  Course Management (Admin)                                          */
/* ------------------------------------------------------------------ */

export interface CreateCourseData {
    department_id: number;
    code: string;
    title: string;
    description?: string;
    credit_hours?: number;
    semester?: string;
    academic_year?: string;
    level?: string;
    is_active?: boolean;
}

export interface UpdateCourseData {
    department_id?: number;
    code?: string;
    title?: string;
    description?: string;
    credit_hours?: number;
    semester?: string;
    academic_year?: string;
    level?: string;
    is_active?: boolean;
}

export interface CourseFilters {
    search?: string;
    department_id?: number;
    semester?: string;
    level?: string;
    academic_year?: string;
    is_active?: string;
    trashed?: '' | 'only' | 'with';
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

export interface EnrollStudentData {
    student_id: number;
}

export interface BulkEnrollData {
    student_ids: number[];
}

export interface AssignLecturerData {
    lecturer_id: number;
    role?: 'lecturer' | 'coordinator' | 'assistant';
}

export interface EnrolledStudent {
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    student_id?: string;
    is_active: boolean;
    enrollments?: Array<{
        id: number;
        enrollment_date: string;
        status: string;
    }>;
}

export interface CourseLecturer {
    id: number;
    full_name: string;
    email: string;
    staff_id?: string;
    role: 'lecturer' | 'coordinator' | 'assistant';
}
