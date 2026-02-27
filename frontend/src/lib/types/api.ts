
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
    role: 'admin' | 'lecturer' | 'student' | 'edu_portal' | 'cbt';
    school_id?: number;
    department_id?: number;
    combination_id?: number;
    level_id?: number;
    staff_id?: string;
    student_id?: string;
    phone?: string;
    is_active?: boolean;
    is_hod?: boolean;
    is_school_exam_officer?: boolean;
    is_department_exam_officer?: boolean;
}

export interface UpdateUserData {
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    email?: string;
    password?: string;
    password_confirmation?: string;
    role?: 'admin' | 'lecturer' | 'student' | 'edu_portal' | 'cbt';
    school_id?: number;
    department_id?: number;
    combination_id?: number;
    level_id?: number;
    staff_id?: string;
    student_id?: string;
    phone?: string;
    is_active?: boolean;
    is_verified?: boolean;
    is_hod?: boolean;
    is_school_exam_officer?: boolean;
    is_department_exam_officer?: boolean;
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
/*  School Management (Edu Portal)                                     */
/* ------------------------------------------------------------------ */

export interface CreateSchoolData {
    code: string;
    name: string;
}

export interface UpdateSchoolData {
    code?: string;
    name?: string;
}

export interface SchoolFilters {
    search?: string;
    trashed?: '' | 'only' | 'with';
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

/* ------------------------------------------------------------------ */
/*  Department Management (Admin / Edu Portal)                         */
/* ------------------------------------------------------------------ */

export interface CreateDepartmentData {
    school_id: number;
    code: string;
    name: string;
    description?: string;
    is_active?: boolean;
}

export interface UpdateDepartmentData {
    school_id?: number;
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

/* ------------------------------------------------------------------ */
/*  Exam Management (Lecturer & Admin)                                  */
/* ------------------------------------------------------------------ */

export interface CreateExamData {
    course_id: number;
    title: string;
    description?: string;
    instructions?: string;
    exam_type: 'semester' | 'practical';
    start_time?: string;  // ISO datetime string — optional; admin sets for real exams, optional for practice
    end_time?: string;    // ISO datetime string — optional; admin sets for real exams, optional for practice
    duration_minutes: number;
    total_marks: number;
    passing_marks: number;
    randomize_questions?: boolean;
    randomize_options?: boolean;
    questions_per_page?: number;
    allow_backtrack?: boolean;
    show_results_immediately?: boolean;
    show_correct_answers?: boolean;
    requires_password?: boolean;
    exam_password?: string;
    is_practice?: boolean;
    enable_proctoring?: boolean;
}

export interface UpdateExamData {
    title?: string;
    description?: string;
    instructions?: string;
    exam_type?: 'semester' | 'practical';
    start_time?: string;
    end_time?: string;
    duration_minutes?: number;
    total_marks?: number;
    passing_marks?: number;
    randomize_questions?: boolean;
    randomize_options?: boolean;
    questions_per_page?: number;
    allow_backtrack?: boolean;
    show_results_immediately?: boolean;
    show_correct_answers?: boolean;
    requires_password?: boolean;
    exam_password?: string;
    is_practice?: boolean;
    enable_proctoring?: boolean;
}

export interface ExamFilters {
    search?: string;
    course_id?: number;
    exam_type?: string;
    status?: string;
    results_status?: string;
    is_practice?: string;
    trashed?: '' | 'only' | 'with';
    per_page?: number;
    page?: number;
    sort_by?: string;
    sort_dir?: 'asc' | 'desc';
}

export interface AddExamQuestionsData {
    questions: Array<{
        question_id: number;
        points: number;
        order?: number;
    }>;
}

export interface PracticeAnswerData {
    answers: Array<{
        question_id: number;
        answer: string | null;
    }>;
}

/* ------------------------------------------------------------------ */
/*  Offline Exam Entry                                                  */
/* ------------------------------------------------------------------ */

export interface OfflineEntryData {
    matric_number: string;
    access_code: string;
}

export interface OfflineEntryResult {
    session_id: number;
    session_uuid: string;
    token: string;
    exam: {
        id: number;
        uuid: string;
        title: string;
        course_code: string | null;
        course_title: string | null;
        duration_minutes: number;
        total_marks: number;
        total_questions: number;
        allow_backtrack: boolean;
        instructions: string | null;
    };
    student: {
        id: number;
        uuid: string;
        full_name: string;
        student_id: string | null;
    };
    resumed: boolean;
    time_remaining_seconds: number;
    current_question_index: number;
    questions_answered: number;
}

/* ------------------------------------------------------------------ */
/*  Exam Session — Active exam taking                                   */
/* ------------------------------------------------------------------ */

export interface ExamSessionStatus {
    session_id: number;
    session_uuid: string;
    status: string;
    time_remaining_seconds: number;
    current_question_index: number;
    total_questions: number;
    questions_answered: number;
    answered_question_ids: number[];
    flagged_question_ids: number[];
    exam: {
        id: number;
        title: string;
        course_code: string | null;
        course_title: string | null;
        duration_minutes: number;
        total_marks: number;
        allow_backtrack: boolean;
        instructions: string | null;
    };
}

export interface ExamSessionQuestion {
    index: number;
    total: number;
    question_id: number;
    question_text: string;
    question_type: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'essay';
    options: Array<{ key: string; value: string }> | null;
    image_url: string | null;
    points: number;
    saved_answer: {
        answer: string | string[] | null;
        is_flagged: boolean;
    } | null;
}

export interface ExamSessionQuestions {
    questions: ExamSessionQuestion[];
    total: number;
    time_remaining_seconds: number;
    allow_backtrack: boolean;
}

export interface SaveAnswerData {
    question_id: number;
    answer: string | null;
    is_flagged?: boolean;
}

export interface SaveAnswerResult {
    question_id: number;
    version: number;
    saved_at: string;
}

export interface BatchSaveAnswersData {
    answers: Array<{
        question_id: number;
        answer: string | null;
        is_flagged?: boolean;
    }>;
}

export interface BatchSaveAnswersResult {
    saved_count: number;
    saved: Array<{
        question_id: number;
        version: number;
    }>;
}

export interface ToggleFlagData {
    question_id: number;
}

export interface ToggleFlagResult {
    question_id: number;
    is_flagged: boolean;
}

export interface ExamSubmitResult {
    session_id: number;
    status: string;
    total_score: number;
    total_marks: number;
    percentage: number;
    passed: boolean;
    correct_count: number;
    total_questions: number;
    show_results: boolean;
    show_answers: boolean;
    results: Array<{
        question_id: number;
        question_text: string;
        question_type: string;
        your_answer: string | null;
        correct_answer: string | null;
        is_correct: boolean | null;
        points_awarded: number;
        points_possible: number;
    }>;
}

/* ------------------------------------------------------------------ */
/*  Manual Grading                                                      */
/* ------------------------------------------------------------------ */

export interface GradeAnswerData {
    points_awarded: number;
    feedback?: string;
}

export interface GradeAnswerResult {
    answer_id: number;
    points_awarded: number;
    max_points: number;
    is_correct: boolean;
    session_score: {
        total_score: number;
        percentage: number;
    };
}

export interface UngradedAnswer {
    id: number;
    question_id: number;
    question_text: string;
    question_type: 'fill_in_blank' | 'essay';
    answer_text: string | null;
    max_points: number;
    points_awarded: number;
    is_correct: boolean | null;
}

export interface GradingSession {
    session_id: number;
    student_id: number;
    student_name: string;
    student_matric: string | null;
    status: string;
    total_score: number;
    percentage: number;
    submitted_at: string;
    ungraded_answers: UngradedAnswer[];
    total_ungraded: number;
}

export interface ManualGradingResponse {
    exam_id: number;
    exam_title: string;
    course_code: string;
    total_sessions: number;
    sessions_needing_grading: number;
    sessions: GradingSession[];
}

export interface GradingSummary {
    total_sessions: number;
    sessions_needing_grading: number;
    sessions_fully_graded: number;
    total_ungraded_answers: number;
    results_status: string;
}

/* ------------------------------------------------------------------ */
/*  Student Results                                                     */
/* ------------------------------------------------------------------ */

export interface StudentExamResult {
    exam_id: number;
    exam_title: string;
    course_code: string;
    total_marks: number;
    passing_marks: number;
    student_score: number;
    percentage: number;
    passed: boolean;
    submitted_at: string;
    show_correct_answers: boolean;
    answers: Array<{
        question_id: number;
        question_text: string;
        question_type: string;
        your_answer: string | string[] | null;
        correct_answer: string | string[] | null;
        is_correct: boolean | null;
        points_awarded: number;
        points_possible: number;
    }>;
}

/* ------------------------------------------------------------------ */
/*  Analytics                                                           */
/* ------------------------------------------------------------------ */

export interface StudentPerformanceData {
    total_exams_taken: number;
    total_exams_passed: number;
    average_score: number | null;
    highest_score: number | null;
    lowest_score: number | null;
    pass_rate: number | null;
    enrolled_courses: number;
    upcoming_exams: number;
    recent_results: Array<{
        exam_id: number;
        exam_title: string;
        course_code: string;
        score: number;
        total_marks: number;
        percentage: number;
        passed: boolean;
        submitted_at: string;
    }>;
    score_trend: Array<{
        exam_id: number;
        exam_title: string;
        score: number;
        total_marks: number;
        date: string;
    }>;
    by_course: Array<{
        course_id: number;
        course_code: string;
        course_title: string;
        avg_score: number | null;
        exams_taken: number;
        exams_passed: number;
    }>;
}

export interface LecturerDashboardData {
    total_courses: number;
    total_questions: number;
    total_exams: number;
    total_students: number;
    published_exams: number;
    pending_grading: number;
    recent_exams: Array<{
        id: number;
        title: string;
        status: string;
        results_status: string | null;
        created_at: string;
    }>;
    course_performance: Array<{
        course_id: number;
        course_code: string;
        course_title: string;
        students: number;
        avg_score: number | null;
        exams_count: number;
    }>;
}

export interface CourseAnalyticsData {
    course_id: number;
    course_code: string;
    course_title: string;
    department: string | null;
    enrolled_students: number;
    total_questions: number;
    total_exams: number;
    total_sessions: number;
    average_score: number | null;
    pass_rate: number | null;
    score_distribution: Array<{ range: string; count: number }>;
    exams: Array<{
        exam_id: number;
        exam_title: string;
        exam_type: string;
        status: string;
        sessions: number;
        avg_score: number | null;
        pass_rate: number | null;
    }>;
}

export interface ExamAnalyticsData {
    exam_id: number;
    exam_title: string;
    course_code: string | null;
    course_title: string | null;
    exam_type: string;
    total_marks: number;
    passing_marks: number;
    total_sessions: number;
    average_score: number | null;
    highest_score: number | null;
    lowest_score: number | null;
    pass_count: number;
    fail_count: number;
    pass_rate: number | null;
    score_distribution: Array<{ range: string; count: number }>;
    question_analysis: Array<{
        question_id: number;
        question_text: string;
        question_type: string;
        difficulty_level: string | null;
        max_points: number;
        total_attempts: number;
        correct_count: number;
        accuracy_rate: number;
        avg_points: number;
        avg_time_seconds: number | null;
    }>;
}

export interface SystemAnalyticsData {
    total_users: number;
    total_students: number;
    total_lecturers: number;
    total_admins: number;
    active_users: number;
    total_courses: number;
    total_exams: number;
    total_questions: number;
    total_sessions: number;
    exams_by_status: Record<string, number>;
    completion_rate: number | null;
    average_score: number | null;
    daily_activity: Array<{
        date: string;
        logins: number;
        exams_taken: number;
    }>;
    recent_activity: Array<{
        id: number;
        action: string;
        user_name: string;
        user_role: string | null;
        entity_type: string | null;
        created_at: string;
    }>;
}

