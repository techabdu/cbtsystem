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
                Rule::requiredIf(in_array($this->input('role'), ['student', 'lecturer'])),
                'nullable',
                'integer',
                'exists:departments,id',
            ],
            'student_id' => [
                Rule::requiredIf($this->input('role') === 'student'),
                'nullable',
                'string',
                'max:50',
                'unique:users,student_id',
            ],
            'staff_id' => [
                Rule::requiredIf(in_array($this->input('role'), ['lecturer', 'admin'])),
                'nullable',
                'string',
                'max:50',
                'unique:users,staff_id',
            ],
            'phone'       => 'nullable|string|max:20',
            'is_active'   => 'nullable|boolean',
            'is_verified' => 'nullable|boolean',
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
            'department_id.required'  => 'Department is required for students and lecturers.',
            'department_id.exists'    => 'The selected department does not exist.',
            'student_id.required'     => 'Student ID (matric number) is required for students.',
            'staff_id.required'       => 'Staff ID (file number) is required for lecturers and admins.',
        ];
    }
}
