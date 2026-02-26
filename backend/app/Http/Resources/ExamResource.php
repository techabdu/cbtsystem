<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ExamResource extends JsonResource
{
    /**
     * Transform the exam resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id'                       => $this->id,
            'uuid'                     => $this->uuid,
            'course_id'                => $this->course_id,
            'course'                   => $this->whenLoaded('course', fn () => [
                'id'    => $this->course->id,
                'code'  => $this->course->code,
                'title' => $this->course->title,
            ]),
            'created_by'               => $this->created_by,
            'creator'                  => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id'        => $this->creator->id,
                'full_name' => $this->creator->full_name,
                'email'     => $this->creator->email,
            ] : null),
            'title'                    => $this->title,
            'description'              => $this->description,
            'instructions'             => $this->instructions,
            'exam_type'                => $this->exam_type,
            'start_time'               => $this->start_time?->toIso8601String(),
            'end_time'                 => $this->end_time?->toIso8601String(),
            'duration_minutes'         => $this->duration_minutes,
            'total_marks'              => (float) $this->total_marks,
            'passing_marks'            => (float) $this->passing_marks,
            'total_questions'          => $this->exam_questions_count ?? ($this->relationLoaded('examQuestions')
                ? $this->examQuestions->count()
                : $this->examQuestions()->count()),
            'randomize_questions'      => $this->randomize_questions,
            'randomize_options'        => $this->randomize_options,
            'questions_per_page'       => $this->questions_per_page,
            'allow_backtrack'          => $this->allow_backtrack,
            'show_results_immediately' => $this->show_results_immediately,
            'show_correct_answers'     => $this->show_correct_answers,
            'requires_password'        => $this->requires_password,
            'status'                   => $this->status,
            'results_status'           => $this->results_status,
            'is_practice'              => $this->is_practice,
            'enable_proctoring'        => $this->enable_proctoring,

            // Exam questions (when loaded)
            'questions'                => $this->whenLoaded('examQuestions', fn () =>
                $this->examQuestions->map(fn ($eq) => [
                    'id'             => $eq->id,
                    'question_id'    => $eq->question_id,
                    'question_order' => $eq->question_order,
                    'points'         => (float) $eq->points,
                    'is_required'    => $eq->is_required,
                    'question'       => $eq->relationLoaded('question') && $eq->question ? [
                        'id'               => $eq->question->id,
                        'question_text'    => $eq->question->question_text,
                        'question_type'    => $eq->question->question_type,
                        'difficulty_level' => $eq->question->difficulty_level,
                        'topic'            => $eq->question->topic,
                        'options'          => $eq->question->options,
                        // correct_answer only for admin or exam creator
                        'correct_answer'   => ($user?->role === 'admin' || $user?->id === $this->created_by)
                            ? $eq->question->correct_answer
                            : null,
                    ] : null,
                ])->values()
            ),

            'created_at'               => $this->created_at?->toIso8601String(),
            'updated_at'               => $this->updated_at?->toIso8601String(),
        ];
    }
}
