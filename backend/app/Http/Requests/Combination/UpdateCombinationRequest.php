<?php

namespace App\Http\Requests\Combination;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCombinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        $id = $this->route('combination'); // Assuming route param is 'combination'

        return [
            'code'                 => 'string|max:20|unique:combinations,code,' . $id,
            'name'                 => 'string|max:200',
            'first_department_id'  => 'exists:departments,id',
            'second_department_id' => 'exists:departments,id',
            'is_active'            => 'boolean',
        ];
    }
}
