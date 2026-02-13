<?php

namespace App\Http\Requests\Course;

use Illuminate\Foundation\Http\FormRequest;

class CreateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'department_id' => 'required|integer|exists:departments,id',
            'code'          => 'required|string|max:50|unique:courses,code',
            'title'         => 'required|string|max:255',
            'description'   => 'nullable|string|max:5000',
            'credit_hours'  => 'nullable|integer|min:1|max:20',
            'semester'      => 'nullable|string|max:20',
            'academic_year' => 'nullable|string|max:20',
            'level'         => 'nullable|string|max:20',
            'is_active'     => 'nullable|boolean',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.unique'          => 'A course with this code already exists.',
            'code.max'             => 'Course code must be 50 characters or fewer.',
            'department_id.exists' => 'The selected department does not exist.',
            'credit_hours.min'     => 'Credit hours must be at least 1.',
            'credit_hours.max'     => 'Credit hours cannot exceed 20.',
        ];
    }
}
