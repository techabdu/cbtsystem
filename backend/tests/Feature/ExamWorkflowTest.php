<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Department;
use App\Models\Exam;
use App\Models\ExamFeedback;
use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExamWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $lecturer;
    private User $hod;
    private User $schoolOfficer;
    private User $deptOfficer;
    private User $cbt;
    private Exam $exam;

    protected function setUp(): void
    {
        parent::setUp();

        $school     = School::factory()->create();
        $department = Department::factory()->create(['school_id' => $school->id]);
        $course     = Course::factory()->create(['department_id' => $department->id]);

        $this->lecturer = User::factory()->create([
            'role'          => 'lecturer',
            'department_id' => $department->id,
            'school_id'     => $school->id,
        ]);

        $this->hod = User::factory()->create([
            'role'          => 'lecturer',
            'department_id' => $department->id,
            'school_id'     => $school->id,
            'is_hod'        => true,
        ]);

        $this->schoolOfficer = User::factory()->create([
            'role'                   => 'lecturer',
            'department_id'          => $department->id,
            'school_id'              => $school->id,
            'is_school_exam_officer' => true,
        ]);

        $this->deptOfficer = User::factory()->create([
            'role'                       => 'lecturer',
            'department_id'              => $department->id,
            'school_id'                  => $school->id,
            'is_department_exam_officer' => true,
        ]);

        $this->cbt = User::factory()->create(['role' => 'cbt']);

        \App\Models\CourseLecturer::create([
            'course_id'   => $course->id,
            'lecturer_id' => $this->lecturer->id,
        ]);

        // Create exam with one question so submission is allowed
        $this->exam = Exam::factory()->create([
            'created_by' => $this->lecturer->id,
            'course_id'  => $course->id,
            'exam_type'  => 'midterm',
            'status'     => 'draft',
        ]);

        \App\Models\Question::factory()->create()->each(function ($q) {
            \App\Models\ExamQuestion::create([
                'exam_id'     => $this->exam->id,
                'question_id' => $q->id,
                'question_order' => 1,
                'points'      => 2.00,
            ]);
        });
    }

    /* ------------------------------------------------------------------ */
    /*  PRE-EXAM WORKFLOW                                                   */
    /* ------------------------------------------------------------------ */

    /** Lecturer submits draft → pending_review */
    public function test_allows_lecturer_to_submit_exam_for_hod_review()
    {
        $this->actingAs($this->lecturer)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/submit-hod")
            ->assertSuccessful();

        $this->assertEquals('pending_review', $this->exam->fresh()->status);
    }

    /** HOD approves pending_review → verified */
    public function test_allows_hod_to_approve_exam()
    {
        $this->exam->update(['status' => 'pending_review']);

        $this->actingAs($this->hod)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/hod-approve")
            ->assertSuccessful();

        $this->assertEquals('verified', $this->exam->fresh()->status);
    }

    /** HOD rejects pending_review → draft + creates ExamFeedback */
    public function test_allows_hod_to_reject_exam_with_comments()
    {
        $this->exam->update(['status' => 'pending_review']);

        $this->actingAs($this->hod)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/hod-reject", [
                'comments' => 'Questions are too simple.',
            ])
            ->assertSuccessful();

        $this->assertEquals('draft', $this->exam->fresh()->status);

        $feedback = ExamFeedback::where('exam_id', $this->exam->id)->first();
        $this->assertNotNull($feedback);
        $this->assertEquals('Questions are too simple.', $feedback->comments);
        $this->assertEquals('pending_review', $feedback->stage);
        $this->assertEquals($this->hod->id, $feedback->user_id);
    }

    /** School Officer publishes verified exam → published */
    public function test_allows_school_officer_to_publish_exam()
    {
        $this->exam->update(['status' => 'verified']);

        $this->actingAs($this->schoolOfficer)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/school-officer-approve")
            ->assertSuccessful();

        $this->assertEquals('published', $this->exam->fresh()->status);
    }

    /** CBT Admin publishes verified exam → published */
    public function test_allows_cbt_admin_to_publish_exam()
    {
        $this->exam->update(['status' => 'verified']);

        $this->actingAs($this->cbt)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/cbt-publish")
            ->assertSuccessful();

        $this->assertEquals('published', $this->exam->fresh()->status);
    }

    /* ------------------------------------------------------------------ */
    /*  POST-EXAM WORKFLOW                                                  */
    /* ------------------------------------------------------------------ */

    /** Dept Officer rejects grading_submitted → pending_grading + creates ExamFeedback */
    public function test_allows_dept_officer_to_reject_grading()
    {
        $this->exam->update(['status' => 'published', 'results_status' => 'grading_submitted']);

        $this->actingAs($this->deptOfficer)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/dept-officer-reject", [
                'comments' => 'Please recheck question 4 marking.',
            ])
            ->assertSuccessful();

        $this->assertEquals('pending_grading', $this->exam->fresh()->results_status);

        $feedback = ExamFeedback::where('exam_id', $this->exam->id)->first();
        $this->assertNotNull($feedback);
        $this->assertEquals('Please recheck question 4 marking.', $feedback->comments);
        $this->assertEquals('grading_submitted', $feedback->stage);
    }

    /* ------------------------------------------------------------------ */
    /*  AUTHORIZATION DENIAL TESTS                                          */
    /* ------------------------------------------------------------------ */

    /** Regular lecturer (not HOD) cannot approve exams */
    public function test_regular_lecturer_cannot_hod_approve()
    {
        $this->exam->update(['status' => 'pending_review']);

        $this->actingAs($this->lecturer)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/hod-approve")
            ->assertStatus(403);

        $this->assertEquals('pending_review', $this->exam->fresh()->status);
    }

    /** HOD from a different department cannot approve */
    public function test_hod_from_different_department_cannot_approve()
    {
        $otherDept = Department::factory()->create(['school_id' => School::factory()->create()->id]);
        $otherHod  = User::factory()->create([
            'role'          => 'lecturer',
            'department_id' => $otherDept->id,
            'is_hod'        => true,
        ]);

        $this->exam->update(['status' => 'pending_review']);

        $this->actingAs($otherHod)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/hod-approve")
            ->assertStatus(403);

        $this->assertEquals('pending_review', $this->exam->fresh()->status);
    }

    /** School officer from a different school cannot approve */
    public function test_school_officer_from_different_school_cannot_approve()
    {
        $otherSchool   = School::factory()->create();
        $otherOfficer  = User::factory()->create([
            'role'                   => 'lecturer',
            'school_id'              => $otherSchool->id,
            'is_school_exam_officer' => true,
        ]);

        $this->exam->update(['status' => 'verified']);

        $this->actingAs($otherOfficer)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/school-officer-approve")
            ->assertStatus(403);

        $this->assertEquals('verified', $this->exam->fresh()->status);
    }

    /** Regular lecturer cannot CBT-publish */
    public function test_regular_lecturer_cannot_cbt_publish()
    {
        $this->exam->update(['status' => 'verified']);

        $this->actingAs($this->lecturer)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/cbt-publish")
            ->assertStatus(403);

        $this->assertEquals('verified', $this->exam->fresh()->status);
    }

    /** Dept officer from different department cannot approve grading */
    public function test_dept_officer_from_different_dept_cannot_approve_grading()
    {
        $otherDept    = Department::factory()->create(['school_id' => School::factory()->create()->id]);
        $otherOfficer = User::factory()->create([
            'role'                       => 'lecturer',
            'department_id'              => $otherDept->id,
            'is_department_exam_officer' => true,
        ]);

        $this->exam->update(['status' => 'published', 'results_status' => 'grading_submitted']);

        $this->actingAs($otherOfficer)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/dept-officer-approve")
            ->assertStatus(403);

        $this->assertEquals('grading_submitted', $this->exam->fresh()->results_status);
    }

    /** Student cannot access workflow endpoints */
    public function test_student_cannot_access_workflow_endpoints()
    {
        $student = User::factory()->create(['role' => 'student']);

        $this->exam->update(['status' => 'pending_review']);

        $this->actingAs($student)
            ->postJson("/api/v1/exams/{$this->exam->uuid}/hod-approve")
            ->assertStatus(403);
    }
}
