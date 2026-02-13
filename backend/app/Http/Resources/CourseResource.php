<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CourseResource extends JsonResource
{
    /**
     * Transform the course resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'uuid'            => $this->uuid,
            'code'            => $this->code,
            'title'           => $this->title,
            'description'     => $this->description,
            'credit_hours'    => $this->credit_hours,
            'semester'        => $this->semester,
            'academic_year'   => $this->academic_year,
            'level'           => $this->level,
            'is_active'       => (bool) $this->is_active,
            'department_id'   => $this->department_id,

            // Nested department (when loaded)
            'department'      => $this->when($this->relationLoaded('department'), function () {
                return [
                    'id'   => $this->department->id,
                    'code' => $this->department->code,
                    'name' => $this->department->name,
                ];
            }),

            // Counts (when loaded)
            'students_count'  => $this->whenCounted('students'),
            'lecturers_count' => $this->whenCounted('lecturers'),
            'exams_count'     => $this->whenCounted('exams'),
            'questions_count' => $this->whenCounted('questions'),

            // Lecturers (when loaded)
            'lecturers'       => $this->when($this->relationLoaded('lecturers'), function () {
                return $this->lecturers->map(fn($lecturer) => [
                    'id'        => $lecturer->id,
                    'full_name' => $lecturer->full_name,
                    'email'     => $lecturer->email,
                    'staff_id'  => $lecturer->staff_id,
                    'role'      => $lecturer->pivot->role,
                ]);
            }),

            'created_at'      => $this->created_at?->toISOString(),
            'updated_at'      => $this->updated_at?->toISOString(),
        ];
    }
}
