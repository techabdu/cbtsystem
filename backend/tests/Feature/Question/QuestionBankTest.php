<?php

namespace Tests\Feature\Question;

use App\Models\Course;
use App\Models\CourseLecturer;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuestionBankTest extends TestCase
{
    use RefreshDatabase;

    private User $lecturer;
    private User $admin;
    private User $student;
    private Course $course;
    private string $lecturerToken;
    private string $adminToken;
    private string $studentToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->lecturer = User::factory()->lecturer()->create(['is_active' => true]);
        $this->admin    = User::factory()->admin()->create(['is_active' => true]);
        $this->student  = User::factory()->student()->create(['is_active' => true]);
        $this->course   = Course::factory()->create();

        // Assign course to lecturer so they can create/view questions
        CourseLecturer::create([
            'course_id'  => $this->course->id,
            'lecturer_id' => $this->lecturer->id,
        ]);

        $this->lecturerToken = $this->lecturer->createToken('t')->plainTextToken;
        $this->adminToken    = $this->admin->createToken('t')->plainTextToken;
        $this->studentToken  = $this->student->createToken('t')->plainTextToken;
    }

    private function authAs(string $token): array
    {
        return ['Authorization' => "Bearer {$token}"];
    }

    private function validQuestionPayload(array $overrides = []): array
    {
        return array_merge([
            'course_id'      => $this->course->id,
            'question_text'  => 'What is the capital of France?',
            'question_type'  => 'multiple_choice',
            'options'        => [
                ['key' => 'A', 'value' => 'Paris'],
                ['key' => 'B', 'value' => 'London'],
                ['key' => 'C', 'value' => 'Berlin'],
                ['key' => 'D', 'value' => 'Madrid'],
            ],
            'correct_answer'   => 'A',
            'points'           => 1,
            'difficulty_level' => 'easy',
        ], $overrides);
    }

    /* ------------------------------------------------------------------ */
    /*  Index                                                              */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_list_questions(): void
    {
        Question::factory()->count(5)->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->getJson('/api/v1/questions', $this->authAs($this->lecturerToken))
            ->assertOk()
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_student_cannot_access_question_bank(): void
    {
        $this->getJson('/api/v1/questions', $this->authAs($this->studentToken))
            ->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_list_questions(): void
    {
        $this->getJson('/api/v1/questions')->assertStatus(401);
    }

    public function test_lecturer_can_filter_questions_by_course(): void
    {
        $otherCourse = Course::factory()->create();

        Question::factory()->count(3)->create(['created_by' => $this->lecturer->id, 'course_id' => $this->course->id]);
        Question::factory()->count(2)->create(['created_by' => $this->lecturer->id, 'course_id' => $otherCourse->id]);

        $response = $this->getJson(
            "/api/v1/questions?course_id={$this->course->id}",
            $this->authAs($this->lecturerToken)
        );

        $response->assertOk();

        foreach ($response->json('data') as $q) {
            $this->assertEquals($this->course->id, $q['course_id']);
        }
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                              */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_create_multiple_choice_question(): void
    {
        $response = $this->postJson(
            '/api/v1/questions',
            $this->validQuestionPayload(),
            $this->authAs($this->lecturerToken)
        );

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'uuid', 'question_text', 'question_type']]);

        $this->assertDatabaseHas('questions', [
            'question_text' => 'What is the capital of France?',
            'created_by'    => $this->lecturer->id,
        ]);
    }

    public function test_lecturer_can_create_true_false_question(): void
    {
        $payload = $this->validQuestionPayload([
            'question_text' => 'The Earth is flat.',
            'question_type' => 'true_false',
            'options'       => [
                ['key' => 'True', 'value' => 'True'],
                ['key' => 'False', 'value' => 'False'],
            ],
            'correct_answer' => 'False',
        ]);

        $this->postJson('/api/v1/questions', $payload, $this->authAs($this->lecturerToken))
            ->assertStatus(201);
    }

    public function test_lecturer_can_create_essay_question(): void
    {
        // Essay questions have no options or correct_answer
        $payload = [
            'course_id'      => $this->course->id,
            'question_text'  => 'Explain the theory of relativity.',
            'question_type'  => 'essay',
            'points'         => 5,
            'difficulty_level' => 'hard',
        ];

        $this->postJson('/api/v1/questions', $payload, $this->authAs($this->lecturerToken))
            ->assertStatus(201);
    }

    public function test_question_creation_fails_without_question_text(): void
    {
        $payload = $this->validQuestionPayload(['question_text' => '']);

        $this->postJson('/api/v1/questions', $payload, $this->authAs($this->lecturerToken))
            ->assertStatus(422)
            ->assertJsonValidationErrors('question_text');
    }

    public function test_student_cannot_create_question(): void
    {
        $this->postJson('/api/v1/questions', $this->validQuestionPayload(), $this->authAs($this->studentToken))
            ->assertStatus(403);
    }

    public function test_lecturer_cannot_create_question_for_unassigned_course(): void
    {
        $otherCourse = Course::factory()->create();

        $this->postJson(
            '/api/v1/questions',
            $this->validQuestionPayload(['course_id' => $otherCourse->id]),
            $this->authAs($this->lecturerToken)
        )->assertStatus(403);
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_view_question_from_assigned_course(): void
    {
        $question = Question::factory()->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->getJson("/api/v1/questions/{$question->id}", $this->authAs($this->lecturerToken))
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'question_text', 'question_type']]);
    }

    public function test_show_returns_404_for_nonexistent_question(): void
    {
        $this->getJson('/api/v1/questions/99999', $this->authAs($this->lecturerToken))
            ->assertStatus(404);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_update_their_question(): void
    {
        $question = Question::factory()->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->putJson(
            "/api/v1/questions/{$question->id}",
            ['question_text' => 'Updated question text here?'],
            $this->authAs($this->lecturerToken)
        )
            ->assertOk()
            ->assertJsonPath('data.question_text', 'Updated question text here?');
    }

    /* ------------------------------------------------------------------ */
    /*  Verify                                                             */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_verify_a_question(): void
    {
        $question = Question::factory()->create(['is_verified' => false]);

        $this->patchJson("/api/v1/questions/{$question->id}/verify", [], $this->authAs($this->adminToken))
            ->assertOk();

        $this->assertDatabaseHas('questions', [
            'id'          => $question->id,
            'is_verified' => true,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Destroy / Restore                                                  */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_soft_delete_their_question(): void
    {
        $question = Question::factory()->create(['created_by' => $this->lecturer->id]);

        $this->deleteJson("/api/v1/questions/{$question->id}", [], $this->authAs($this->lecturerToken))
            ->assertOk();

        $this->assertSoftDeleted('questions', ['id' => $question->id]);
    }

    public function test_admin_can_restore_deleted_question(): void
    {
        $question = Question::factory()->create();
        $question->delete();

        $this->postJson("/api/v1/questions/{$question->id}/restore", [], $this->authAs($this->adminToken))
            ->assertOk();

        $this->assertDatabaseHas('questions', ['id' => $question->id, 'deleted_at' => null]);
    }

    /* ------------------------------------------------------------------ */
    /*  Stats                                                              */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_view_question_stats(): void
    {
        $this->getJson('/api/v1/questions/stats', $this->authAs($this->lecturerToken))
            ->assertOk()
            ->assertJsonStructure(['data']);
    }
}
