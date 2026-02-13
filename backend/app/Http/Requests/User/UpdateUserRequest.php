<?php

namespace App\Http\Requests\User;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    /**
     * Only admins can update users via this endpoint.
     */
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
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
            'role'        => 'sometimes|string|in:admin,lecturer,student',
            'staff_id'    => "nullable|string|max:50|unique:users,staff_id,{$userId}",
            'student_id'  => "nullable|string|max:50|unique:users,student_id,{$userId}",
            'phone'       => 'nullable|string|max:20',
            'is_active'   => 'sometimes|boolean',
            'is_verified' => 'sometimes|boolean',
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
