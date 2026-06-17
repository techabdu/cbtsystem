<?php

namespace Tests\Feature\Export;

use App\Models\Course;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $lecturer;
    private User $otherLecturer;
    private User $deptOfficer;
    private User $student;
    private Exam $exam;

    protected function setUp(): void
    {
        parent::setUp();

        $school     = School::factory()->create();
        $department = Department::factory()->create(['school_id' => $school->id]);
        $course     = Course::factory()->create(['department_id' => $department->id]);

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->lecturer = User::factory()->create([
            'role'          => 'lecturer',
            'department_id' => $department->id,
            'school_id'     => $school->id,
        ]);

        $this->otherLecturer = User::factory()->create([
            'role'          => 'lecturer',
            'department_id' => $department->id,
            'school_id'     => $school->id,
        ]);

        $this->deptOfficer = User::factory()->create([
            'role'                       => 'lecturer',
            'department_id'              => $department->id,
            'school_id'                  => $school->id,
            'is_department_exam_officer' => true,
        ]);

        $this->student = User::factory()->create([
            'role'          => 'student',
            'department_id' => $department->id,
            'school_id'     => $school->id,
        ]);

        $this->exam = Exam::factory()->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $course->id,
            'status'     => 'published',
        ]);
    }

    /* ------------------------------------------------------------------ */
    /*  Results Export Authorization                                        */
    /* ------------------------------------------------------------------ */

    public function test_lecturer_without_exam_id_gets_422(): void
    {
        $this->actingAs($this->otherLecturer)
            ->getJson('/api/v1/exports/results')
            ->assertStatus(422);
    }

    public function test_lecturer_cannot_export_other_lecturers_exam_results(): void
    {
        $this->actingAs($this->otherLecturer)
            ->getJson("/api/v1/exports/results?exam_id={$this->exam->uuid}")
            ->assertStatus(403);
    }

    public function test_lecturer_can_export_own_exam_results(): void
    {
        $this->actingAs($this->lecturer)
            ->getJson("/api/v1/exports/results?exam_id={$this->exam->uuid}")
            ->assertSuccessful();
    }

    public function test_dept_officer_without_exam_id_gets_scoped_results(): void
    {
        $this->actingAs($this->deptOfficer)
            ->getJson('/api/v1/exports/results')
            ->assertSuccessful();
    }

    public function test_admin_can_export_any_results(): void
    {
        $this->actingAs($this->admin)
            ->getJson('/api/v1/exports/results')
            ->assertSuccessful();
    }

    /* ------------------------------------------------------------------ */
    /*  Exam Results PDF Authorization                                     */
    /* ------------------------------------------------------------------ */

    public function test_other_lecturer_cannot_export_exam_pdf(): void
    {
        $this->actingAs($this->otherLecturer)
            ->getJson("/api/v1/exports/exams/{$this->exam->uuid}/results/pdf")
            ->assertStatus(403);
    }

    public function test_exam_creator_can_export_pdf(): void
    {
        $this->actingAs($this->lecturer)
            ->getJson("/api/v1/exports/exams/{$this->exam->uuid}/results/pdf")
            ->assertSuccessful();
    }

    /* ------------------------------------------------------------------ */
    /*  Student Transcript Authorization                                   */
    /* ------------------------------------------------------------------ */

    public function test_student_cannot_view_other_students_transcript(): void
    {
        $otherStudent = User::factory()->create(['role' => 'student']);

        $this->actingAs($this->student)
            ->getJson("/api/v1/exports/students/{$otherStudent->uuid}/transcript")
            ->assertStatus(403);
    }

    public function test_student_can_view_own_transcript(): void
    {
        $this->actingAs($this->student)
            ->getJson("/api/v1/exports/students/{$this->student->uuid}/transcript")
            ->assertSuccessful();
    }

    public function test_admin_can_view_any_transcript(): void
    {
        $this->actingAs($this->admin)
            ->getJson("/api/v1/exports/students/{$this->student->uuid}/transcript")
            ->assertSuccessful();
    }
}
