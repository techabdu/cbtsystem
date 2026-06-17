<?php

namespace App\Http\Requests\Question;

use App\Http\Requests\Concerns\SanitizesHtml;
use Illuminate\Foundation\Http\FormRequest;

class CreateQuestionRequest extends FormRequest
{
    use SanitizesHtml;

    protected function htmlFields(): array
    {
        return ['question_text'];
    }

    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'lecturer']);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'course_id'        => 'required|integer|exists:courses,id',
            'question_text'    => 'required|string|max:10000',
            'question_type'    => 'required|in:multiple_choice,true_false,fill_in_blank,essay',

            // Options required for MCQ
            'options'          => 'required_if:question_type,multiple_choice|array|min:2|max:10',
            'options.*.key'    => 'required_with:options|string|max:10',
            'options.*.value'  => 'required_with:options|string|max:1000',

            // Correct answer required for all except essay
            'correct_answer'   => 'required_unless:question_type,essay',

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
            'course_id.exists'               => 'The selected course does not exist.',
            'question_text.required'         => 'Question text is required.',
            'question_text.max'              => 'Question text must be 10,000 characters or fewer.',
            'question_type.required'         => 'Question type is required.',
            'question_type.in'               => 'Question type must be one of: multiple_choice, true_false, fill_in_blank, essay.',
            'options.required_if'            => 'Options are required for multiple choice questions.',
            'options.min'                    => 'Multiple choice questions must have at least 2 options.',
            'options.max'                    => 'Multiple choice questions can have at most 10 options.',
            'correct_answer.required_unless' => 'Correct answer is required for this question type.',
            'difficulty_level.in'            => 'Difficulty level must be one of: easy, medium, hard.',
            'points.min'                     => 'Points must be at least 0.01.',
            'points.max'                     => 'Points cannot exceed 999.99.',
        ];
    }
}
