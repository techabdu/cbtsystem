<?php

namespace Tests\Feature;

use App\Models\Combination;
use App\Models\Course;
use App\Models\Department;
use App\Models\Level;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Full CRUD lifecycle coverage for the academic-structure resources plus user
 * updates. Specifically guards the uuid-vs-id unique-ignore bug: editing a
 * uuid-keyed record (school/course/user) without changing its unique field
 * must NOT return a false-positive 422.
 */
class AcademicStructureCrudTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $adminToken;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin      = User::factory()->admin()->create();
        $this->adminToken = $this->admin->createToken('t')->plainTextToken;
    }

    private function auth(): array
    {
        return ['Authorization' => "Bearer {$this->adminToken}"];
    }

    /* ============================ SCHOOLS ============================ */

    public function test_school_full_crud_lifecycle(): void
    {
        // index
        School::factory()->count(2)->create();
        $this->getJson('/api/v1/schools', $this->auth())
            ->assertOk()->assertJsonStructure(['data', 'pagination']);

        // store
        $create = $this->postJson('/api/v1/schools', ['code' => 'SCI', 'name' => 'School of Sciences'], $this->auth())
            ->assertStatus(201);
        $uuid = School::where('code', 'SCI')->first()->uuid;

        // show
        $this->getJson("/api/v1/schools/{$uuid}", $this->auth())->assertOk();

        // update WITHOUT changing code → must be 200 (uuid unique-ignore guard)
        $this->putJson("/api/v1/schools/{$uuid}", ['code' => 'SCI', 'name' => 'Renamed Sciences'], $this->auth())
            ->assertOk();
        $this->assertDatabaseHas('schools', ['code' => 'SCI', 'name' => 'Renamed Sciences']);

        // duplicate code on a different record still rejected
        School::factory()->create(['code' => 'DUP']);
        $this->postJson('/api/v1/schools', ['code' => 'DUP', 'name' => 'Dup'], $this->auth())
            ->assertStatus(422)->assertJsonValidationErrors('code');

        // destroy + restore
        $this->deleteJson("/api/v1/schools/{$uuid}", [], $this->auth())->assertOk();
        $this->assertSoftDeleted('schools', ['code' => 'SCI']);
        $this->postJson("/api/v1/schools/{$uuid}/restore", [], $this->auth())->assertOk();
        $this->assertDatabaseHas('schools', ['code' => 'SCI', 'deleted_at' => null]);
    }

    public function test_school_store_validation_error(): void
    {
        $this->postJson('/api/v1/schools', ['name' => 'No Code'], $this->auth())
            ->assertStatus(422)->assertJsonValidationErrors('code');
    }

    /* ========================== DEPARTMENTS ========================== */

    public function test_department_full_crud_lifecycle(): void
    {
        $school = School::factory()->create();

        $this->getJson('/api/v1/departments', $this->auth())->assertOk();

        $this->postJson('/api/v1/departments', ['school_id' => $school->id, 'code' => 'CSC', 'name' => 'Computer Science'], $this->auth())
            ->assertStatus(201);
        $dept = Department::where('code', 'CSC')->first();

        $this->getJson("/api/v1/departments/{$dept->id}", $this->auth())->assertOk();

        $this->putJson("/api/v1/departments/{$dept->id}", ['code' => 'CSC', 'name' => 'Comp Sci'], $this->auth())
            ->assertOk();
        $this->assertDatabaseHas('departments', ['id' => $dept->id, 'name' => 'Comp Sci']);

        $this->deleteJson("/api/v1/departments/{$dept->id}", [], $this->auth())->assertOk();
        $this->assertSoftDeleted('departments', ['id' => $dept->id]);
        $this->postJson("/api/v1/departments/{$dept->id}/restore", [], $this->auth())->assertOk();
    }

    /* ============================ LEVELS ============================ */

    public function test_level_full_crud_lifecycle(): void
    {
        $this->getJson('/api/v1/levels', $this->auth())->assertOk();

        $this->postJson('/api/v1/levels', ['code' => '500L', 'name' => '500 Level', 'numeric_order' => 5], $this->auth())
            ->assertStatus(201);
        $level = Level::where('code', '500L')->first();

        $this->putJson("/api/v1/levels/{$level->id}", ['code' => '500L', 'name' => 'Final Year', 'numeric_order' => 5], $this->auth())
            ->assertOk();
        $this->assertDatabaseHas('levels', ['id' => $level->id, 'name' => 'Final Year']);

        $this->deleteJson("/api/v1/levels/{$level->id}", [], $this->auth())->assertOk();
        $this->postJson("/api/v1/levels/{$level->id}/restore", [], $this->auth())->assertOk();
    }

    /* ========================== COMBINATIONS ========================= */

    public function test_combination_full_crud_lifecycle(): void
    {
        $a = Department::factory()->create();
        $b = Department::factory()->create();

        $this->getJson('/api/v1/combinations', $this->auth())->assertOk();

        $this->postJson('/api/v1/combinations', [
            'code' => 'MTH-PHY', 'name' => 'Maths/Physics',
            'first_department_id' => $a->id, 'second_department_id' => $b->id,
        ], $this->auth())->assertStatus(201);
        $comb = Combination::where('code', 'MTH-PHY')->first();

        $this->putJson("/api/v1/combinations/{$comb->id}", ['code' => 'MTH-PHY', 'name' => 'Mathematics/Physics'], $this->auth())
            ->assertOk();
        $this->assertDatabaseHas('combinations', ['id' => $comb->id, 'name' => 'Mathematics/Physics']);

        $this->deleteJson("/api/v1/combinations/{$comb->id}", [], $this->auth())->assertOk();
        $this->postJson("/api/v1/combinations/{$comb->id}/restore", [], $this->auth())->assertOk();
    }

    /* ============================ COURSES ============================ */

    public function test_course_full_crud_lifecycle(): void
    {
        $dept = Department::factory()->create();

        $this->getJson('/api/v1/courses', $this->auth())->assertOk();

        $this->postJson('/api/v1/courses', [
            'department_id' => $dept->id, 'code' => 'CSC101',
            'title' => 'Intro to CS', 'credit_hours' => 2,
        ], $this->auth())->assertStatus(201);
        $course = Course::where('code', 'CSC101')->first();

        $this->getJson("/api/v1/courses/{$course->uuid}", $this->auth())->assertOk();

        // update WITHOUT changing code → 200 (uuid unique-ignore guard)
        $this->putJson("/api/v1/courses/{$course->uuid}", ['code' => 'CSC101', 'title' => 'Introduction to Computer Science'], $this->auth())
            ->assertOk();
        $this->assertDatabaseHas('courses', ['id' => $course->id, 'title' => 'Introduction to Computer Science']);

        $this->deleteJson("/api/v1/courses/{$course->uuid}", [], $this->auth())->assertOk();
        $this->postJson("/api/v1/courses/{$course->uuid}/restore", [], $this->auth())->assertOk();
    }

    /* ===================== USER uuid-ignore guard ==================== */

    public function test_user_can_be_updated_with_its_own_unique_fields(): void
    {
        $lecturer = User::factory()->lecturer()->create([
            'email'    => 'keep@college.edu',
            'staff_id' => 'STAFF/KEEP',
        ]);

        // Re-submitting the user's OWN email + staff_id must not 422.
        $this->putJson("/api/v1/users/{$lecturer->uuid}", [
            'email'      => 'keep@college.edu',
            'staff_id'   => 'STAFF/KEEP',
            'first_name' => 'Renamed',
        ], $this->auth())->assertOk();

        $this->assertDatabaseHas('users', ['id' => $lecturer->id, 'first_name' => 'Renamed']);
    }

    /* ====================== N+1 regression guard ===================== */

    public function test_users_index_query_count_is_constant(): void
    {
        $combination = Combination::factory()->create();
        $level       = Level::factory()->create();

        $makeStudents = fn (int $n) => User::factory()->count($n)->create([
            'role'           => 'student',
            'combination_id' => $combination->id,
            'level_id'       => $level->id,
        ]);

        $makeStudents(2);
        // Warm up one-time costs (auth resolution, settings, etc.).
        $this->getJson('/api/v1/users?per_page=50', $this->auth())->assertOk();

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson('/api/v1/users?per_page=50', $this->auth())->assertOk();
        $baseline = count(DB::getQueryLog());

        $makeStudents(8); // now 10 students total
        DB::flushQueryLog();
        $this->getJson('/api/v1/users?per_page=50', $this->auth())->assertOk();
        $scaled = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Query count must NOT grow with the number of rows (no N+1). Linear
        // growth would make $scaled climb with the extra 8 users.
        $this->assertLessThanOrEqual(
            $baseline,
            $scaled,
            "Users index appears to have an N+1: {$baseline} queries for 2 users, {$scaled} for 10."
        );
    }

    /* ========================= Authorization ======================== */

    public function test_student_cannot_create_academic_structure(): void
    {
        $student      = User::factory()->student()->create();
        $studentToken = $student->createToken('t')->plainTextToken;
        $auth         = ['Authorization' => "Bearer {$studentToken}"];

        $this->postJson('/api/v1/schools', ['code' => 'X', 'name' => 'X'], $auth)->assertStatus(403);
        $this->postJson('/api/v1/levels', ['code' => 'X', 'name' => 'X', 'numeric_order' => 1], $auth)->assertStatus(403);
        $this->postJson('/api/v1/courses', ['department_id' => 1, 'code' => 'X', 'title' => 'X', 'credit_hours' => 1], $auth)->assertStatus(403);
    }
}
