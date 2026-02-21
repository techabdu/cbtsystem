<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    /**
     * Transform the question resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        // Determine if correct_answer should be included
        // - Admin can always see it
        // - Lecturer who created it can see it
        // - If explicitly requested via ?include_answers=true
        $showCorrectAnswer = false;
        if ($user) {
            if ($user->role === 'admin') {
                $showCorrectAnswer = true;
            } elseif ($user->role === 'lecturer' && $user->id === $this->created_by) {
                $showCorrectAnswer = true;
            } elseif ($request->has('include_answers') && $request->include_answers === 'true') {
                // Additional permission: admin or creator
                $showCorrectAnswer = $user->role === 'admin' || $user->id === $this->created_by;
            }
        }

        return [
            'id'               => $this->id,
            'uuid'             => $this->uuid,
            'course_id'        => $this->course_id,
            'created_by'       => $this->created_by,
            'question_text'    => $this->question_text,
            'question_type'    => $this->question_type,
            'options'          => $this->options,

            // Conditionally include correct_answer
            'correct_answer'   => $showCorrectAnswer ? $this->correct_answer : null,
            'has_correct_answer' => $showCorrectAnswer,

            // Media
            'has_image'        => (bool) $this->has_image,
            'image_url'        => $this->image_url,
            'has_audio'        => (bool) $this->has_audio,
            'audio_url'        => $this->audio_url,

            // Configuration
            'points'           => (float) ($this->points ?? 1.0),
            'difficulty_level' => $this->difficulty_level,

            // Categorization
            'topic'            => $this->topic,
            'tags'             => $this->tags,

            // Analytics
            'times_used'       => $this->times_used ?? 0,
            'average_score'    => $this->average_score,

            // Status
            'is_active'        => (bool) $this->is_active,
            'is_verified'      => (bool) $this->is_verified,
            'verified_at'      => $this->verified_at?->toISOString(),

            // Nested course (when loaded)
            'course'           => $this->when($this->relationLoaded('course'), function () {
                return [
                    'id'   => $this->course->id,
                    'code' => $this->course->code,
                    'title' => $this->course->title,
                ];
            }),

            // Creator (when loaded)
            'creator'          => $this->when($this->relationLoaded('creator'), function () {
                return $this->creator ? [
                    'id'        => $this->creator->id,
                    'full_name' => $this->creator->full_name,
                    'email'     => $this->creator->email,
                ] : null;
            }),

            // Verifier (when loaded)
            'verifier'         => $this->when($this->relationLoaded('verifier'), function () {
                return $this->verifier ? [
                    'id'        => $this->verifier->id,
                    'full_name' => $this->verifier->full_name,
                ] : null;
            }),

            'created_at'       => $this->created_at?->toISOString(),
            'updated_at'       => $this->updated_at?->toISOString(),
        ];
    }
}
