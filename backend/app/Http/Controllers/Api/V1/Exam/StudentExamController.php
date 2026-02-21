<?php

namespace App\Http\Controllers\Api\V1\Exam;

use App\Helpers\ResponseHelper;
use App\Http\Controllers\Controller;
use App\Models\CourseEnrollment;
use App\Models\Exam;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentExamController extends Controller
{
    /* ------------------------------------------------------------------ */
    /*  Index — List published exams for enrolled courses                  */
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
            ->where('is_practice', false);

        // --- Filter by upcoming or ongoing ---
        $filter = $request->input('filter');
        if ($filter === 'upcoming') {
            $query->where('start_time', '>', now());
        } elseif ($filter === 'ongoing') {
            $query->where('start_time', '<=', now())
                  ->where('end_time', '>=', now());
        }

        // --- Course filter ---
        if ($request->filled('course_id')) {
            $query->where('course_id', $request->input('course_id'));
        }

        $query->orderBy('start_time', 'asc');

        $perPage = min((int) ($request->input('per_page', 20)), 100);
        $paginator = $query->paginate($perPage);

        $items = $paginator->getCollection()->map(function (Exam $exam) {
            return [
                'id'               => $exam->id,
                'uuid'             => $exam->uuid,
                'title'            => $exam->title,
                'exam_type'        => $exam->exam_type,
                'start_time'       => $exam->start_time?->toIso8601String(),
                'end_time'         => $exam->end_time?->toIso8601String(),
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
            'message'    => 'Exams retrieved successfully',
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
    /*  Show — Single published exam for student                           */
    /* ------------------------------------------------------------------ */

    public function show(int $id, Request $request): JsonResponse
    {
        $user = $request->user();

        $exam = Exam::with(['course'])
            ->withCount('examQuestions')
            ->where('status', 'published')
            ->where('is_practice', false)
            ->findOrFail($id);

        // Verify student is enrolled in the course
        $enrolled = CourseEnrollment::where('course_id', $exam->course_id)
            ->where('student_id', $user->id)
            ->where('status', 'active')
            ->exists();

        if (! $enrolled) {
            return ResponseHelper::error('You are not enrolled in the course for this exam.', 403);
        }

        return ResponseHelper::success([
            'id'                       => $exam->id,
            'uuid'                     => $exam->uuid,
            'title'                    => $exam->title,
            'description'              => $exam->description,
            'instructions'             => $exam->instructions,
            'exam_type'                => $exam->exam_type,
            'start_time'               => $exam->start_time?->toIso8601String(),
            'end_time'                 => $exam->end_time?->toIso8601String(),
            'duration_minutes'         => $exam->duration_minutes,
            'total_marks'              => (float) $exam->total_marks,
            'passing_marks'            => (float) $exam->passing_marks,
            'total_questions'          => $exam->exam_questions_count ?? 0,
            'randomize_questions'      => $exam->randomize_questions,
            'randomize_options'        => $exam->randomize_options,
            'questions_per_page'       => $exam->questions_per_page,
            'allow_backtrack'          => $exam->allow_backtrack,
            'show_results_immediately' => $exam->show_results_immediately,
            'requires_password'        => $exam->requires_password,
            'enable_proctoring'        => $exam->enable_proctoring,
            'course'                   => $exam->course ? [
                'id'    => $exam->course->id,
                'code'  => $exam->course->code,
                'title' => $exam->course->title,
            ] : null,
        ], 'Exam retrieved successfully');
    }
}
