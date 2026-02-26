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
                'order'       => 1,
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
            ->postJson("/api/v1/exams/{$this->exam->id}/submit-hod")
            ->assertSuccessful();

        $this->assertEquals('pending_review', $this->exam->fresh()->status);
    }

    /** HOD approves pending_review → verified */
    public function test_allows_hod_to_approve_exam()
    {
        $this->exam->update(['status' => 'pending_review']);

        $this->actingAs($this->hod)
            ->postJson("/api/v1/exams/{$this->exam->id}/hod-approve")
            ->assertSuccessful();

        $this->assertEquals('verified', $this->exam->fresh()->status);
    }

    /** HOD rejects pending_review → draft + creates ExamFeedback */
    public function test_allows_hod_to_reject_exam_with_comments()
    {
        $this->exam->update(['status' => 'pending_review']);

        $this->actingAs($this->hod)
            ->postJson("/api/v1/exams/{$this->exam->id}/hod-reject", [
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
            ->postJson("/api/v1/exams/{$this->exam->id}/school-officer-approve")
            ->assertSuccessful();

        $this->assertEquals('published', $this->exam->fresh()->status);
    }

    /** CBT Admin publishes verified exam → published */
    public function test_allows_cbt_admin_to_publish_exam()
    {
        $this->exam->update(['status' => 'verified']);

        $this->actingAs($this->cbt)
            ->postJson("/api/v1/exams/{$this->exam->id}/cbt-publish")
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
            ->postJson("/api/v1/exams/{$this->exam->id}/dept-officer-reject", [
                'comments' => 'Please recheck question 4 marking.',
            ])
            ->assertSuccessful();

        $this->assertEquals('pending_grading', $this->exam->fresh()->results_status);

        $feedback = ExamFeedback::where('exam_id', $this->exam->id)->first();
        $this->assertNotNull($feedback);
        $this->assertEquals('Please recheck question 4 marking.', $feedback->comments);
        $this->assertEquals('grading_submitted', $feedback->stage);
    }
}
