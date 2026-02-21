<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class AddExamQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Role check is handled in the controller
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'questions'                 => 'required|array|min:1',
            'questions.*.question_id'   => 'required|integer|exists:questions,id',
            'questions.*.points'        => 'required|numeric|min:0.5|max:100',
            'questions.*.order'         => 'nullable|integer|min:1',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'questions.required'                => 'At least one question is required.',
            'questions.min'                     => 'At least one question is required.',
            'questions.*.question_id.required'  => 'Each entry must include a question_id.',
            'questions.*.question_id.exists'    => 'One or more question IDs do not exist.',
            'questions.*.points.required'       => 'Each question must have a points value.',
            'questions.*.points.min'            => 'Points must be at least 0.5.',
            'questions.*.points.max'            => 'Points cannot exceed 100.',
        ];
    }
}
