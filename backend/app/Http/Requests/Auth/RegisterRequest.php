<?php

namespace App\Http\Requests\Auth;

use App\Rules\StrongPassword;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Registration is open to everyone (unauthenticated).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'email'                 => ['required', 'email:rfc', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'string', 'confirmed', new StrongPassword()],
            'password_confirmation' => ['required'],
            'first_name'            => ['required', 'string', 'max:100'],
            'last_name'             => ['required', 'string', 'max:100'],
            'middle_name'           => ['nullable', 'string', 'max:100'],
            'student_id'            => ['nullable', 'string', 'max:50', 'unique:users,student_id'],
            'phone'                 => ['nullable', 'string', 'max:20'],
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
            'email.required'    => 'Email address is required.',
            'email.email'       => 'Please enter a valid email address.',
            'email.unique'      => 'An account with this email already exists.',
            'password.required' => 'Password is required.',
            'password.confirmed' => 'Password confirmation does not match.',
            'first_name.required' => 'First name is required.',
            'last_name.required'  => 'Last name is required.',
            'student_id.unique'   => 'This student ID is already registered.',
        ];
    }

    /**
     * Sanitize input before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email'      => strtolower(trim($this->email ?? '')),
            'first_name' => trim($this->first_name ?? ''),
            'last_name'  => trim($this->last_name ?? ''),
            'middle_name' => $this->middle_name ? trim($this->middle_name) : null,
            'phone'      => $this->phone ? trim($this->phone) : null,
        ]);
    }

    /**
     * Handle a failed validation attempt — return JSON (not redirect).
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(
            response()->json([
                'success'    => false,
                'message'    => 'Validation failed',
                'errors'     => $validator->errors()->toArray(),
                'error_code' => 'VALIDATION_ERROR',
                'meta'       => ['timestamp' => now()->toIso8601String()],
            ], 422)
        );
    }
}
