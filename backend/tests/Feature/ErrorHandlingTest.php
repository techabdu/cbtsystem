<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Exam;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifies the global exception handling contract: business-rule violations,
 * authorization failures and not-found errors all return a clean JSON envelope
 * with the correct status code — never a raw 500.
 */
class ErrorHandlingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * An uncaught service-layer BusinessRuleException (ExamWorkflowController has
     * no try/catch) must surface as a clean 422 envelope, not a 500.
     */
    public function test_uncaught_business_rule_violation_returns_clean_422(): void
    {
        $course   = Course::factory()->create();
        $lecturer = User::factory()->create(['role' => 'lecturer']);

        // Draft exam with NO questions → submitForReview() throws BusinessRuleException.
        $exam = Exam::factory()->create([
            'created_by'  => $lecturer->id,
            'course_id'   => $course->id,
            'status'      => 'draft',
            'is_practice' => false,
        ]);

        $response = $this->actingAs($lecturer)
            ->postJson("/api/v1/exams/{$exam->uuid}/submit-hod");

        $response->assertStatus(422)
            ->assertJson([
                'success'    => false,
                'error_code' => 'BUSINESS_RULE_VIOLATION',
            ]);

        $this->assertStringContainsString('no questions', strtolower($response->json('message')));
    }

    /**
     * A policy denial must return a clean 403 envelope.
     */
    public function test_policy_denial_returns_clean_403_envelope(): void
    {
        $course  = Course::factory()->create();
        $creator = User::factory()->create(['role' => 'lecturer']);
        $other   = User::factory()->create(['role' => 'lecturer']);

        $exam = Exam::factory()->create([
            'created_by' => $creator->id,
            'course_id'  => $course->id,
            'status'     => 'draft',
        ]);

        // A different lecturer (not creator) cannot submit someone else's exam.
        $this->actingAs($other)
            ->postJson("/api/v1/exams/{$exam->uuid}/submit-hod")
            ->assertStatus(403)
            ->assertJson(['success' => false, 'error_code' => 'FORBIDDEN']);
    }

    /**
     * Unknown resources must still return 404 (the business-rule handler must not
     * hijack HttpExceptions).
     */
    public function test_unknown_resource_returns_404_envelope(): void
    {
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)
            ->getJson('/api/v1/exams/00000000-0000-0000-0000-000000000000')
            ->assertStatus(404)
            ->assertJson(['success' => false, 'error_code' => 'NOT_FOUND']);
    }
}
