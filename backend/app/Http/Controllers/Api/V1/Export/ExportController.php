<?php

namespace App\Http\Controllers\Api\V1\Export;

use App\Exports\EnrollmentListExport;
use App\Exports\ResultsExport;
use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;

class ExportController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/exports/students/{id}/transcript                       */
    /* ------------------------------------------------------------------ */

    /**
     * Generate a PDF transcript for a student's exam results.
     *
     * Auth: admin, edu_portal, or the student themselves.
     *
     * @param  int      $id
     * @param  Request  $request
     * @return Response|JsonResponse
     */
    public function studentTranscript(string $id, Request $request): Response|JsonResponse
    {
        $authUser = $request->user();

        $student = User::with(['department.school', 'combination', 'level'])
            ->where('uuid', $id)
            ->firstOrFail();

        // Students can only access their own transcript
        if ($authUser->role === 'student' && $authUser->id !== $student->id) {
            return ResponseHelper::error('You can only view your own transcript.', 403);
        }

        if ($student->role !== 'student') {
            return ResponseHelper::error('The requested user is not a student.', 422);
        }

        // Fetch completed exam sessions with related data
        $sessions = ExamSession::query()
            ->where('student_id', $student->id)
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->with(['exam.course.department'])
            ->orderByDesc('submitted_at')
            ->get();

        $results = $sessions->map(function (ExamSession $session) {
            $score      = (float) ($session->total_score ?? 0);
            $totalMarks = (float) ($session->exam?->total_marks ?? 0);
            $percentage = $totalMarks > 0 ? round(($score / $totalMarks) * 100, 2) : 0;
            $grade      = $this->calculateGrade($percentage);
            $passed     = $score >= (float) ($session->exam?->passing_marks ?? $totalMarks * 0.5);

            return [
                'exam_title'    => $session->exam?->title,
                'course_code'   => $session->exam?->course?->code,
                'course_title'  => $session->exam?->course?->title,
                'score'         => $score,
                'total_marks'   => $totalMarks,
                'percentage'    => $percentage,
                'grade'         => $grade,
                'passed'        => $passed,
                'submitted_at'  => $session->submitted_at?->format('Y-m-d'),
            ];
        });

        $pdf = Pdf::loadView('exports.student-transcript', [
            'student'     => $student,
            'results'     => $results,
            'generatedAt' => now()->format('Y-m-d H:i:s'),
        ]);

        $filename = "transcript_{$student->student_id}_" . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }

    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/exports/exams/{id}/results/pdf                         */
    /* ------------------------------------------------------------------ */

    /**
     * Generate a PDF summary of results for an exam.
     *
     * Auth: admin, edu_portal, or exam officers (lecturer role).
     *
     * @param  int      $id
     * @param  Request  $request
     * @return Response|JsonResponse
     */
    public function examResultsPdf(string $id, Request $request): Response|JsonResponse
    {
        $authUser = $request->user();
        $exam     = Exam::with(['course.department.school', 'creator'])->where('uuid', $id)->firstOrFail();

        // Lecturers can only export results for their own exams
        if ($authUser->role === 'lecturer' && $exam->created_by !== $authUser->id) {
            // Check if they're an officer for this department/school
            $isOfficer = ($authUser->is_department_exam_officer && $authUser->department_id === $exam->course?->department_id)
                || ($authUser->is_school_exam_officer);

            if (! $isOfficer) {
                return ResponseHelper::error(
                    'You do not have permission to export results for this exam.',
                    403
                );
            }
        }

        $sessions = ExamSession::query()
            ->where('exam_id', $exam->id)
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->with(['student'])
            ->orderByDesc('total_score')
            ->get();

        $totalMarks = (float) ($exam->total_marks ?? 0);

        $results = $sessions->map(function (ExamSession $session) use ($totalMarks, $exam) {
            $score      = (float) ($session->total_score ?? 0);
            $percentage = $totalMarks > 0 ? round(($score / $totalMarks) * 100, 2) : 0;
            $grade      = $this->calculateGrade($percentage);
            $passed     = $score >= (float) ($exam->passing_marks ?? $totalMarks * 0.5);

            return [
                'student_name'  => $session->student?->full_name,
                'matric_no'     => $session->student?->student_id,
                'score'         => $score,
                'percentage'    => $percentage,
                'grade'         => $grade,
                'passed'        => $passed,
            ];
        });

        // Summary stats
        $scores     = $results->pluck('score');
        $meanScore  = $scores->count() > 0 ? round($scores->avg(), 2) : 0;
        $highScore  = $scores->max() ?? 0;
        $lowScore   = $scores->min() ?? 0;
        $passCount  = $results->where('passed', true)->count();
        $passRate   = $results->count() > 0 ? round(($passCount / $results->count()) * 100, 1) : 0;

        $summary = [
            'total_students' => $results->count(),
            'mean_score'     => $meanScore,
            'highest_score'  => $highScore,
            'lowest_score'   => $lowScore,
            'pass_rate'      => $passRate,
        ];

        $pdf = Pdf::loadView('exports.exam-results', [
            'exam'        => $exam,
            'results'     => $results,
            'summary'     => $summary,
            'generatedAt' => now()->format('Y-m-d H:i:s'),
        ]);

        $safeTitle = preg_replace('/[^A-Za-z0-9_\-]/', '_', $exam->title ?? 'exam');
        $filename  = "results_{$safeTitle}_" . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }

    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/exports/enrollments                                    */
    /* ------------------------------------------------------------------ */

    /**
     * Export student enrollment list as Excel.
     *
     * Query params: course_id, department_id, school_id
     * Auth: admin, edu_portal
     *
     * @param  Request  $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
     */
    public function enrollmentList(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $filters  = $request->only(['course_id', 'department_id', 'school_id']);
        $filename = 'enrollments_' . now()->format('Ymd_His') . '.xlsx';

        return Excel::download(new EnrollmentListExport($filters), $filename);
    }

    /* ------------------------------------------------------------------ */
    /*  GET /api/v1/exports/results                                        */
    /* ------------------------------------------------------------------ */

    /**
     * Export exam results as Excel.
     *
     * Query params: exam_id, department_id, school_id
     * Auth: admin, edu_portal, lecturer
     *
     * @param  Request  $request
     * @return \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
     */
    public function resultsExport(Request $request): \Symfony\Component\HttpFoundation\BinaryFileResponse|JsonResponse
    {
        $authUser = $request->user();
        $filters  = $request->only(['exam_id', 'department_id', 'school_id']);

        // Resolve exam UUID to integer ID for downstream queries
        if (! empty($filters['exam_id'])) {
            $exam = Exam::where('uuid', $filters['exam_id'])->first();
            if ($exam) {
                $filters['exam_id'] = $exam->id;
            }
        }

        if ($authUser->role === 'lecturer') {
            if (! empty($filters['exam_id']) && isset($exam) && $exam) {
                if ($exam->created_by !== $authUser->id) {
                    $isOfficer = $authUser->is_department_exam_officer || $authUser->is_school_exam_officer;
                    if (! $isOfficer) {
                        return ResponseHelper::error(
                            'You do not have permission to export results for this exam.',
                            403
                        );
                    }
                }
            } elseif (empty($filters['exam_id'])) {
                // Lecturers MUST specify exam_id unless they are an officer
                $isOfficer = $authUser->is_department_exam_officer || $authUser->is_school_exam_officer;
                if (! $isOfficer) {
                    return ResponseHelper::error(
                        'Please specify an exam_id to export results.',
                        422
                    );
                }
                // Officers without exam_id are scoped to their department/school
                if ($authUser->is_department_exam_officer && empty($filters['department_id'])) {
                    $filters['department_id'] = $authUser->department_id;
                }
            }
        }

        $filename = 'results_' . now()->format('Ymd_His') . '.xlsx';

        return Excel::download(new ResultsExport($filters), $filename);
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    /**
     * Calculate letter grade from percentage score.
     *
     * Grade scale: A=70-100, B=60-69, C=50-59, D=45-49, F=0-44
     */
    private function calculateGrade(float $percentage): string
    {
        return match (true) {
            $percentage >= 70 => 'A',
            $percentage >= 60 => 'B',
            $percentage >= 50 => 'C',
            $percentage >= 45 => 'D',
            default           => 'F',
        };
    }
}
