<?php

namespace App\Http\Requests\Level;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $levelId = $this->route('id');

        return [
            'code'          => "sometimes|string|max:20|unique:levels,code,{$levelId}",
            'name'          => 'sometimes|string|max:100',
            'numeric_order' => 'sometimes|integer|min:1',
            'is_active'     => 'sometimes|boolean',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.unique' => 'A level with this code already exists.',
        ];
    }
}
