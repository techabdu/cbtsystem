<?php

namespace App\Http\Requests\User;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;

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
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'first_name'  => 'required|string|max:100',
            'last_name'   => 'required|string|max:100',
            'middle_name' => 'nullable|string|max:100',
            'email'       => 'required|email|max:255|unique:users,email',
            'password'    => ['required', 'string', 'min:8', 'confirmed', new StrongPassword()],
            'role'        => 'required|string|in:admin,lecturer,student',
            'staff_id'    => 'nullable|string|max:50|unique:users,staff_id',
            'student_id'  => 'nullable|string|max:50|unique:users,student_id',
            'phone'       => 'nullable|string|max:20',
            'is_active'   => 'nullable|boolean',
            'is_verified' => 'nullable|boolean',
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
            'role.in'           => 'Role must be admin, lecturer, or student.',
        ];
    }
}
