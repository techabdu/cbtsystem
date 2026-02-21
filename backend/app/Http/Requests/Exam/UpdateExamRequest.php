<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class UpdateExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role check is handled in the controller
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title'                    => 'sometimes|string|max:255',
            'description'              => 'sometimes|nullable|string|max:2000',
            'instructions'             => 'sometimes|nullable|string|max:5000',
            'exam_type'                => 'sometimes|in:midterm,final,quiz,practice,makeup',
            'start_time'               => 'sometimes|date',
            'end_time'                 => 'sometimes|date|after:start_time',
            'duration_minutes'         => 'sometimes|integer|min:5|max:480',
            'total_marks'              => 'sometimes|numeric|min:1',
            'passing_marks'            => 'sometimes|numeric|min:0',
            'randomize_questions'      => 'sometimes|boolean',
            'randomize_options'        => 'sometimes|boolean',
            'questions_per_page'       => 'sometimes|integer|min:1|max:50',
            'allow_backtrack'          => 'sometimes|boolean',
            'show_results_immediately' => 'sometimes|boolean',
            'show_correct_answers'     => 'sometimes|boolean',
            'requires_password'        => 'sometimes|boolean',
            'exam_password'            => 'sometimes|nullable|string|min:4|max:100',
            'is_practice'              => 'sometimes|boolean',
            'enable_proctoring'        => 'sometimes|boolean',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'exam_type.in'           => 'Exam type must be one of: midterm, final, quiz, practice, makeup.',
            'end_time.after'         => 'End time must be after the start time.',
            'duration_minutes.min'   => 'Duration must be at least 5 minutes.',
            'duration_minutes.max'   => 'Duration cannot exceed 480 minutes (8 hours).',
            'total_marks.min'        => 'Total marks must be at least 1.',
            'exam_password.min'      => 'Exam password must be at least 4 characters.',
        ];
    }
}
