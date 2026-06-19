<?php

namespace App\Http\Requests\Combination;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCombinationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'edu_portal'], true);
    }

    public function rules(): array
    {
        $id = $this->route('id'); // Route param is {id} (see routes/api.php)

        return [
            'code'                 => 'string|max:20|unique:combinations,code,' . $id,
            'name'                 => 'string|max:200',
            'first_department_id'  => 'exists:departments,id',
            'second_department_id' => 'exists:departments,id',
            'is_active'            => 'boolean',
        ];
    }
}
