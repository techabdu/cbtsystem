<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateUserRequest extends FormRequest
{
    /**
     * Only admins can create users via this endpoint.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /**
     * Validation rules for creating a new user.
     * Admin creates users WITHOUT a password — the user sets their
     * own password during first-time account activation.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'first_name'    => 'required|string|max:100',
            'last_name'     => 'required|string|max:100',
            'middle_name'   => 'nullable|string|max:100',
            'email'         => 'required|email|max:255|unique:users,email',
            'role'          => 'required|string|in:admin,lecturer,student',
            'department_id' => [
                'nullable',
                'integer',
                'exists:departments,id',
                // Required for lecturer, forbidden for student if using combination logic strictly?
                // Actually, let's make it:
                // Lecturer: required
                // Student: should be null (they use combination), but old students might have it.
                // New logic: Student -> combination_id required.
                Rule::requiredIf(fn() => $this->role === 'lecturer'),
            ],
            'combination_id' => [
                'nullable',
                'integer',
                'exists:combinations,id',
                // Required for student
                Rule::requiredIf(fn() => $this->role === 'student'),
            ],
            'level_id' => [
                'nullable',
                'integer',
                'exists:levels,id',
                // Required for student
                Rule::requiredIf(fn() => $this->role === 'student'),
            ],
            'student_id' => [
                Rule::requiredIf($this->input('role') === 'student'),
                'nullable',
                'string',
                'max:50',
                'unique:users,student_id',
            ],
            'staff_id' => [
                'nullable',
                'string',
                'max:20',
                Rule::unique('users', 'staff_id'),
                Rule::requiredIf(fn() => in_array($this->role, ['admin', 'lecturer'])),
            ],
            'phone'       => 'nullable|string|max:20',
            'is_active'   => 'nullable|boolean',
            'is_verified' => 'nullable|boolean',
            'is_hod'      => 'nullable|boolean',
            // No password field — users create their own on activation
        ];
    }

    /**
     * Custom error messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'email.unique'            => 'A user with this email already exists.',
            'staff_id.unique'         => 'This staff ID is already in use.',
            'student_id.unique'       => 'This student ID is already in use.',
            'role.in'                 => 'Role must be admin, lecturer, or student.',
            'department_id.required' => 'Department is required for lecturers.',
            'combination_id.required' => 'Subject combination is required for students.',
            'level_id.required' => 'Level is required for students.',
            'level_id.exists'   => 'The selected level does not exist.',
            'staff_id.required' => 'Staff ID (File Number) is required for staff.',
            'department_id.exists'    => 'The selected department does not exist.',
            'student_id.required'     => 'Student ID (matric number) is required for students.',
        ];
    }
}
