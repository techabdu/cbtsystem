<?php

namespace App\Http\Controllers\Api\V1\Exam;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\CourseEnrollment;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\StudentAnswer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class PracticeExamController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  Index — List published practice exams for enrolled courses         */
    /* ------------------------------------------------------------------ */

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get course IDs the student is actively enrolled in
        $enrolledCourseIds = CourseEnrollment::where('student_id', $user->id)
            ->where('status', 'active')
            ->pluck('course_id')
            ->toArray();

        $query = Exam::with(['course'])
            ->withCount('examQuestions')
            ->whereIn('course_id', $enrolledCourseIds)
            ->where('status', 'published')
            ->where('is_practice', true);

        // --- Course filter ---
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->input('course_id'));
        }

        $query->orderBy('created_at', 'desc');

        $perPage = min((int) ($request->input('per_page', 20)), 100);
        $paginator = $query->paginate($perPage);

        $items = $paginator->getCollection()->map(function (Exam $exam) {
            return [
                'id'               => $exam->id,
                'uuid'             => $exam->uuid,
                'title'            => $exam->title,
                'description'      => $exam->description,
                'exam_type'        => $exam->exam_type,
                'duration_minutes' => $exam->duration_minutes,
                'total_marks'      => (float) $exam->total_marks,
                'passing_marks'    => (float) $exam->passing_marks,
                'total_questions'  => $exam->exam_questions_count ?? 0,
                'course'           => $exam->course ? [
                    'id'    => $exam->course->id,
                    'code'  => $exam->course->code,
                    'title' => $exam->course->title,
                ] : null,
            ];
        });

        return response()->json([
            'success'    => true,
            'message'    => 'Practice exams retrieved successfully',
            'data'       => $items,
            'meta'       => [
                'timestamp' => now()->toIso8601String(),
                'version'   => '1.0',
            ],
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'total_pages'  => $paginator->lastPage(),
                'per_page'     => $paginator->perPage(),
                'total'        => $paginator->total(),
            ],
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Show — Single practice exam with questions (no correct_answer)     */
    /* ------------------------------------------------------------------ */

    public function show(int $id, Request $request): JsonResponse
    {
        $user = $request->user();

        $exam = Exam::with(['course', 'examQuestions.question'])
            ->where('status', 'published')
            ->where('is_practice', true)
            ->findOrFail($id);

        // Verify student is enrolled in the course
        $enrolled = CourseEnrollment::where('course_id', $exam->course_id)
            ->where('student_id', $user->id)
            ->where('status', 'active')
            ->exists();

        if (! $enrolled) {
            return ResponseHelper::error('You are not enrolled in the course for this practice exam.', 403);
        }

        $questions = $exam->examQuestions->map(function ($eq) {
            $question = $eq->question;
            return [
                'id'               => $eq->id,
                'question_id'      => $eq->question_id,
                'question_order'   => $eq->question_order,
                'points'           => (float) $eq->points,
                'question'         => $question ? [
                    'id'               => $question->id,
                    'question_text'    => $question->question_text,
                    'question_type'    => $question->question_type,
                    'options'          => $question->options,
                    'difficulty_level' => $question->difficulty_level,
                    'topic'            => $question->topic,
                    // correct_answer NOT returned here (only after submission)
                ] : null,
            ];
        })->values();

        return ResponseHelper::success([
            'id'               => $exam->id,
            'uuid'             => $exam->uuid,
            'title'            => $exam->title,
            'description'      => $exam->description,
            'instructions'     => $exam->instructions,
            'duration_minutes' => $exam->duration_minutes,
            'total_marks'      => (float) $exam->total_marks,
            'passing_marks'    => (float) $exam->passing_marks,
            'total_questions'  => $exam->examQuestions->count(),
            'course'           => $exam->course ? [
                'id'    => $exam->course->id,
                'code'  => $exam->course->code,
                'title' => $exam->course->title,
            ] : null,
            'questions'        => $questions,
        ], 'Practice exam retrieved successfully');
    }

    /* ------------------------------------------------------------------ */
    /*  Submit — Submit answers for a practice exam and get results        */
    /* ------------------------------------------------------------------ */

    public function submit(int $id, Request $request): JsonResponse
    {
        $user = $request->user();

        $request->validate([
            'answers'                => 'required|array',
            'answers.*.question_id'  => 'required|integer|exists:questions,id',
            'answers.*.answer'       => 'nullable|string',
        ]);

        $exam = Exam::with(['examQuestions.question'])
            ->where('status', 'published')
            ->where('is_practice', true)
            ->findOrFail($id);

        // Verify student is enrolled in the course
        $enrolled = CourseEnrollment::where('course_id', $exam->course_id)
            ->where('student_id', $user->id)
            ->where('status', 'active')
            ->exists();

        if (! $enrolled) {
            return ResponseHelper::error('You are not enrolled in the course for this practice exam.', 403);
        }

        // Build a map of question_id => ExamQuestion (with question loaded)
        $examQuestionsMap = $exam->examQuestions->keyBy('question_id');

        // Build question_sequence from exam question order
        $questionSequence = $exam->examQuestions
            ->sortBy('question_order')
            ->pluck('question_id')
            ->values()
            ->toArray();

        // Create the ExamSession for this practice attempt
        $session = ExamSession::create([
            'exam_id'             => $exam->id,
            'student_id'          => $user->id,
            'session_token'       => Str::random(64),
            'started_at'          => now(),
            'scheduled_end_time'  => now()->addMinutes($exam->duration_minutes ?? 60),
            'actual_end_time'     => now(),
            'submitted_at'        => now(),
            'status'              => 'submitted',
            'question_sequence'   => $questionSequence,
            'current_question_index' => count($questionSequence),
            'questions_answered'  => count($request->input('answers', [])),
            'ip_address'          => $request->ip(),
            'user_agent'          => $request->userAgent(),
        ]);

        // Grade each answer and build results
        $totalScore   = 0.0;
        $results      = [];

        foreach ($request->input('answers', []) as $submission) {
            $questionId     = (int) $submission['question_id'];
            $submittedAnswer = $submission['answer'] ?? null;

            /** @var \App\Models\ExamQuestion|null $examQuestion */
            $examQuestion = $examQuestionsMap->get($questionId);

            if (! $examQuestion || ! $examQuestion->question) {
                // Question not part of this exam — skip
                continue;
            }

            $question      = $examQuestion->question;
            $pointsAwarded = 0.0;
            $isCorrect     = false;

            switch ($question->question_type) {
                case 'multiple_choice':
                    $isCorrect     = ($question->correct_answer !== null && $question->correct_answer === $submittedAnswer);
                    $pointsAwarded = $isCorrect ? (float) $examQuestion->points : 0.0;
                    break;

                case 'true_false':
                    $isCorrect     = ($question->correct_answer !== null && $question->correct_answer === $submittedAnswer);
                    $pointsAwarded = $isCorrect ? (float) $examQuestion->points : 0.0;
                    break;

                case 'fill_in_blank':
                    if ($submittedAnswer !== null && $question->correct_answer !== null) {
                        similar_text(
                            mb_strtolower(trim($submittedAnswer)),
                            mb_strtolower(trim($question->correct_answer)),
                            $similarity
                        );
                        $isCorrect     = $similarity >= 80;
                        $pointsAwarded = $isCorrect ? (float) $examQuestion->points : 0.0;
                    }
                    break;

                case 'essay':
                    // Essay requires manual grading — award 0 points for now
                    $isCorrect     = false;
                    $pointsAwarded = 0.0;
                    break;
            }

            $totalScore += $pointsAwarded;

            // Determine correct field to store answer
            $answerText      = null;
            $selectedOption  = null;

            if ($question->question_type === 'multiple_choice') {
                $selectedOption = $submittedAnswer !== null ? [$submittedAnswer] : null;
            } else {
                $answerText = $submittedAnswer;
            }

            // Save the student answer
            StudentAnswer::create([
                'session_id'        => $session->id,
                'question_id'       => $questionId,
                'answer_text'       => $answerText,
                'selected_option'   => $selectedOption,
                'is_final'          => true,
                'version'           => 1,
                'is_correct'        => $isCorrect,
                'points_awarded'    => $pointsAwarded,
                'first_answered_at' => now(),
                'last_updated_at'   => now(),
            ]);

            $results[] = [
                'question_id'     => $questionId,
                'question_text'   => $question->question_text,
                'question_type'   => $question->question_type,
                'your_answer'     => $submittedAnswer,
                'correct_answer'  => $question->correct_answer, // exposed in practice
                'is_correct'      => $isCorrect,
                'points_awarded'  => $pointsAwarded,
                'max_points'      => (float) $examQuestion->points,
                'requires_manual_grading' => $question->question_type === 'essay',
            ];
        }

        // Calculate percentage
        $totalPossible = (float) $exam->total_marks;
        $percentage    = $totalPossible > 0 ? round(($totalScore / $totalPossible) * 100, 2) : 0.0;
        $passed        = $totalScore >= (float) $exam->passing_marks;

        // Update session with final scores
        $session->update([
            'total_score' => $totalScore,
            'percentage'  => $percentage,
        ]);

        return ResponseHelper::success([
            'session_id'   => $session->id,
            'score'        => $totalScore,
            'total_marks'  => $totalPossible,
            'percentage'   => $percentage,
            'passing_marks'=> (float) $exam->passing_marks,
            'passed'       => $passed,
            'results'      => $results,
        ], 'Practice exam submitted and graded successfully');
    }
}
