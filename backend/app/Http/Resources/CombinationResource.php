<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CombinationResource extends JsonResource
{
    /**
     * Transform the combination resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                   => $this->id,
            'code'                 => $this->code,
            'name'                 => $this->name,
            'first_department_id'  => $this->first_department_id,
            'second_department_id' => $this->second_department_id,
            'first_department'     => new DepartmentResource($this->whenLoaded('firstDepartment')),
            'second_department'    => new DepartmentResource($this->whenLoaded('secondDepartment')),
            'is_double_major'      => (bool) $this->is_double_major,
            'is_active'            => (bool) $this->is_active,
            'students_count'       => $this->whenCounted('students'),
            'created_at'           => $this->created_at?->toISOString(),
            'updated_at'           => $this->updated_at?->toISOString(),
        ];
    }
}
