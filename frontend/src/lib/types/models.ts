export interface User {
    id: number;
    uuid: string;
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    full_name: string;
    role: 'admin' | 'lecturer' | 'student';
    student_id?: string;
    staff_id?: string;
    phone?: string;
    avatar_url?: string;
    is_active: boolean;
    is_verified: boolean;
    is_profile_complete: boolean;
    last_login_at?: string;
    created_at?: string;
}

export interface Course {
    id: number;
    uuid: string;
    code: string;
    title: string;
    description?: string;
    credit_hours: number;
    semester: string;
    level: string;
    academic_year: string;
    department_id: number;
    is_active: boolean;
}

export interface Exam {
    id: number;
    uuid: string;
    course_id: number;
    title: string;
    description?: string;
    instructions?: string;
    exam_type: 'quiz' | 'midterm' | 'final' | 'makeup';
    status: 'draft' | 'published' | 'completed';
    start_time: string;
    end_time: string;
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
    total_questions: number;
    is_practice: boolean;
}
