<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'              => $this->id,
            'uuid'            => $this->uuid,
            'email'           => $this->email,
            'first_name'      => $this->first_name,
            'last_name'       => $this->last_name,
            'middle_name'     => $this->when($this->middle_name, $this->middle_name),
            'full_name'       => $this->full_name,
            'role'            => $this->role,
            'student_id'      => $this->when($this->role === 'student', $this->student_id),
            'staff_id'        => $this->when(in_array($this->role, ['lecturer', 'admin']), $this->staff_id),
            'phone'           => $this->when($this->phone, $this->phone),
            'avatar_url'      => $this->avatar_url,
            'is_active'       => $this->is_active,
            'is_verified'     => $this->is_verified,
            'last_login_at'   => $this->when(
                $this->last_login_at,
                fn () => $this->last_login_at?->toIso8601String()
            ),
            'created_at'      => $this->created_at?->toIso8601String(),
        ];
    }
}
