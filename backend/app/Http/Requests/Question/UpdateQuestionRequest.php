<?php

namespace App\Http\Requests\Question;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'lecturer']);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'course_id'        => 'sometimes|integer|exists:courses,id',
            'question_text'    => 'sometimes|string|max:10000',
            'question_type'    => 'sometimes|in:multiple_choice,true_false,fill_in_blank,essay',

            // Options
            'options'          => 'sometimes|array|min:2|max:10',
            'options.*.key'    => 'required_with:options|string|max:10',
            'options.*.value'  => 'required_with:options|string|max:1000',

            // Correct answer
            'correct_answer'   => 'sometimes',

            // Optional fields
            'points'           => 'nullable|numeric|min:0.01|max:999.99',
            'difficulty_level' => 'nullable|in:easy,medium,hard',
            'topic'            => 'nullable|string|max:200',
            'tags'             => 'nullable|array|max:20',
            'tags.*'           => 'string|max:50',
            'image_url'        => 'nullable|string|max:500',
            'is_active'        => 'nullable|boolean',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'course_id.exists'     => 'The selected course does not exist.',
            'question_text.max'    => 'Question text must be 10,000 characters or fewer.',
            'question_type.in'     => 'Question type must be one of: multiple_choice, true_false, fill_in_blank, essay.',
            'options.min'          => 'Multiple choice questions must have at least 2 options.',
            'options.max'          => 'Multiple choice questions can have at most 10 options.',
            'difficulty_level.in'  => 'Difficulty level must be one of: easy, medium, hard.',
            'points.min'           => 'Points must be at least 0.01.',
            'points.max'           => 'Points cannot exceed 999.99.',
        ];
    }
}
