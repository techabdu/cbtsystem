<?php

namespace App\Http\Requests\Department;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDepartmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $departmentId = $this->route('id');

        return [
            'code'        => "sometimes|string|max:20|unique:departments,code,{$departmentId}",
            'name'        => 'sometimes|string|max:200',
            'description' => 'nullable|string|max:1000',
            'is_active'   => 'sometimes|boolean',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.unique' => 'A department with this code already exists.',
        ];
    }
}
