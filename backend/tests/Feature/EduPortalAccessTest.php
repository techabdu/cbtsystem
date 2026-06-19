<?php

namespace Tests\Feature;

use App\Models\Combination;
use App\Models\Course;
use App\Models\Department;
use App\Models\Exam;
use App\Models\Level;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regression coverage for the edu_portal CRUD 403/422 failures and the
 * newly-wired results-publishing endpoint.
 *
 * Root cause that these tests lock in: the academic-structure / user Form
 * Requests previously only authorized `role === 'admin'`, so edu_portal users
 * passed the route middleware but were rejected (403) by the Form Request.
 */
class EduPortalAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $eduPortal;
    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->eduPortal = User::factory()->create([
            'role'     => 'edu_portal',
            'staff_id' => 'STAFF/EP01',
        ]);

        $this->admin = User::factory()->admin()->create();
    }

    /* ------------------------------------------------------------------ */
    /*  403 fix — edu_portal can perform academic-structure + user CRUD    */
    /* ------------------------------------------------------------------ */

    public function test_edu_portal_can_create_a_department(): void
    {
        $school = School::factory()->create();

        $this->actingAs($this->eduPortal)
            ->postJson('/api/v1/departments', [
                'school_id' => $school->id,
                'code'      => 'EP-DEPT',
                'name'      => 'Edu Portal Test Department',
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('departments', ['code' => 'EP-DEPT']);
    }

    public function test_edu_portal_can_create_a_level(): void
    {
        $this->actingAs($this->eduPortal)
            ->postJson('/api/v1/levels', [
                'code'          => 'EPL',
                'name'          => 'Edu Portal Level',
                'numeric_order' => 9,
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('levels', ['code' => 'EPL']);
    }

    public function test_edu_portal_can_create_a_course(): void
    {
        $department = Department::factory()->create();

        $this->actingAs($this->eduPortal)
            ->postJson('/api/v1/courses', [
                'department_id' => $department->id,
                'code'          => 'EP-101',
                'title'         => 'Edu Portal Course',
                'credit_hours'  => 3,
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('courses', ['code' => 'EP-101']);
    }

    public function test_edu_portal_can_create_a_combination(): void
    {
        $first  = Department::factory()->create();
        $second = Department::factory()->create();

        $this->actingAs($this->eduPortal)
            ->postJson('/api/v1/combinations', [
                'code'                 => 'EP-COMB',
                'name'                 => 'Edu Portal Combination',
                'first_department_id'  => $first->id,
                'second_department_id' => $second->id,
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('combinations', ['code' => 'EP-COMB']);
    }

    public function test_edu_portal_can_create_a_student_user(): void
    {
        $combination = Combination::factory()->create();
        $level       = Level::factory()->create();

        $this->actingAs($this->eduPortal)
            ->postJson('/api/v1/users', [
                'first_name'     => 'Ada',
                'last_name'      => 'Student',
                'email'          => 'ada.student@college.edu',
                'role'           => 'student',
                'student_id'     => '2025/EP/001',
                'combination_id' => $combination->id,
                'level_id'       => $level->id,
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'ada.student@college.edu']);
    }

    /* ------------------------------------------------------------------ */
    /*  422 fix — combination update with unchanged code (route param bug) */
    /* ------------------------------------------------------------------ */

    public function test_edu_portal_can_update_combination_without_changing_code(): void
    {
        $combination = Combination::factory()->create(['code' => 'KEEP-CODE']);

        // Re-sending the SAME code used to 422 because the unique-ignore read
        // the wrong route param ('combination' instead of 'id') → null.
        $this->actingAs($this->eduPortal)
            ->putJson("/api/v1/combinations/{$combination->id}", [
                'code' => 'KEEP-CODE',
                'name' => 'Renamed Combination',
            ])
            ->assertSuccessful();

        $this->assertDatabaseHas('combinations', [
            'id'   => $combination->id,
            'name' => 'Renamed Combination',
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  422 fix — role enum now includes edu_portal/cbt                    */
    /* ------------------------------------------------------------------ */

    public function test_edu_portal_can_create_a_cbt_user(): void
    {
        $this->actingAs($this->eduPortal)
            ->postJson('/api/v1/users', [
                'first_name' => 'Cee',
                'last_name'  => 'BeeTee',
                'email'      => 'cbt.user@college.edu',
                'role'       => 'cbt',
                'staff_id'   => 'STAFF/CBT9',
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'cbt.user@college.edu', 'role' => 'cbt']);
    }

    /* ------------------------------------------------------------------ */
    /*  Security — edu_portal cannot mint admin accounts                   */
    /* ------------------------------------------------------------------ */

    public function test_edu_portal_cannot_create_an_admin_user(): void
    {
        $this->actingAs($this->eduPortal)
            ->postJson('/api/v1/users', [
                'first_name' => 'Sneaky',
                'last_name'  => 'Admin',
                'email'      => 'sneaky.admin@college.edu',
                'role'       => 'admin',
                'staff_id'   => 'STAFF/HACK',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('role');

        $this->assertDatabaseMissing('users', ['email' => 'sneaky.admin@college.edu']);
    }

    public function test_admin_can_create_an_admin_user(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/v1/users', [
                'first_name' => 'Real',
                'last_name'  => 'Admin',
                'email'      => 'real.admin@college.edu',
                'role'       => 'admin',
                'staff_id'   => 'STAFF/ADM7',
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('users', ['email' => 'real.admin@college.edu', 'role' => 'admin']);
    }

    /* ------------------------------------------------------------------ */
    /*  Workflow — edu_portal publishes verified results                   */
    /* ------------------------------------------------------------------ */

    public function test_edu_portal_can_publish_verified_results(): void
    {
        $course = Course::factory()->create();
        $exam   = Exam::factory()->create([
            'course_id'      => $course->id,
            'created_by'     => $this->admin->id,
            'status'         => 'published',
            'results_status' => 'results_verified',
        ]);

        $this->actingAs($this->eduPortal)
            ->postJson("/api/v1/exams/{$exam->uuid}/publish-results")
            ->assertSuccessful();

        $this->assertEquals('results_published', $exam->fresh()->results_status);
    }

    public function test_edu_portal_cannot_publish_results_before_verification(): void
    {
        $course = Course::factory()->create();
        $exam   = Exam::factory()->create([
            'course_id'      => $course->id,
            'created_by'     => $this->admin->id,
            'status'         => 'published',
            'results_status' => 'grading_submitted',
        ]);

        $this->actingAs($this->eduPortal)
            ->postJson("/api/v1/exams/{$exam->uuid}/publish-results")
            ->assertStatus(403);

        $this->assertEquals('grading_submitted', $exam->fresh()->results_status);
    }
}
