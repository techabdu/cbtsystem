<?php

namespace App\Http\Requests\User;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    /**
     * Admins and edu_portal admins can update users via this endpoint.
     */
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'edu_portal'], true);
    }

    /**
     * Validation rules for updating a user.
     * All fields are optional (partial updates allowed).
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->route('id');

        return [
            'first_name'  => 'sometimes|string|max:100',
            'last_name'   => 'sometimes|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'email'       => "sometimes|email|max:255|unique:users,email,{$userId}",
            'password'    => ['sometimes', 'string', 'min:8', 'confirmed', new StrongPassword()],
            'role'        => [
                'sometimes',
                'string',
                'in:admin,lecturer,student,edu_portal,cbt',
                // Only an admin may assign the admin role (no privilege escalation by edu_portal).
                function ($attribute, $value, $fail) {
                    if ($value === 'admin' && $this->user()?->role !== 'admin') {
                        $fail('Only administrators can assign the admin role.');
                    }
                },
            ],
            'staff_id'    => "nullable|string|max:50|unique:users,staff_id,{$userId}",
            'student_id'  => "nullable|string|max:50|unique:users,student_id,{$userId}",
            'phone'       => 'nullable|string|max:20',
            'is_active'   => 'sometimes|boolean',
            'is_verified' => 'sometimes|boolean',
            'is_hod'      => 'sometimes|boolean',
            'level_id'    => 'nullable|integer|exists:levels,id',
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
            'email.unique'      => 'A user with this email already exists.',
            'staff_id.unique'   => 'This staff ID is already in use.',
            'student_id.unique' => 'This student ID is already in use.',
            'role.in'           => 'Role must be one of: admin, lecturer, student, edu_portal, cbt.',
        ];
    }
}
