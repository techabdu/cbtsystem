<?php

namespace App\Http\Requests\Course;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $courseId = $this->route('id');

        return [
            'department_id' => 'sometimes|integer|exists:departments,id',
            'code'          => "sometimes|string|max:50|unique:courses,code,{$courseId}",
            'title'         => 'sometimes|string|max:255',
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
            'department_id.exists' => 'The selected department does not exist.',
        ];
    }
}
