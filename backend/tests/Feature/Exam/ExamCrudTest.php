<?php

namespace Tests\Feature\Exam;

use App\Models\Course;
use App\Models\Exam;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamCrudTest extends TestCase
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

        \App\Models\CourseLecturer::create([
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

    /* ------------------------------------------------------------------ */
    /*  Index                                                              */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_list_their_exams(): void
    {
        Exam::factory()->count(3)->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->getJson('/api/v1/exams', $this->authAs($this->lecturerToken))
            ->assertOk()
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_admin_can_list_all_exams(): void
    {
        Exam::factory()->count(2)->create(['course_id' => $this->course->id]);

        $this->getJson('/api/v1/exams', $this->authAs($this->adminToken))
            ->assertOk();
    }

    public function test_student_cannot_access_exam_management_list(): void
    {
        $this->getJson('/api/v1/exams', $this->authAs($this->studentToken))
            ->assertStatus(403);
    }

    public function test_unauthenticated_user_cannot_list_exams(): void
    {
        $this->getJson('/api/v1/exams')
            ->assertStatus(401);
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                              */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_create_an_exam(): void
    {
        $payload = [
            'course_id'         => $this->course->id,
            'title'             => 'Midterm Examination',
            'exam_type'         => 'midterm',
            'start_time'        => now()->addDays(5)->toDateTimeString(),
            'end_time'          => now()->addDays(5)->addHours(2)->toDateTimeString(),
            'duration_minutes'  => 90,
            'total_marks'       => 100,
            'passing_marks'     => 50,
        ];

        $response = $this->postJson('/api/v1/exams', $payload, $this->authAs($this->lecturerToken));

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['id', 'uuid', 'title', 'status']]);

        $this->assertDatabaseHas('exams', [
            'title'      => 'Midterm Examination',
            'created_by' => $this->lecturer->id,
            'status'     => 'draft',
        ]);
    }

    public function test_student_cannot_create_exam(): void
    {
        $this->postJson('/api/v1/exams', [], $this->authAs($this->studentToken))
            ->assertStatus(403);
    }

    public function test_exam_creation_requires_title(): void
    {
        $payload = [
            'course_id'        => $this->course->id,
            'exam_type'        => 'midterm',
            'start_time'       => now()->addDays(5)->toDateTimeString(),
            'end_time'         => now()->addDays(5)->addHours(2)->toDateTimeString(),
            'duration_minutes' => 60,
            'total_marks'      => 100,
            'passing_marks'    => 50,
        ];

        $this->postJson('/api/v1/exams', $payload, $this->authAs($this->lecturerToken))
            ->assertStatus(422)
            ->assertJsonValidationErrors('title');
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_view_their_exam(): void
    {
        $exam = Exam::factory()->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->getJson("/api/v1/exams/{$exam->id}", $this->authAs($this->lecturerToken))
            ->assertOk()
            ->assertJsonStructure(['data' => ['id', 'title', 'status', 'exam_type']]);
    }

    public function test_show_returns_404_for_nonexistent_exam(): void
    {
        $this->getJson('/api/v1/exams/9999', $this->authAs($this->lecturerToken))
            ->assertStatus(404);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_update_draft_exam(): void
    {
        $exam = Exam::factory()->draft()->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->putJson(
            "/api/v1/exams/{$exam->id}",
            ['title' => 'Updated Exam Title'],
            $this->authAs($this->lecturerToken)
        )
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated Exam Title');
    }

    public function test_student_cannot_update_exam(): void
    {
        $exam = Exam::factory()->draft()->create(['course_id' => $this->course->id]);

        $this->putJson("/api/v1/exams/{$exam->id}", ['title' => 'Hack'], $this->authAs($this->studentToken))
            ->assertStatus(403);
    }

    /* ------------------------------------------------------------------ */
    /*  Destroy / Soft Delete                                              */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_soft_delete_draft_exam(): void
    {
        $exam = Exam::factory()->draft()->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->deleteJson("/api/v1/exams/{$exam->id}", [], $this->authAs($this->lecturerToken))
            ->assertOk();

        $this->assertSoftDeleted('exams', ['id' => $exam->id]);
    }

    /* ------------------------------------------------------------------ */
    /*  Restore                                                            */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_restore_deleted_exam(): void
    {
        $exam = Exam::factory()->create([
            'course_id' => $this->course->id,
        ]);
        $exam->delete();

        $this->postJson("/api/v1/exams/{$exam->id}/restore", [], $this->authAs($this->adminToken))
            ->assertOk();

        $this->assertDatabaseHas('exams', ['id' => $exam->id, 'deleted_at' => null]);
    }

    /* ------------------------------------------------------------------ */
    /*  Stats                                                              */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_can_view_exam_stats(): void
    {
        Exam::factory()->count(3)->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $this->course->id,
        ]);

        $this->getJson('/api/v1/exams/stats', $this->authAs($this->lecturerToken))
            ->assertOk()
            ->assertJsonStructure(['data']);
    }
}
