<?php

namespace App\Http\Requests\Level;

use Illuminate\Foundation\Http\FormRequest;

class CreateLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'edu_portal'], true);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'code'          => 'required|string|max:20|unique:levels,code',
            'name'          => 'required|string|max:100',
            'numeric_order' => 'required|integer|min:1',
            'is_active'     => 'nullable|boolean',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.unique'           => 'A level with this code already exists.',
            'code.max'              => 'Level code must be 20 characters or fewer.',
            'numeric_order.required' => 'Sort order is required.',
            'numeric_order.min'     => 'Sort order must be at least 1.',
        ];
    }
}
