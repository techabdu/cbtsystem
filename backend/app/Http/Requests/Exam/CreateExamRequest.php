<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class CreateExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role check is handled in the controller
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'course_id'                => 'required|integer|exists:courses,id',
            'title'                    => 'required|string|max:255',
            'description'              => 'nullable|string|max:2000',
            'instructions'             => 'nullable|string|max:5000',
            'exam_type'                => 'required|in:midterm,final,quiz,practice,makeup',
            'start_time'               => 'required|date',
            'end_time'                 => 'required|date|after:start_time',
            'duration_minutes'         => 'required|integer|min:5|max:480',
            'total_marks'              => 'required|numeric|min:1',
            'passing_marks'            => 'required|numeric|min:0|lte:total_marks',
            'randomize_questions'      => 'nullable|boolean',
            'randomize_options'        => 'nullable|boolean',
            'questions_per_page'       => 'nullable|integer|min:1|max:50',
            'allow_backtrack'          => 'nullable|boolean',
            'show_results_immediately' => 'nullable|boolean',
            'show_correct_answers'     => 'nullable|boolean',
            'requires_password'        => 'nullable|boolean',
            'exam_password'            => 'required_if:requires_password,true|nullable|string|min:4|max:100',
            'is_practice'              => 'nullable|boolean',
            'enable_proctoring'        => 'nullable|boolean',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'course_id.required'         => 'A course must be selected.',
            'course_id.exists'           => 'The selected course does not exist.',
            'title.required'             => 'Exam title is required.',
            'exam_type.required'         => 'Exam type is required.',
            'exam_type.in'               => 'Exam type must be one of: midterm, final, quiz, practice, makeup.',
            'start_time.required'        => 'Start time is required.',
            'end_time.required'          => 'End time is required.',
            'end_time.after'             => 'End time must be after the start time.',
            'duration_minutes.required'  => 'Duration is required.',
            'duration_minutes.min'       => 'Duration must be at least 5 minutes.',
            'duration_minutes.max'       => 'Duration cannot exceed 480 minutes (8 hours).',
            'total_marks.required'       => 'Total marks is required.',
            'total_marks.min'            => 'Total marks must be at least 1.',
            'passing_marks.required'     => 'Passing marks is required.',
            'passing_marks.lte'          => 'Passing marks cannot exceed total marks.',
            'exam_password.required_if'  => 'A password is required when password protection is enabled.',
            'exam_password.min'          => 'Exam password must be at least 4 characters.',
        ];
    }
}
