<?php

namespace App\Http\Controllers\Api\V1\ExamSession;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Http\Requests\ExamSession\OfflineEntryRequest;
use App\Models\ActivityLog;
use App\Models\CourseEnrollment;
use App\Models\Exam;
use App\Models\ExamAccessCode;
use App\Models\ExamSession;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class OfflineEntryController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  start — Authenticate student + auto-detect exam + start session    */
    /* ------------------------------------------------------------------ */

    public function start(OfflineEntryRequest $request): JsonResponse
    {
        $matricNumber = trim($request->input('matric_number'));
        $accessCode   = trim($request->input('access_code'));

        /* ---------- 1. Find the student by matric number ---------- */

        $student = User::where('student_id', $matricNumber)
            ->where('role', 'student')
            ->first();

        if (! $student) {
            return ResponseHelper::error('No student found with this matric number.', 404);
        }

        if (! $student->is_active) {
            return ResponseHelper::error('This student account has been deactivated. Contact your administrator.', 403);
        }

        if (! $student->password) {
            return ResponseHelper::error('This account has not been activated yet. Please activate your account first.', 403);
        }

        /* ---------- 2. Validate the access code ---------- */

        $codeRecord = ExamAccessCode::where('access_code', $accessCode)
            ->where('student_id', $student->id)
            ->first();

        if (! $codeRecord) {
            return ResponseHelper::error('Invalid access code for this student.', 403);
        }

        if (! $codeRecord->isValid()) {
            return ResponseHelper::error('Your exam access code has expired or been deactivated. Contact your administrator.', 403);
        }

        // Mark as activated on first use
        if (! $codeRecord->activated_at) {
            $codeRecord->update(['activated_at' => now()]);
        }

        /* ---------- 3. Auto-detect the current exam ---------- */

        // Get courses the student is enrolled in
        $enrolledCourseIds = CourseEnrollment::where('student_id', $student->id)
            ->where('status', 'active')
            ->pluck('course_id')
            ->toArray();

        if (empty($enrolledCourseIds)) {
            return ResponseHelper::error('You are not enrolled in any courses.', 403);
        }

        // Find published, non-practice exams currently within their time window
        $exam = Exam::with('course')
            ->whereIn('course_id', $enrolledCourseIds)
            ->where('status', 'published')
            ->where('is_practice', false)
            ->where('start_time', '<=', now())
            ->where('end_time', '>=', now())
            ->first();

        if (! $exam) {
            return ResponseHelper::error('No exam is currently available for you. Please confirm with your invigilator.', 404);
        }

        /* ---------- 4. Check for existing session ---------- */

        $existingSession = ExamSession::where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->first();

        if ($existingSession) {
            // Already submitted — cannot retake
            if ($existingSession->isSubmitted()) {
                return ResponseHelper::error('You have already submitted this exam.', 409);
            }

            // In-progress or interrupted — allow resume
            if ($existingSession->isInProgress() || $existingSession->isInterrupted()) {
                if ($existingSession->isTimedOut()) {
                    return ResponseHelper::error('Your exam session has timed out.', 403);
                }

                // Issue a fresh short-lived Sanctum token
                $token = $student->createToken(
                    'offline-exam-session',
                    ['exam-session'],
                    now()->addMinutes($exam->duration_minutes + 30)
                )->plainTextToken;

                $existingSession->update([
                    'status'           => 'in_progress',
                    'last_activity_at' => now(),
                    'ip_address'       => $request->ip(),
                    'user_agent'       => $request->userAgent(),
                ]);

                ActivityLog::create([
                    'user_id'     => $student->id,
                    'session_id'  => $existingSession->id,
                    'action'      => 'exam_session_resumed',
                    'entity_type' => 'exam_session',
                    'entity_id'   => $existingSession->id,
                    'description' => "Student resumed exam session via offline entry",
                    'metadata'    => ['ip' => $request->ip()],
                ]);

                return ResponseHelper::success([
                    'session_id'    => $existingSession->id,
                    'session_uuid'  => $existingSession->uuid,
                    'token'         => $token,
                    'exam'          => $this->formatExamData($exam),
                    'student'       => $this->formatStudentData($student),
                    'resumed'       => true,
                    'time_remaining_seconds' => $existingSession->getTimeRemainingSeconds(),
                    'current_question_index' => $existingSession->current_question_index,
                    'questions_answered'     => $existingSession->questions_answered,
                ], 'Exam session resumed successfully');
            }
        }

        /* ---------- 5. Create new session ---------- */

        $questionIds = $exam->examQuestions()
            ->orderBy('question_order')
            ->pluck('question_id')
            ->toArray();

        if ($exam->randomize_questions) {
            shuffle($questionIds);
        }

        $session = ExamSession::create([
            'exam_id'                => $exam->id,
            'student_id'             => $student->id,
            'started_at'             => now(),
            'scheduled_end_time'     => now()->addMinutes($exam->duration_minutes),
            'question_sequence'      => $questionIds,
            'current_question_index' => 0,
            'questions_answered'     => 0,
            'status'                 => 'in_progress',
            'last_activity_at'       => now(),
            'ip_address'             => $request->ip(),
            'user_agent'             => $request->userAgent(),
        ]);

        $token = $student->createToken(
            'offline-exam-session',
            ['exam-session'],
            now()->addMinutes($exam->duration_minutes + 30)
        )->plainTextToken;

        ActivityLog::create([
            'user_id'     => $student->id,
            'session_id'  => $session->id,
            'action'      => 'exam_session_started',
            'entity_type' => 'exam_session',
            'entity_id'   => $session->id,
            'description' => "Student started exam via offline entry (semester access code)",
            'metadata'    => [
                'ip'              => $request->ip(),
                'exam_id'         => $exam->id,
                'access_code_id'  => $codeRecord->id,
            ],
        ]);

        return ResponseHelper::success([
            'session_id'    => $session->id,
            'session_uuid'  => $session->uuid,
            'token'         => $token,
            'exam'          => $this->formatExamData($exam),
            'student'       => $this->formatStudentData($student),
            'resumed'       => false,
            'time_remaining_seconds' => $session->getTimeRemainingSeconds(),
            'current_question_index' => 0,
            'questions_answered'     => 0,
        ], 'Exam session started successfully', 201);
    }

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                            */
    /* ------------------------------------------------------------------ */

    private function formatExamData(Exam $exam): array
    {
        return [
            'id'               => $exam->id,
            'uuid'             => $exam->uuid,
            'title'            => $exam->title,
            'course_code'      => $exam->course?->code,
            'course_title'     => $exam->course?->title,
            'duration_minutes' => $exam->duration_minutes,
            'total_marks'      => (float) $exam->total_marks,
            'total_questions'  => $exam->examQuestions()->count(),
            'allow_backtrack'  => $exam->allow_backtrack,
            'instructions'     => $exam->instructions,
        ];
    }

    private function formatStudentData(User $student): array
    {
        return [
            'id'         => $student->id,
            'uuid'       => $student->uuid,
            'full_name'  => $student->full_name,
            'student_id' => $student->student_id,
        ];
    }
}
