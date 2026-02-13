<?php

namespace App\Http\Requests\Auth;

use App\Rules\StrongPassword;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

class ActivateAccountRequest extends FormRequest
{
    /**
     * Anyone can attempt activation (public route).
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Validation rules for first-time account activation.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'identifier' => ['required', 'string', 'max:50'],
            'password'   => ['required', 'string', 'min:8', 'confirmed', new StrongPassword()],
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
            'identifier.required'       => 'Matric number or file number is required.',
            'password.required'         => 'Password is required.',
            'password.min'              => 'Password must be at least 8 characters.',
            'password.confirmed'        => 'Password confirmation does not match.',
        ];
    }

    /**
     * Sanitize input before validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'identifier' => strtoupper(trim($this->identifier ?? '')),
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
