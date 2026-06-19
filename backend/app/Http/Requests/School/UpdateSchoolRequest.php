<?php

namespace App\Http\Requests\School;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSchoolRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'edu_portal'], true);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $schoolId = $this->route('id');

        return [
            // Schools are resolved by uuid, so ignore the current row by its uuid column.
            'code' => "sometimes|string|max:20|unique:schools,code,{$schoolId},uuid",
            'name' => 'sometimes|string|max:200',
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
