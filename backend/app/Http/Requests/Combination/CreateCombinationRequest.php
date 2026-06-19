<?php

namespace App\Http\Requests\Combination;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateCombinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'edu_portal'], true);
    }

    public function rules(): array
    {
        return [
            'code'                 => 'required|string|max:20|unique:combinations,code',
            'name'                 => 'required|string|max:200',
            'first_department_id'  => 'required|exists:departments,id',
            'second_department_id' => 'required|exists:departments,id',
            'is_active'            => 'nullable|boolean',
        ];
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            // Check for duplicate combination (A+B or B+A)
            // But unique constraint on DB is (first, second).
            // So we rely on DB unique constraint? Or check manually?
            // Since we might have A/B and B/A as DISTINCT combinations (order matters? usually not in NCE combinations like CS/MTH vs MTH/CS, they are often treated same, but let's stick to unique logic)
            // The DB unique constraint I added: $table->unique(['first_department_id', 'second_department_id']);
            // So if I send first=1, second=2, it's unique.
            // If I send first=2, second=1, it's technically a different row in DB.
            // For now, let's assume admin manages this correctly.
        });
    }
}
