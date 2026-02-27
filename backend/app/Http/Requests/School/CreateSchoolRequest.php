<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;

class CreateSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'edu_portal'], true);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'code' => 'required|string|max:20|unique:schools,code',
            'name' => 'required|string|max:200',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.unique' => 'A school with this code already exists.',
        ];
    }
}
