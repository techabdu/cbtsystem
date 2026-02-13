<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // User must be authenticated (handled by middleware)
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            'first_name'  => ['sometimes', 'required', 'string', 'max:100'],
            'last_name'   => ['sometimes', 'required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'phone'       => ['sometimes', 'required', 'string', 'max:20'],
            'student_id'  => [
                'sometimes', 'required', 'string', 'max:50',
                "unique:users,student_id,{$userId}",
            ],
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
            'phone.required'      => 'Phone number is required.',
            'student_id.required' => 'Student ID is required.',
            'student_id.unique'   => 'This Student ID is already registered.',
        ];
    }

    /**
     * Sanitize input before validation.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('first_name')) {
            $merge['first_name'] = trim($this->first_name);
        }
        if ($this->has('last_name')) {
            $merge['last_name'] = trim($this->last_name);
        }
        if ($this->has('middle_name')) {
            $merge['middle_name'] = $this->middle_name ? trim($this->middle_name) : null;
        }
        if ($this->has('phone')) {
            $merge['phone'] = trim($this->phone);
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
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
