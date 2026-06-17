<?php

namespace App\Services\Analytics;

use App\Models\ActivityLog;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CourseLecturer;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\Question;
use App\Models\StudentAnswer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /* ------------------------------------------------------------------ */
    /*  Student Performance                                                */
    /* ------------------------------------------------------------------ */

    /**
     * Get performance analytics for a student.
     *
     * @param  User  $student
     * @return array
     */
    public function getStudentPerformance(User $student): array
    {
        // Get all submitted sessions for this student
        $sessions = ExamSession::where('student_id', $student->id)
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->with(['exam:id,title,course_id,passing_marks,total_marks,is_practice', 'exam.course:id,code,title'])
            ->orderBy('submitted_at', 'desc')
            ->get();

        // Filter out practice exams for main stats
        $realSessions = $sessions->filter(fn ($s) => !$s->exam?->is_practice);

        // Calculate stats
        $totalExamsTaken = $realSessions->count();
        $totalExamsPassed = $realSessions->filter(fn ($s) =>
            $s->total_score !== null && $s->exam && $s->total_score >= $s->exam->passing_marks
        )->count();

        $scores = $realSessions->pluck('percentage')->filter(fn ($v) => $v !== null);
        $averageScore = $scores->count() > 0 ? round($scores->avg(), 1) : null;
        $highestScore = $scores->count() > 0 ? round($scores->max(), 1) : null;
        $lowestScore = $scores->count() > 0 ? round($scores->min(), 1) : null;
        $passRate = $totalExamsTaken > 0 ? round(($totalExamsPassed / $totalExamsTaken) * 100, 1) : null;

        // Enrolled courses
        $enrolledCourses = CourseEnrollment::where('student_id', $student->id)
            ->where('status', 'active')
            ->count();

        // Upcoming exams (published, not practice, in the future, course enrolled)
        $enrolledCourseIds = CourseEnrollment::where('student_id', $student->id)
            ->where('status', 'active')
            ->pluck('course_id');

        $upcomingExams = Exam::where('status', 'published')
            ->where('is_practice', false)
            ->whereIn('course_id', $enrolledCourseIds)
            ->where('start_time', '>', now())
            ->count();

        // Score trend (last 20 real exams chronologically)
        $scoreTrend = $realSessions->take(20)->reverse()->values()->map(fn ($s) => [
            'exam_id'    => $s->exam_id,
            'exam_title' => $s->exam?->title ?? 'Unknown',
            'score'      => round((float) $s->percentage, 1),
            'total_marks' => $s->exam?->total_marks,
            'date'       => $s->submitted_at?->toIso8601String(),
        ])->values()->toArray();

        // Per-course performance
        $byCourse = $realSessions->groupBy(fn ($s) => $s->exam?->course_id)
            ->map(function ($group, $courseId) {
                $course = $group->first()->exam?->course;
                $courseScores = $group->pluck('percentage')->filter(fn ($v) => $v !== null);
                return [
                    'course_id'   => $courseId,
                    'course_code' => $course?->code ?? 'N/A',
                    'course_title' => $course?->title ?? 'Unknown',
                    'avg_score'   => $courseScores->count() > 0 ? round($courseScores->avg(), 1) : null,
                    'exams_taken' => $group->count(),
                    'exams_passed' => $group->filter(fn ($s) =>
                        $s->total_score !== null && $s->exam && $s->total_score >= $s->exam->passing_marks
                    )->count(),
                ];
            })->values()->toArray();

        // Recent results (last 5)
        $recentResults = $realSessions->take(5)->map(fn ($s) => [
            'exam_id'     => $s->exam_id,
            'exam_title'  => $s->exam?->title ?? 'Unknown',
            'course_code' => $s->exam?->course?->code ?? 'N/A',
            'score'       => round((float) $s->total_score, 1),
            'total_marks' => $s->exam?->total_marks,
            'percentage'  => round((float) $s->percentage, 1),
            'passed'      => $s->total_score !== null && $s->exam && $s->total_score >= $s->exam->passing_marks,
            'submitted_at' => $s->submitted_at?->toIso8601String(),
        ])->values()->toArray();

        return [
            'total_exams_taken'  => $totalExamsTaken,
            'total_exams_passed' => $totalExamsPassed,
            'average_score'      => $averageScore,
            'highest_score'      => $highestScore,
            'lowest_score'       => $lowestScore,
            'pass_rate'          => $passRate,
            'enrolled_courses'   => $enrolledCourses,
            'upcoming_exams'     => $upcomingExams,
            'recent_results'     => $recentResults,
            'score_trend'        => $scoreTrend,
            'by_course'          => $byCourse,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Course Analytics                                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Get analytics for a specific course.
     *
     * @param  int   $courseId
     * @param  User  $user
     * @return array
     */
    public function getCourseAnalytics(int $courseId, User $user): array
    {
        $course = Course::with('department:id,code,name')->findOrFail($courseId);

        // Ownership check for lecturers
        if ($user->role === 'lecturer') {
            $isAssigned = CourseLecturer::where('course_id', $courseId)
                ->where('lecturer_id', $user->id)
                ->exists();
            if (!$isAssigned) {
                abort(403, 'You are not assigned to this course.');
            }
        }

        $enrolledStudents = CourseEnrollment::where('course_id', $courseId)
            ->where('status', 'active')
            ->count();

        $totalQuestions = Question::where('course_id', $courseId)->where('is_active', true)->count();

        $exams = Exam::where('course_id', $courseId)
            ->where('is_practice', false)
            ->get();

        $examIds = $exams->pluck('id');

        // Sessions for this course's exams
        $sessions = ExamSession::whereIn('exam_id', $examIds)
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->get();

        $allScores = $sessions->pluck('percentage')->filter(fn ($v) => $v !== null);
        $avgScore = $allScores->count() > 0 ? round($allScores->avg(), 1) : null;
        $passCount = $sessions->filter(function ($s) use ($exams) {
            $exam = $exams->firstWhere('id', $s->exam_id);
            return $s->total_score !== null && $exam && $s->total_score >= $exam->passing_marks;
        })->count();
        $passRate = $sessions->count() > 0 ? round(($passCount / $sessions->count()) * 100, 1) : null;

        // Score distribution (histogram buckets: 0-9, 10-19, ..., 90-100)
        $distribution = array_fill(0, 10, 0);
        foreach ($allScores as $score) {
            $bucket = min(9, (int) floor($score / 10));
            $distribution[$bucket]++;
        }
        $scoreDistribution = [];
        for ($i = 0; $i < 10; $i++) {
            $label = $i === 9 ? '90-100' : ($i * 10) . '-' . ($i * 10 + 9);
            $scoreDistribution[] = ['range' => $label, 'count' => $distribution[$i]];
        }

        // Per-exam breakdown
        $perExam = $exams->map(function ($exam) use ($sessions) {
            $examSessions = $sessions->where('exam_id', $exam->id);
            $examScores = $examSessions->pluck('percentage')->filter(fn ($v) => $v !== null);
            return [
                'exam_id'    => $exam->id,
                'exam_title' => $exam->title,
                'exam_type'  => $exam->exam_type,
                'status'     => $exam->status,
                'sessions'   => $examSessions->count(),
                'avg_score'  => $examScores->count() > 0 ? round($examScores->avg(), 1) : null,
                'pass_rate'  => $examSessions->count() > 0
                    ? round(
                        ($examSessions->filter(fn ($s) => $s->total_score !== null && $s->total_score >= $exam->passing_marks)->count() / $examSessions->count()) * 100,
                        1
                    )
                    : null,
            ];
        })->values()->toArray();

        return [
            'course_id'          => $course->id,
            'course_code'        => $course->code,
            'course_title'       => $course->title,
            'department'         => $course->department?->name,
            'enrolled_students'  => $enrolledStudents,
            'total_questions'    => $totalQuestions,
            'total_exams'        => $exams->count(),
            'total_sessions'     => $sessions->count(),
            'average_score'      => $avgScore,
            'pass_rate'          => $passRate,
            'score_distribution' => $scoreDistribution,
            'exams'              => $perExam,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Exam Analytics                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * Get detailed analytics for a specific exam.
     *
     * @param  int   $examId
     * @param  User  $user
     * @return array
     */
    public function getExamAnalytics(int $examId, User $user): array
    {
        $exam = Exam::with(['course:id,code,title'])->findOrFail($examId);

        // Ownership check for lecturers
        if ($user->role === 'lecturer' && $exam->created_by !== $user->id) {
            abort(403, 'Access denied.');
        }

        $sessions = ExamSession::where('exam_id', $examId)
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->get();

        $allScores = $sessions->pluck('percentage')->filter(fn ($v) => $v !== null);

        // Per-question analysis
        $questionAnalysis = DB::table('student_answers')
            ->join('exam_sessions', 'student_answers.session_id', '=', 'exam_sessions.id')
            ->join('questions', 'student_answers.question_id', '=', 'questions.id')
            ->join('exam_questions', function ($join) use ($examId) {
                $join->on('student_answers.question_id', '=', 'exam_questions.question_id')
                     ->where('exam_questions.exam_id', '=', $examId);
            })
            ->where('exam_sessions.exam_id', $examId)
            ->whereIn('exam_sessions.status', ['submitted', 'auto_submitted'])
            ->where('student_answers.is_final', true)
            ->select(
                'student_answers.question_id',
                'questions.question_text',
                'questions.question_type',
                'questions.difficulty_level',
                'exam_questions.points',
                DB::raw('COUNT(*) as total_attempts'),
                DB::raw('SUM(CASE WHEN student_answers.is_correct = 1 THEN 1 ELSE 0 END) as correct_count'),
                DB::raw('AVG(student_answers.points_awarded) as avg_points'),
                DB::raw('AVG(student_answers.time_spent_seconds) as avg_time_seconds')
            )
            ->groupBy(
                'student_answers.question_id',
                'questions.question_text',
                'questions.question_type',
                'questions.difficulty_level',
                'exam_questions.points'
            )
            ->orderBy('exam_questions.points', 'desc')
            ->get()
            ->map(fn ($q) => [
                'question_id'      => $q->question_id,
                'question_text'    => \Illuminate\Support\Str::limit($q->question_text, 100),
                'question_type'    => $q->question_type,
                'difficulty_level' => $q->difficulty_level,
                'max_points'       => (float) $q->points,
                'total_attempts'   => (int) $q->total_attempts,
                'correct_count'    => (int) $q->correct_count,
                'accuracy_rate'    => $q->total_attempts > 0
                    ? round(($q->correct_count / $q->total_attempts) * 100, 1)
                    : 0,
                'avg_points'       => round((float) $q->avg_points, 2),
                'avg_time_seconds' => $q->avg_time_seconds !== null ? round((float) $q->avg_time_seconds) : null,
            ])->toArray();

        // Score distribution
        $distribution = array_fill(0, 10, 0);
        foreach ($allScores as $score) {
            $bucket = min(9, (int) floor($score / 10));
            $distribution[$bucket]++;
        }
        $scoreDistribution = [];
        for ($i = 0; $i < 10; $i++) {
            $label = $i === 9 ? '90-100' : ($i * 10) . '-' . ($i * 10 + 9);
            $scoreDistribution[] = ['range' => $label, 'count' => $distribution[$i]];
        }

        return [
            'exam_id'            => $exam->id,
            'exam_title'         => $exam->title,
            'course_code'        => $exam->course?->code,
            'course_title'       => $exam->course?->title,
            'exam_type'          => $exam->exam_type,
            'total_marks'        => $exam->total_marks,
            'passing_marks'      => $exam->passing_marks,
            'total_sessions'     => $sessions->count(),
            'average_score'      => $allScores->count() > 0 ? round($allScores->avg(), 1) : null,
            'highest_score'      => $allScores->count() > 0 ? round($allScores->max(), 1) : null,
            'lowest_score'       => $allScores->count() > 0 ? round($allScores->min(), 1) : null,
            'pass_count'         => $sessions->filter(fn ($s) => $s->total_score !== null && $s->total_score >= $exam->passing_marks)->count(),
            'fail_count'         => $sessions->filter(fn ($s) => $s->total_score !== null && $s->total_score < $exam->passing_marks)->count(),
            'pass_rate'          => $sessions->count() > 0
                ? round(($sessions->filter(fn ($s) => $s->total_score !== null && $s->total_score >= $exam->passing_marks)->count() / $sessions->count()) * 100, 1)
                : null,
            'score_distribution' => $scoreDistribution,
            'question_analysis'  => $questionAnalysis,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Lecturer Dashboard                                                  */
    /* ------------------------------------------------------------------ */

    /**
     * Get dashboard analytics for a lecturer.
     *
     * @param  User  $lecturer
     * @return array
     */
    public function getLecturerDashboard(User $lecturer): array
    {
        // Total courses assigned to this lecturer
        $courseIds = CourseLecturer::where('lecturer_id', $lecturer->id)->pluck('course_id');
        $totalCourses = $courseIds->count();

        // Total questions created
        $totalQuestions = Question::where('created_by', $lecturer->id)->count();

        // Total exams created
        $exams = Exam::where('created_by', $lecturer->id)->get();
        $totalExams = $exams->count();

        // Total unique students across courses
        $totalStudents = CourseEnrollment::whereIn('course_id', $courseIds)
            ->where('status', 'active')
            ->distinct('student_id')
            ->count('student_id');

        // Published exams
        $publishedExams = $exams->where('status', 'published')->count();

        // Exams needing grading
        $pendingGrading = $exams->filter(fn ($e) =>
            in_array($e->results_status, ['pending_grading'])
        )->count();

        // Recent exams (last 5)
        $recentExams = $exams->sortByDesc('created_at')->take(5)->map(fn ($e) => [
            'id'     => $e->id,
            'title'  => $e->title,
            'status' => $e->status,
            'results_status' => $e->results_status,
            'created_at' => $e->created_at?->toIso8601String(),
        ])->values()->toArray();

        // Course performance — avg score per course
        $coursePerformance = [];
        foreach ($courseIds as $courseId) {
            $course = Course::select('id', 'code', 'title')->find($courseId);
            if (!$course) continue;

            $examIdsForCourse = $exams->where('course_id', $courseId)->pluck('id');
            $sessions = ExamSession::whereIn('exam_id', $examIdsForCourse)
                ->whereIn('status', ['submitted', 'auto_submitted'])
                ->get();

            $scores = $sessions->pluck('percentage')->filter(fn ($v) => $v !== null);
            $studentsInCourse = CourseEnrollment::where('course_id', $courseId)
                ->where('status', 'active')
                ->count();

            $coursePerformance[] = [
                'course_id'   => $course->id,
                'course_code' => $course->code,
                'course_title' => $course->title,
                'students'    => $studentsInCourse,
                'avg_score'   => $scores->count() > 0 ? round($scores->avg(), 1) : null,
                'exams_count' => $examIdsForCourse->count(),
            ];
        }

        return [
            'total_courses'      => $totalCourses,
            'total_questions'    => $totalQuestions,
            'total_exams'        => $totalExams,
            'total_students'     => $totalStudents,
            'published_exams'    => $publishedExams,
            'pending_grading'    => $pendingGrading,
            'recent_exams'       => $recentExams,
            'course_performance' => $coursePerformance,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  System Analytics (Admin)                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Get system-wide analytics for admin dashboard.
     *
     * @param  User  $admin
     * @return array
     */
    public function getSystemAnalytics(User $admin): array
    {
        // User counts
        $totalUsers = User::count();
        $totalStudents = User::where('role', 'student')->count();
        $totalLecturers = User::where('role', 'lecturer')->count();
        $totalAdmins = User::where('role', 'admin')->count();
        $totalCbt = User::where('role', 'cbt')->count();
        $totalEduPortal = User::where('role', 'edu_portal')->count();
        $activeUsers = User::where('is_active', true)->count();

        // Content counts
        $totalCourses = Course::count();
        $totalExams = Exam::count();
        $totalQuestions = Question::count();
        $totalSessions = ExamSession::count();

        // Exam status breakdown
        $examsByStatus = Exam::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        // Session stats
        $completedSessions = ExamSession::whereIn('status', ['submitted', 'auto_submitted'])->count();
        $completionRate = $totalSessions > 0
            ? round(($completedSessions / $totalSessions) * 100, 1)
            : null;

        // Average score across all submitted sessions
        $averageScore = ExamSession::whereIn('status', ['submitted', 'auto_submitted'])
            ->whereNotNull('percentage')
            ->avg('percentage');
        $averageScore = $averageScore !== null ? round($averageScore, 1) : null;

        // Daily activity (last 30 days)
        $dailyActivity = [];
        for ($i = 29; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $dayStart = now()->subDays($i)->startOfDay();
            $dayEnd = now()->subDays($i)->endOfDay();

            $logins = ActivityLog::where('action', 'login')
                ->whereBetween('created_at', [$dayStart, $dayEnd])
                ->count();

            $examsTaken = ExamSession::whereBetween('started_at', [$dayStart, $dayEnd])
                ->count();

            $dailyActivity[] = [
                'date'       => $date,
                'logins'     => $logins,
                'exams_taken' => $examsTaken,
            ];
        }

        // Recent activity (last 10)
        $recentActivity = ActivityLog::with('user:id,first_name,last_name,email,role')
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get()
            ->map(fn ($log) => [
                'id'          => $log->id,
                'action'      => $log->action,
                'user_name'   => $log->user ? $log->user->first_name . ' ' . $log->user->last_name : 'System',
                'user_role'   => $log->user?->role,
                'entity_type' => $log->entity_type,
                'created_at'  => $log->created_at?->toIso8601String(),
            ])->toArray();

        return [
            'total_users'      => $totalUsers,
            'total_students'   => $totalStudents,
            'total_lecturers'  => $totalLecturers,
            'total_admins'     => $totalAdmins,
            'total_cbt'        => $totalCbt,
            'total_edu_portal' => $totalEduPortal,
            'active_users'     => $activeUsers,
            'total_courses'    => $totalCourses,
            'total_exams'      => $totalExams,
            'total_questions'  => $totalQuestions,
            'total_sessions'   => $totalSessions,
            'exams_by_status'  => $examsByStatus,
            'completion_rate'  => $completionRate,
            'average_score'    => $averageScore,
            'daily_activity'   => $dailyActivity,
            'recent_activity'  => $recentActivity,
        ];
    }
}
