<?php

namespace App\Http\Requests\ExamSession;

use Illuminate\Foundation\Http\FormRequest;

class OfflineEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint — no auth required
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'matric_number' => ['required', 'string', 'max:50'],
            'access_code'   => ['required', 'string', 'max:32'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'matric_number.required' => 'Please enter your matric number.',
            'access_code.required'   => 'Please enter the exam access code.',
        ];
    }
}
