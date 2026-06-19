<?php

namespace Tests\Feature\User;

use App\Models\Combination;
use App\Models\Department;
use App\Models\Level;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $lecturer;
    private User $student;
    private string $adminToken;
    private string $lecturerToken;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin    = User::factory()->admin()->create(['is_active' => true]);
        $this->lecturer = User::factory()->lecturer()->create(['is_active' => true]);
        $this->student  = User::factory()->student()->create(['is_active' => true]);

        $this->adminToken    = $this->admin->createToken('t')->plainTextToken;
        $this->lecturerToken = $this->lecturer->createToken('t')->plainTextToken;
    }

    private function authAs(string $token): array
    {
        return ['Authorization' => "Bearer {$token}"];
    }

    /* ------------------------------------------------------------------ */
    /*  Index                                                              */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_list_users(): void
    {
        $this->getJson('/api/v1/users', $this->authAs($this->adminToken))
            ->assertOk()
            ->assertJsonStructure(['data', 'meta']);
    }

    public function test_lecturer_cannot_list_users(): void
    {
        $this->getJson('/api/v1/users', $this->authAs($this->lecturerToken))
            ->assertStatus(403);
    }

    public function test_admin_can_filter_users_by_role(): void
    {
        User::factory()->student()->count(3)->create();

        $response = $this->getJson('/api/v1/users?role=student', $this->authAs($this->adminToken));

        $response->assertOk();

        $roles = collect($response->json('data'))->pluck('role')->unique()->values();
        $this->assertCount(1, $roles);
        $this->assertEquals('student', $roles[0]);
    }

    public function test_admin_can_search_users_by_name(): void
    {
        User::factory()->create(['first_name' => 'UniqueSearchName', 'role' => 'student']);

        $response = $this->getJson('/api/v1/users?search=UniqueSearchName', $this->authAs($this->adminToken));

        $response->assertOk();
        $this->assertGreaterThan(0, count($response->json('data')));
    }

    /* ------------------------------------------------------------------ */
    /*  Store                                                              */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_create_a_student_user(): void
    {
        $combination = Combination::factory()->create();
        $level       = Level::factory()->create();

        $payload = [
            'first_name'     => 'Jane',
            'last_name'      => 'Doe',
            'email'          => 'jane.doe@college.edu',
            'role'           => 'student',
            'student_id'     => '2025/CS/999',
            'combination_id' => $combination->id,
            'level_id'       => $level->id,
        ];

        $response = $this->postJson('/api/v1/users', $payload, $this->authAs($this->adminToken));

        $response->assertStatus(201)
            ->assertJsonStructure(['data' => ['user' => ['id', 'uuid', 'email', 'role']]]);

        $this->assertDatabaseHas('users', [
            'email' => 'jane.doe@college.edu',
            'role'  => 'student',
        ]);
    }

    public function test_admin_can_create_a_lecturer_user(): void
    {
        $department = Department::factory()->create();

        $payload = [
            'first_name'    => 'Prof',
            'last_name'     => 'Smith',
            'email'         => 'prof.smith@college.edu',
            'role'          => 'lecturer',
            'staff_id'      => 'STAFF/9999',
            'department_id' => $department->id,
        ];

        $response = $this->postJson('/api/v1/users', $payload, $this->authAs($this->adminToken));

        $response->assertStatus(201);

        $this->assertDatabaseHas('users', [
            'email' => 'prof.smith@college.edu',
            'role'  => 'lecturer',
        ]);
    }

    public function test_create_user_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'existing@college.edu']);

        $combination = Combination::factory()->create();
        $level       = Level::factory()->create();

        $payload = [
            'first_name'     => 'Dup',
            'last_name'      => 'User',
            'email'          => 'existing@college.edu',
            'role'           => 'student',
            'student_id'     => '2025/CS/111',
            'combination_id' => $combination->id,
            'level_id'       => $level->id,
        ];

        $this->postJson('/api/v1/users', $payload, $this->authAs($this->adminToken))
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');
    }

    public function test_lecturer_cannot_create_user(): void
    {
        $this->postJson('/api/v1/users', [], $this->authAs($this->lecturerToken))
            ->assertStatus(403);
    }

    /* ------------------------------------------------------------------ */
    /*  Show                                                               */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_view_a_user(): void
    {
        $this->getJson("/api/v1/users/{$this->student->uuid}", $this->authAs($this->adminToken))
            ->assertOk()
            ->assertJsonStructure(['data' => ['user' => ['id', 'uuid', 'email', 'role', 'first_name', 'last_name']]]);
    }

    public function test_show_returns_404_for_nonexistent_user(): void
    {
        $this->getJson('/api/v1/users/00000000-0000-0000-0000-000000000000', $this->authAs($this->adminToken))
            ->assertStatus(404);
    }

    /* ------------------------------------------------------------------ */
    /*  Update                                                             */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_update_user_details(): void
    {
        $response = $this->putJson(
            "/api/v1/users/{$this->student->uuid}",
            ['first_name' => 'UpdatedName'],
            $this->authAs($this->adminToken)
        );

        $response->assertOk();

        $this->assertDatabaseHas('users', [
            'id'         => $this->student->id,
            'first_name' => 'UpdatedName',
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Toggle Active                                                      */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_deactivate_a_user(): void
    {
        $this->patchJson(
            "/api/v1/users/{$this->student->uuid}/toggle-active",
            [],
            $this->authAs($this->adminToken)
        )->assertOk();

        $this->assertDatabaseHas('users', [
            'id'        => $this->student->id,
            'is_active' => false,
        ]);
    }

    public function test_admin_can_reactivate_a_deactivated_user(): void
    {
        $this->student->update(['is_active' => false]);

        $this->patchJson(
            "/api/v1/users/{$this->student->uuid}/toggle-active",
            [],
            $this->authAs($this->adminToken)
        )->assertOk();

        $this->assertDatabaseHas('users', [
            'id'        => $this->student->id,
            'is_active' => true,
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Destroy / Restore                                                  */
    /* ------------------------------------------------------------------ */

    public function test_admin_can_soft_delete_a_user(): void
    {
        $user = User::factory()->student()->create();

        $this->deleteJson("/api/v1/users/{$user->uuid}", [], $this->authAs($this->adminToken))
            ->assertOk();

        $this->assertSoftDeleted('users', ['id' => $user->id]);
    }

    public function test_admin_can_restore_deleted_user(): void
    {
        $user = User::factory()->student()->create();
        $user->delete();

        $this->postJson("/api/v1/users/{$user->uuid}/restore", [], $this->authAs($this->adminToken))
            ->assertOk();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'deleted_at' => null]);
    }
}
