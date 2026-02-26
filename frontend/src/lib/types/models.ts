export interface School {
    id: number;
    uuid: string;
    code: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

export interface User {
    id: number;
    uuid: string;
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    full_name: string;
    role: 'admin' | 'lecturer' | 'student' | 'cbt' | 'edu_portal';
    is_hod?: boolean;
    is_school_exam_officer?: boolean;
    is_department_exam_officer?: boolean;
    student_id?: string;
    staff_id?: string;
    school_id?: number;
    school?: School;
    department_id?: number;
    department?: {
        id: number;
        name: string;
        code: string;
    };
    combination_id?: number;
    combination?: Combination;
    level_id?: number;
    level?: Level;
    phone?: string;
    avatar_url?: string;
    is_active: boolean;
    is_verified: boolean;
    is_activated: boolean;
    is_profile_complete: boolean;
    last_login_at?: string;
    created_at?: string;
}

export interface Department {
    id: number;
    code: string;
    name: string;
    description?: string;
    school_id?: number;
    school?: School;
    is_active: boolean;
    courses_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Combination {
    id: number;
    code: string;
    name: string;
    first_department_id: number;
    second_department_id: number;
    first_department?: Department;
    second_department?: Department;
    is_double_major: boolean;
    is_active: boolean;
    students_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Level {
    id: number;
    code: string;
    name: string;
    numeric_order: number;
    is_active: boolean;
    students_count?: number;
    courses_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface Course {
    id: number;
    uuid: string;
    code: string;
    title: string;
    description?: string;
    credit_hours?: number;
    semester?: string;
    level?: string;
    level_id?: number;
    level_data?: {
        id: number;
        code: string;
        name: string;
    };
    academic_year?: string;
    department_id: number;
    is_active: boolean;

    // Nested department (from API)
    department?: {
        id: number;
        code: string;
        name: string;
    };

    // Relationship counts (from API)
    students_count?: number;
    lecturers_count?: number;
    exams_count?: number;
    questions_count?: number;

    // Lecturers (when included)
    lecturers?: Array<{
        id: number;
        full_name: string;
        email: string;
        staff_id?: string;
        role: string;
    }>;

    created_at?: string;
    updated_at?: string;
}

export interface Exam {
    id: number;
    uuid: string;
    course_id: number;
    created_by?: number;
    title: string;
    description?: string;
    instructions?: string;
    exam_type: 'semester' | 'practical';
    status: 'draft' | 'hod_review' | 'school_officer_review' | 'cbt_setup' | 'published' | 'grading' | 'grading_review' | 'results_published' | 'archived';
    start_time: string;
    end_time: string;
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
    total_questions: number;
    randomize_questions: boolean;
    randomize_options: boolean;
    questions_per_page: number;
    allow_backtrack: boolean;
    show_results_immediately: boolean;
    show_correct_answers: boolean;
    requires_password: boolean;
    results_status?: 'pending_grading' | 'grading_submitted' | 'grading_rejected' | 'results_verified' | 'results_published';
    is_practice: boolean;
    enable_proctoring: boolean;

    // Nested
    course?: { id: number; code: string; title: string; };
    creator?: { id: number; full_name: string; email: string; };
    questions?: ExamQuestion[];
    feedbacks?: ExamFeedback[];

    created_at?: string;
    updated_at?: string;
}

export interface ExamQuestion {
    id: number;
    question_id: number;
    question_order: number;
    points: number;
    is_required: boolean;
    question?: {
        id: number;
        question_text: string;
        question_type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'essay';
        options?: Array<{ key: string; value: string }>;
        correct_answer?: string | string[] | null;
        difficulty_level?: 'easy' | 'medium' | 'hard';
        topic?: string;
    };
}

export interface ExamFeedback {
    id: number;
    exam_id: number;
    user_id: number;
    recipient_id: number;
    stage: string;
    comments: string;
    resolved: boolean;
    created_at?: string;
    updated_at?: string;

    user?: { id: number; full_name: string; email: string; };
    recipient?: { id: number; full_name: string; email: string; };
}

export interface ExamStats {
    total: number;
    draft: number;
    pending_review: number;
    verified: number;
    published: number;
    completed: number;
    archived: number;
    practice: number;
    by_type: {
        quiz: number;
        midterm: number;
        final: number;
        makeup: number;
        practice: number;
    };
}

export interface Notification {
    id: number;
    user_id: number;
    type: string;
    title: string;
    message: string;
    related_entity_type?: string | null;
    related_entity_id?: number | null;
    is_read: boolean;
    read_at?: string | null;
    sent_via?: string[];
    created_at?: string;
}

export interface ExamResults {
    exam_id: number;
    exam_title: string;
    results_status: string;
    needs_manual_grading: boolean;
    ungraded_answers_count: number;
    total_students: number;
    completed: number;
    in_progress: number;
    avg_score: number | null;
    highest_score: number | null;
    lowest_score: number | null;
    pass_rate: number | null;
    results: Array<{
        session_id: number;
        student_id: number;
        student_name: string | null;
        student_email: string | null;
        status: string;
        total_score: number | null;
        percentage: number | null;
        passed: boolean | null;
        started_at?: string | null;
        submitted_at?: string | null;
    }>;
}

export interface PracticeSubmitResult {
    score: number;
    total_marks: number;
    percentage: number;
    passed: boolean;
    correct_count?: number;   // may be absent in old sessionStorage data
    total_questions?: number; // may be absent in old sessionStorage data
    results: Array<{
        question_id: number;
        question_text: string;
        question_type: string;
        your_answer: string | null;
        correct_answer: string | null;
        is_correct: boolean;
        points_awarded: number;
        points_possible?: number; // renamed from max_points in older responses
    }>;
}

export interface QuestionOption {
    key: string;
    value: string;
}

export interface Question {
    id: number;
    uuid: string;
    course_id: number;
    created_by: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'essay';
    options?: QuestionOption[];
    correct_answer?: string | string[] | null;
    has_correct_answer?: boolean;

    // Media
    has_image: boolean;
    image_url?: string;
    has_audio: boolean;
    audio_url?: string;

    // Configuration
    points: number;
    difficulty_level?: 'easy' | 'medium' | 'hard';

    // Categorization
    topic?: string;
    tags?: string[];

    // Analytics
    times_used: number;
    average_score?: number;

    // Status
    is_active: boolean;
    is_verified: boolean;
    verified_at?: string;

    // Nested (from API)
    course?: {
        id: number;
        code: string;
        title: string;
    };
    creator?: {
        id: number;
        full_name: string;
        email: string;
    };
    verifier?: {
        id: number;
        full_name: string;
    };

    created_at?: string;
    updated_at?: string;
}

