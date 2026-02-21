
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
    identifier: string;  // email, matric number, or file number
    password: string;
}

export interface ActivateAccountData {
    identifier: string;  // matric number or file number
    password: string;
    password_confirmation: string;
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
    role: 'admin' | 'lecturer' | 'student';
    department_id?: number;
    combination_id?: number;
    level_id?: number;
    staff_id?: string;
    student_id?: string;
    phone?: string;
    is_active?: boolean;
    is_hod?: boolean;
}

export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    email?: string;
    password?: string;
    password_confirmation?: string;
    role?: 'admin' | 'lecturer' | 'student';
    department_id?: number;
    combination_id?: number;
    level_id?: number;
    staff_id?: string;
    student_id?: string;
    phone?: string;
    is_active?: boolean;
    is_verified?: boolean;
    is_hod?: boolean;
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
    level_id?: number;
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
    level_id?: number;
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

/* ------------------------------------------------------------------ */
/*  Combination Management (Admin)                                     */
/* ------------------------------------------------------------------ */

export interface CreateCombinationData {
    code: string;
    name: string;
    first_department_id: number;
    second_department_id: number;
    is_active?: boolean;
}

export interface UpdateCombinationData {
    code?: string;
    name?: string;
    first_department_id?: number;
    second_department_id?: number;
    is_active?: boolean;
}

export interface CombinationFilters {
    search?: string;
    is_active?: string;
    trashed?: '' | 'only' | 'with';
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

/* ------------------------------------------------------------------ */
/*  Level Management (Admin)                                           */
/* ------------------------------------------------------------------ */

export interface CreateLevelData {
    code: string;
    name: string;
    numeric_order: number;
    is_active?: boolean;
}

export interface UpdateLevelData {
    code?: string;
    name?: string;
    numeric_order?: number;
    is_active?: boolean;
}

export interface LevelFilters {
    search?: string;
    is_active?: string;
    trashed?: '' | 'only' | 'with';
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

/* ------------------------------------------------------------------ */
/*  Student Courses                                                   */
/* ------------------------------------------------------------------ */

export interface StudentCourseFilters {
    semester?: string;
    level?: string;
    page?: number;
    per_page?: number;
}

export interface EnrollmentWindow {
    is_open: boolean;
    start_date: string | null;
    end_date: string | null;
}

export interface AvailableCoursesResponse extends Omit<PaginatedResponse<import('./models').Course>, 'meta'> {
    meta: {
        enrollment_window: EnrollmentWindow;
        timestamp?: string;
        version?: string;
    };
}

/* ------------------------------------------------------------------ */
/*  Question Bank (Lecturer & Admin)                                   */
/* ------------------------------------------------------------------ */

export interface CreateQuestionData {
    course_id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'essay';
    options?: Array<{ key: string; value: string }>;
    correct_answer?: string | string[];
    points?: number;
    difficulty_level?: 'easy' | 'medium' | 'hard';
    topic?: string;
    tags?: string[];
    image_url?: string;
    is_active?: boolean;
}

export interface UpdateQuestionData {
    course_id?: number;
    question_text?: string;
    question_type?: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'essay';
    options?: Array<{ key: string; value: string }>;
    correct_answer?: string | string[];
    points?: number;
    difficulty_level?: 'easy' | 'medium' | 'hard';
    topic?: string;
    tags?: string[];
    image_url?: string;
    is_active?: boolean;
}

export interface QuestionFilters {
    search?: string;
    course_id?: number;
    question_type?: string;
    difficulty_level?: string;
    topic?: string;
    is_active?: string;
    is_verified?: string;
    trashed?: '' | 'only' | 'with';
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

export interface BulkUploadData {
    course_id: number;
    questions: Array<{
        question_text: string;
        question_type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'essay';
        options?: Array<{ key: string; value: string }>;
        correct_answer?: string | string[];
        points?: number;
        difficulty_level?: 'easy' | 'medium' | 'hard';
        topic?: string;
        tags?: string[];
    }>;
}

export interface BulkUploadResult {
    total_processed: number;
    successful: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
}

export interface QuestionStats {
    total: number;
    active: number;
    verified: number;
    by_type: {
        multiple_choice: number;
        true_false: number;
        fill_in_blank: number;
        essay: number;
    };
    by_difficulty: {
        easy: number;
        medium: number;
        hard: number;
    };
}

/* ------------------------------------------------------------------ */
/*  HOD Course Assignment                                              */
/* ------------------------------------------------------------------ */

export interface HodAssignCourseData {
    lecturer_id: number;
    course_id: number;
    role?: 'lecturer' | 'coordinator' | 'assistant';
}

export interface HodAssignment {
    id: number;
    code: string;
    title: string;
    credit_hours?: number;
    semester?: string;
    students_count: number;
    questions_count: number;
    lecturers: Array<{
        id: number;
        full_name: string;
        email: string;
        staff_id?: string;
        is_hod: boolean;
        pivot_role: string;
    }>;
}
