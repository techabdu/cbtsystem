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

    private $school;
    private $department;
    private $course;
    private $lecturer;
    private $hod;
    private $schoolOfficer;
    private $deptOfficer;
    private $cbt;
    private $eduPortal;
    private $exam;

    protected function setUp(): void
    {
        parent::setUp();

        $this->school = School::factory()->create();
        $this->department = Department::factory()->create(['school_id' => $this->school->id]);
        $this->course = Course::factory()->create(['department_id' => $this->department->id]);

        $this->lecturer = User::factory()->create([
            'role' => 'lecturer',
            'department_id' => $this->department->id,
            'school_id' => $this->school->id,
        ]);

        $this->hod = User::factory()->create([
            'role' => 'lecturer',
            'department_id' => $this->department->id,
            'school_id' => $this->school->id,
            'is_hod' => true,
        ]);

        $this->schoolOfficer = User::factory()->create([
            'role' => 'lecturer',
            'department_id' => $this->department->id,
            'school_id' => $this->school->id,
            'is_school_exam_officer' => true,
        ]);

        $this->deptOfficer = User::factory()->create([
            'role' => 'lecturer',
            'department_id' => $this->department->id,
            'school_id' => $this->school->id,
            'is_department_exam_officer' => true,
        ]);

        $this->cbt = User::factory()->create(['role' => 'cbt']);
        $this->eduPortal = User::factory()->create(['role' => 'edu_portal']);

        \App\Models\CourseLecturer::create([
            'course_id' => $this->course->id,
            'lecturer_id' => $this->lecturer->id,
        ]);

        $this->exam = Exam::factory()->create([
            'created_by' => $this->lecturer->id,
            'course_id' => $this->course->id,
            'exam_type' => 'semester',
            'status' => 'draft',
        ]);
    }

    public function test_allows_lecturer_to_submit_exam_for_hod_review()
    {
        $this->actingAs($this->lecturer)
            ->postJson("/api/v1/exams/{$this->exam->id}/submit-hod")
            ->assertSuccessful();

        $this->assertEquals('hod_review', $this->exam->fresh()->status);
    }

    public function test_allows_hod_to_approve_exam()
    {
        $this->exam->update(['status' => 'hod_review']);

        $this->actingAs($this->hod)
            ->postJson("/api/v1/exams/{$this->exam->id}/hod-approve")
            ->assertSuccessful();

        $this->assertEquals('school_officer_review', $this->exam->fresh()->status);
    }

    public function test_allows_hod_to_reject_exam_with_comments()
    {
        $this->exam->update(['status' => 'hod_review']);

        $this->actingAs($this->hod)
            ->postJson("/api/v1/exams/{$this->exam->id}/hod-reject", [
                'comments' => 'Questions are too simple.',
            ])
            ->assertSuccessful();

        $this->assertEquals('draft', $this->exam->fresh()->status);

        $feedback = ExamFeedback::where('exam_id', $this->exam->id)->first();
        $this->assertNotNull($feedback);
        $this->assertEquals('Questions are too simple.', $feedback->comments);
        $this->assertEquals('pre_exam_hod_review', $feedback->stage);
        $this->assertEquals($this->hod->id, $feedback->user_id);
    }

    public function test_allows_school_officer_to_approve_exam()
    {
        $this->exam->update(['status' => 'school_officer_review']);

        $this->actingAs($this->schoolOfficer)
            ->postJson("/api/v1/exams/{$this->exam->id}/school-officer-approve")
            ->assertSuccessful();

        $this->assertEquals('cbt_setup', $this->exam->fresh()->status);
    }

    public function test_allows_cbt_admin_to_publish_exam()
    {
        $this->exam->update(['status' => 'cbt_setup']);

        $this->actingAs($this->cbt)
            ->postJson("/api/v1/exams/{$this->exam->id}/cbt-publish")
            ->assertSuccessful();

        $this->assertEquals('published', $this->exam->fresh()->status);
    }

    public function test_allows_dept_officer_to_reject_grading()
    {
        $this->exam->update(['status' => 'grading_review']);

        $this->actingAs($this->deptOfficer)
            ->postJson("/api/v1/exams/{$this->exam->id}/dept-officer-reject", [
                'comments' => 'Please recheck question 4 marking.',
            ])
            ->assertSuccessful();

        $this->assertEquals('grading', $this->exam->fresh()->status);

        $feedback = ExamFeedback::where('exam_id', $this->exam->id)->first();
        $this->assertNotNull($feedback);
        $this->assertEquals('Please recheck question 4 marking.', $feedback->comments);
        $this->assertEquals('post_exam_grading_review', $feedback->stage);
    }
}
