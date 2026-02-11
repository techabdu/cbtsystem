# CBT System - Backend Architecture (PHP)

## Document Purpose
Comprehensive guide to building the PHP backend following industry best practices, clean architecture, and SOLID principles.

---

## Framework Choice

### Laravel 11+ (Selected Framework)

**Why Laravel:**
- Full-stack framework with batteries included
- Built-in authentication (Laravel Sanctum/Passport), validation, queue system
- Eloquent ORM for database interactions with MySQL support
- Active community and extensive packages
- Built-in testing support (PHPUnit, Pest)
- Excellent documentation
- Laravel Forge/Vapor for easy deployment
- Built-in scheduler for cron jobs
- Redis integration out of the box

**Benefits for CBT System:**
- Rapid development with artisan commands
- Database migrations and seeders
- Queue workers for background jobs (grading, notifications)
- Event broadcasting for real-time features
- Form request validation
- API resources for response transformation
- Middleware for authentication and authorization

---

## Project Structure (Laravel)

```
cbt-backend/
├── app/
│   ├── Console/              # CLI commands
│   ├── Exceptions/           # Custom exceptions
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Api/
│   │   │   │   ├── V1/
│   │   │   │   │   ├── Auth/
│   │   │   │   │   │   ├── LoginController.php
│   │   │   │   │   │   ├── RegisterController.php
│   │   │   │   │   │   └── LogoutController.php
│   │   │   │   │   ├── User/
│   │   │   │   │   │   └── UserController.php
│   │   │   │   │   ├── Course/
│   │   │   │   │   │   ├── CourseController.php
│   │   │   │   │   │   └── EnrollmentController.php
│   │   │   │   │   ├── Question/
│   │   │   │   │   │   └── QuestionController.php
│   │   │   │   │   ├── Exam/
│   │   │   │   │   │   ├── ExamController.php
│   │   │   │   │   │   └── ExamResultController.php
│   │   │   │   │   └── ExamSession/
│   │   │   │   │       ├── SessionController.php
│   │   │   │   │       └── AnswerController.php
│   │   ├── Middleware/
│   │   │   ├── Authenticate.php
│   │   │   ├── RoleMiddleware.php
│   │   │   └── RateLimitMiddleware.php
│   │   ├── Requests/         # Form request validation
│   │   │   ├── Auth/
│   │   │   ├── Course/
│   │   │   ├── Question/
│   │   │   └── Exam/
│   │   └── Resources/        # API response transformers
│   │       ├── UserResource.php
│   │       ├── CourseResource.php
│   │       └── ExamResource.php
│   ├── Models/
│   │   ├── User.php
│   │   ├── Department.php
│   │   ├── Course.php
│   │   ├── CourseEnrollment.php
│   │   ├── Question.php
│   │   ├── Exam.php
│   │   ├── ExamQuestion.php
│   │   ├── ExamSession.php
│   │   ├── StudentAnswer.php
│   │   └── ActivityLog.php
│   ├── Services/             # Business logic layer
│   │   ├── Auth/
│   │   │   ├── AuthService.php
│   │   │   └── JwtService.php
│   │   ├── Exam/
│   │   │   ├── ExamService.php
│   │   │   ├── SessionService.php
│   │   │   ├── GradingService.php
│   │   │   └── RecoveryService.php
│   │   ├── Question/
│   │   │   ├── QuestionService.php
│   │   │   └── BulkUploadService.php
│   │   └── Notification/
│   │       └── NotificationService.php
│   ├── Repositories/         # Data access layer (optional)
│   │   ├── UserRepository.php
│   │   ├── ExamRepository.php
│   │   └── QuestionRepository.php
│   ├── Events/               # Domain events
│   │   ├── ExamStarted.php
│   │   ├── ExamSubmitted.php
│   │   └── AnswerSaved.php
│   ├── Listeners/            # Event handlers
│   │   ├── SendExamReminderNotification.php
│   │   └── LogExamActivity.php
│   ├── Jobs/                 # Queue jobs
│   │   ├── ProcessExamResults.php
│   │   ├── SendBulkNotifications.php
│   │   └── GenerateExamReport.php
│   └── Helpers/              # Utility functions
│       ├── ResponseHelper.php
│       └── DateHelper.php
├── bootstrap/
├── config/
│   ├── database.php
│   ├── jwt.php
│   ├── cors.php
│   └── exam.php              # Custom exam configurations
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   ├── api.php               # API routes
│   └── web.php
├── storage/
│   ├── app/
│   │   ├── public/           # Public files
│   │   └── uploads/          # Question images, etc.
│   ├── framework/
│   └── logs/
├── tests/
│   ├── Feature/              # Integration tests
│   │   ├── Auth/
│   │   ├── Exam/
│   │   └── Question/
│   └── Unit/                 # Unit tests
│       ├── Services/
│       └── Models/
├── .env
├── composer.json
└── README.md
```

---

## Core Design Patterns

### 1. Repository Pattern (Optional but Recommended)

**Purpose:** Abstraction layer between business logic and data access

```php
<?php

namespace App\Repositories;

use App\Models\Exam;
use Illuminate\Database\Eloquent\Collection;

class ExamRepository
{
    public function findById(int $id): ?Exam
    {
        return Exam::find($id);
    }

    public function getUpcomingExams(int $courseId): Collection
    {
        return Exam::where('course_id', $courseId)
            ->where('start_time', '>', now())
            ->where('status', 'published')
            ->orderBy('start_time')
            ->get();
    }

    public function create(array $data): Exam
    {
        return Exam::create($data);
    }

    public function update(Exam $exam, array $data): bool
    {
        return $exam->update($data);
    }
}
```

---

### 2. Service Layer Pattern

**Purpose:** Business logic separation from controllers

```php
<?php

namespace App\Services\Exam;

use App\Models\Exam;
use App\Models\ExamSession;
use App\Models\User;
use App\Repositories\ExamRepository;
use App\Exceptions\ExamNotFoundException;
use App\Exceptions\ExamAlreadyStartedException;
use Illuminate\Support\Facades\DB;

class SessionService
{
    public function __construct(
        private ExamRepository $examRepository,
        private RecoveryService $recoveryService
    ) {}

    /**
     * Start a new exam session for a student
     */
    public function startSession(int $examId, User $student, ?string $password = null): ExamSession
    {
        $exam = $this->examRepository->findById($examId);

        if (!$exam) {
            throw new ExamNotFoundException("Exam not found");
        }

        // Validation
        $this->validateExamAccess($exam, $student, $password);
        
        // Check for existing session
        $existingSession = $this->getExistingSession($exam, $student);
        if ($existingSession) {
            throw new ExamAlreadyStartedException("You have already started this exam");
        }

        return DB::transaction(function () use ($exam, $student) {
            // Generate randomized question sequence
            $questionSequence = $this->generateQuestionSequence($exam);

            // Create session
            $session = ExamSession::create([
                'exam_id' => $exam->id,
                'student_id' => $student->id,
                'session_token' => $this->generateSessionToken(),
                'started_at' => now(),
                'scheduled_end_time' => now()->addMinutes($exam->duration_minutes),
                'question_sequence' => $questionSequence,
                'status' => 'in_progress',
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            // Log activity
            $this->logActivity($session, 'exam_started');

            return $session;
        });
    }

    /**
     * Save student answer with auto-save versioning
     */
    public function saveAnswer(ExamSession $session, int $questionId, $answer, bool $isFlagged = false): void
    {
        // Get current version
        $currentVersion = StudentAnswer::where('session_id', $session->id)
            ->where('question_id', $questionId)
            ->max('version') ?? 0;

        // Create new version
        StudentAnswer::create([
            'session_id' => $session->id,
            'question_id' => $questionId,
            'answer_text' => is_array($answer) ? null : $answer,
            'selected_option' => is_array($answer) ? $answer : null,
            'is_flagged' => $isFlagged,
            'version' => $currentVersion + 1,
            'is_final' => false, // Not final until submission
            'last_updated_at' => now(),
        ]);

        // Update session activity
        $session->update([
            'last_activity_at' => now(),
        ]);

        // Create snapshot every 10 answers or every 5 minutes
        $this->recoveryService->createSnapshotIfNeeded($session);
    }

    /**
     * Submit exam session
     */
    public function submitSession(ExamSession $session): array
    {
        return DB::transaction(function () use ($session) {
            // Mark all latest answers as final
            $this->markAnswersAsFinal($session);

            // Calculate score
            $result = app(GradingService::class)->gradeSession($session);

            // Update session
            $session->update([
                'status' => 'submitted',
                'submitted_at' => now(),
                'actual_end_time' => now(),
                'total_score' => $result['score'],
                'percentage' => $result['percentage'],
            ]);

            // Log activity
            $this->logActivity($session, 'exam_submitted');

            // Fire event
            event(new \App\Events\ExamSubmitted($session));

            return $result;
        });
    }

    /**
     * Recover interrupted session
     */
    public function recoverSession(ExamSession $session): ExamSession
    {
        return $this->recoveryService->recoverSession($session);
    }

    // Private helper methods...
    
    private function validateExamAccess(Exam $exam, User $student, ?string $password): void
    {
        // Check if exam is published
        if ($exam->status !== 'published') {
            throw new \Exception("Exam is not available");
        }

        // Check time window
        if (now()->lt($exam->start_time)) {
            throw new \Exception("Exam has not started yet");
        }

        if (now()->gt($exam->end_time)) {
            throw new \Exception("Exam has ended");
        }

        // Check password if required
        if ($exam->requires_password) {
            if (!$password || !Hash::check($password, $exam->exam_password_hash)) {
                throw new \Exception("Invalid exam password");
            }
        }

        // Check enrollment
        if (!$this->isStudentEnrolled($exam->course_id, $student->id)) {
            throw new \Exception("You are not enrolled in this course");
        }
    }

    private function generateQuestionSequence(Exam $exam): array
    {
        $questions = $exam->questions()->pluck('id')->toArray();
        
        if ($exam->randomize_questions) {
            shuffle($questions);
        }

        return $questions;
    }

    private function generateSessionToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    private function getExistingSession(Exam $exam, User $student): ?ExamSession
    {
        return ExamSession::where('exam_id', $exam->id)
            ->where('student_id', $student->id)
            ->first();
    }

    private function markAnswersAsFinal(ExamSession $session): void
    {
        // Get latest version of each answer
        $latestAnswers = StudentAnswer::where('session_id', $session->id)
            ->whereIn('id', function ($query) use ($session) {
                $query->selectRaw('MAX(id)')
                    ->from('student_answers')
                    ->where('session_id', $session->id)
                    ->groupBy('question_id');
            })
            ->update(['is_final' => true]);
    }

    private function isStudentEnrolled(int $courseId, int $studentId): bool
    {
        return \App\Models\CourseEnrollment::where('course_id', $courseId)
            ->where('student_id', $studentId)
            ->where('status', 'active')
            ->exists();
    }

    private function logActivity(ExamSession $session, string $action): void
    {
        \App\Models\ActivityLog::create([
            'user_id' => $session->student_id,
            'session_id' => $session->id,
            'action' => $action,
            'entity_type' => 'exam_session',
            'entity_id' => $session->id,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
```

---

### 3. Recovery Service (Critical for Auto-Save)

```php
<?php

namespace App\Services\Exam;

use App\Models\ExamSession;
use App\Models\SessionSnapshot;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Redis;

class RecoveryService
{
    /**
     * Create snapshot for crash recovery
     */
    public function createSnapshot(ExamSession $session, string $type = 'auto_save'): SessionSnapshot
    {
        $snapshotData = [
            'session_id' => $session->id,
            'current_question_index' => $session->current_question_index,
            'questions_answered' => $session->questions_answered,
            'questions_flagged' => $session->questions_flagged,
            'last_activity_at' => $session->last_activity_at,
            'answers' => $this->getCurrentAnswers($session),
        ];

        return SessionSnapshot::create([
            'session_id' => $session->id,
            'snapshot_data' => $snapshotData,
            'snapshot_type' => $type,
        ]);
    }

    /**
     * Create snapshot if needed (every 5 minutes or 10 answers)
     */
    public function createSnapshotIfNeeded(ExamSession $session): void
    {
        $lastSnapshot = SessionSnapshot::where('session_id', $session->id)
            ->latest()
            ->first();

        $shouldCreate = false;

        if (!$lastSnapshot) {
            $shouldCreate = true;
        } elseif ($lastSnapshot->created_at->diffInMinutes(now()) >= 5) {
            $shouldCreate = true;
        } elseif ($session->questions_answered % 10 === 0) {
            $shouldCreate = true;
        }

        if ($shouldCreate) {
            $this->createSnapshot($session);
            $this->cleanupOldSnapshots($session);
        }
    }

    /**
     * Recover session from last checkpoint
     */
    public function recoverSession(ExamSession $session): ExamSession
    {
        $latestSnapshot = SessionSnapshot::where('session_id', $session->id)
            ->latest()
            ->first();

        if (!$latestSnapshot) {
            // No snapshot, return current state
            return $session;
        }

        $data = $latestSnapshot->snapshot_data;

        // Restore session state
        $session->update([
            'current_question_index' => $data['current_question_index'],
            'questions_answered' => $data['questions_answered'],
            'questions_flagged' => $data['questions_flagged'],
            'status' => 'in_progress', // Reset from interrupted
        ]);

        return $session->fresh();
    }

    /**
     * Store session state in Redis for faster access
     */
    public function cacheSessionState(ExamSession $session): void
    {
        $key = "session:{$session->id}:state";
        $data = [
            'current_question_index' => $session->current_question_index,
            'time_remaining' => $session->scheduled_end_time->diffInSeconds(now()),
            'questions_answered' => $session->questions_answered,
        ];

        Redis::setex($key, 3600, json_encode($data));
    }

    /**
     * Get cached session state
     */
    public function getCachedSessionState(ExamSession $session): ?array
    {
        $key = "session:{$session->id}:state";
        $data = Redis::get($key);

        return $data ? json_decode($data, true) : null;
    }

    private function getCurrentAnswers(ExamSession $session): array
    {
        return \App\Models\StudentAnswer::where('session_id', $session->id)
            ->whereIn('id', function ($query) use ($session) {
                $query->selectRaw('MAX(id)')
                    ->from('student_answers')
                    ->where('session_id', $session->id)
                    ->groupBy('question_id');
            })
            ->get()
            ->map(fn($answer) => [
                'question_id' => $answer->question_id,
                'answer' => $answer->answer_text ?? $answer->selected_option,
                'is_flagged' => $answer->is_flagged,
                'version' => $answer->version,
            ])
            ->toArray();
    }

    private function cleanupOldSnapshots(ExamSession $session): void
    {
        // Keep only last 50 snapshots
        $snapshotsToDelete = SessionSnapshot::where('session_id', $session->id)
            ->orderBy('created_at', 'desc')
            ->skip(50)
            ->pluck('id');

        SessionSnapshot::whereIn('id', $snapshotsToDelete)->delete();
    }
}
```

---

### 4. Grading Service

```php
<?php

namespace App\Services\Exam;

use App\Models\ExamSession;
use App\Models\StudentAnswer;
use App\Models\Question;

class GradingService
{
    /**
     * Grade an exam session
     */
    public function gradeSession(ExamSession $session): array
    {
        $exam = $session->exam;
        $answers = StudentAnswer::where('session_id', $session->id)
            ->where('is_final', true)
            ->get();

        $totalScore = 0;
        $totalPossible = 0;
        $correctAnswers = 0;

        foreach ($answers as $answer) {
            $question = Question::find($answer->question_id);
            $examQuestion = $exam->examQuestions()
                ->where('question_id', $question->id)
                ->first();

            $pointsForQuestion = $examQuestion->points;
            $totalPossible += $pointsForQuestion;

            // Grade based on question type
            $isCorrect = $this->gradeAnswer($question, $answer);
            
            if ($isCorrect) {
                $totalScore += $pointsForQuestion;
                $correctAnswers++;
            }

            // Update answer with grading result
            $answer->update([
                'is_correct' => $isCorrect,
                'points_awarded' => $isCorrect ? $pointsForQuestion : 0,
            ]);
        }

        $percentage = $totalPossible > 0 ? ($totalScore / $totalPossible) * 100 : 0;

        return [
            'score' => $totalScore,
            'total_possible' => $totalPossible,
            'percentage' => round($percentage, 2),
            'correct_answers' => $correctAnswers,
            'total_questions' => $answers->count(),
            'passed' => $totalScore >= $exam->passing_marks,
        ];
    }

    /**
     * Grade individual answer based on question type
     */
    private function gradeAnswer(Question $question, StudentAnswer $answer): bool
    {
        return match($question->question_type) {
            'multiple_choice' => $this->gradeMultipleChoice($question, $answer),
            'true_false' => $this->gradeTrueFalse($question, $answer),
            'fill_in_blank' => $this->gradeFillInBlank($question, $answer),
            'essay' => false, // Manual grading required
            default => false,
        };
    }

    private function gradeMultipleChoice(Question $question, StudentAnswer $answer): bool
    {
        $correctAnswer = $question->correct_answer;
        $studentAnswer = $answer->selected_option;

        // Handle single answer
        if (is_string($correctAnswer)) {
            return $studentAnswer === $correctAnswer;
        }

        // Handle multiple correct answers
        if (is_array($correctAnswer) && is_array($studentAnswer)) {
            sort($correctAnswer);
            sort($studentAnswer);
            return $correctAnswer === $studentAnswer;
        }

        return false;
    }

    private function gradeTrueFalse(Question $question, StudentAnswer $answer): bool
    {
        return $answer->selected_option === $question->correct_answer;
    }

    private function gradeFillInBlank(Question $question, StudentAnswer $answer): bool
    {
        $correctAnswer = strtolower(trim($question->correct_answer));
        $studentAnswer = strtolower(trim($answer->answer_text));

        // Exact match or fuzzy match (using similar_text)
        if ($studentAnswer === $correctAnswer) {
            return true;
        }

        similar_text($correctAnswer, $studentAnswer, $percent);
        return $percent >= 90; // 90% similarity threshold
    }
}
```

---

## Request Validation (Form Requests)

```php
<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class StartExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->role === 'student';
    }

    public function rules(): array
    {
        return [
            'exam_id' => 'required|integer|exists:exams,id',
            'exam_password' => 'nullable|string|min:4',
        ];
    }

    public function messages(): array
    {
        return [
            'exam_id.required' => 'Exam ID is required',
            'exam_id.exists' => 'Invalid exam ID',
        ];
    }
}
```

---

## API Resources (Response Transformers)

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ExamSessionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'session_token' => $this->when(
                $request->user()->id === $this->student_id,
                $this->session_token
            ),
            'exam' => new ExamResource($this->whenLoaded('exam')),
            'started_at' => $this->started_at->toIso8601String(),
            'scheduled_end_time' => $this->scheduled_end_time->toIso8601String(),
            'time_remaining_seconds' => $this->scheduled_end_time->diffInSeconds(now()),
            'current_question_index' => $this->current_question_index,
            'questions_answered' => $this->questions_answered,
            'total_questions' => count($this->question_sequence),
            'status' => $this->status,
        ];
    }
}
```

---

## Middleware

### Role-Based Access Control

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        if (!$request->user() || !in_array($request->user()->role, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized access',
            ], 403);
        }

        return $next($request);
    }
}
```

---

## Queue Jobs

```php
<?php

namespace App\Jobs;

use App\Models\Exam;
use App\Services\Exam\GradingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessExamResults implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        private int $examId
    ) {}

    public function handle(GradingService $gradingService): void
    {
        $exam = Exam::find($this->examId);
        
        $sessions = $exam->sessions()
            ->where('status', 'submitted')
            ->whereNull('total_score') // Not yet graded
            ->get();

        foreach ($sessions as $session) {
            $result = $gradingService->gradeSession($session);
            
            $session->update([
                'total_score' => $result['score'],
                'percentage' => $result['percentage'],
            ]);
        }
    }
}
```

---

## Testing Strategy

### Unit Test Example

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\Exam\GradingService;
use App\Models\Question;
use App\Models\StudentAnswer;

class GradingServiceTest extends TestCase
{
    public function test_grades_multiple_choice_correctly()
    {
        $gradingService = new GradingService();

        $question = Question::factory()->create([
            'question_type' => 'multiple_choice',
            'correct_answer' => 'B',
        ]);

        $correctAnswer = StudentAnswer::factory()->create([
            'question_id' => $question->id,
            'selected_option' => 'B',
        ]);

        $incorrectAnswer = StudentAnswer::factory()->create([
            'question_id' => $question->id,
            'selected_option' => 'A',
        ]);

        $this->assertTrue($gradingService->gradeAnswer($question, $correctAnswer));
        $this->assertFalse($gradingService->gradeAnswer($question, $incorrectAnswer));
    }
}
```

### Feature Test Example

```php
<?php

namespace Tests\Feature\Exam;

use Tests\TestCase;
use App\Models\User;
use App\Models\Exam;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ExamSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_start_exam_session()
    {
        $student = User::factory()->student()->create();
        $exam = Exam::factory()->create(['status' => 'published']);

        $response = $this->actingAs($student)
            ->postJson('/api/v1/exam-sessions/start', [
                'exam_id' => $exam->id,
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'success',
                'data' => [
                    'session' => ['id', 'session_token']
                ]
            ]);
    }
}
```

---

## Performance Optimization

### Database Query Optimization

```php
// Use eager loading to avoid N+1 queries
$exams = Exam::with(['course', 'questions', 'sessions.student'])
    ->where('status', 'published')
    ->get();

// Use select to fetch only needed columns
$users = User::select('id', 'name', 'email')
    ->where('role', 'student')
    ->get();

// Use database indexing (in migrations)
$table->index('email');
$table->index(['exam_id', 'student_id']);
```

### Caching Strategy

```php
use Illuminate\Support\Facades\Cache;

// Cache exam configuration
$exam = Cache::remember("exam:{$examId}", 3600, function () use ($examId) {
    return Exam::with('questions')->find($examId);
});

// Cache user permissions
$permissions = Cache::tags(['user', "user:{$userId}"])
    ->remember("user:{$userId}:permissions", 3600, function () use ($userId) {
        return User::find($userId)->permissions;
    });
```

---

## Environment Configuration

### .env Example

```env
APP_NAME="CBT System"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://cbt.college.edu

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=cbt_online
DB_USERNAME=cbt_user
DB_PASSWORD=secure_password

CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=your-256-bit-secret
JWT_TTL=60

EXAM_AUTO_SAVE_INTERVAL=5
EXAM_SNAPSHOT_INTERVAL=300
EXAM_MAX_CONCURRENT_SESSIONS=5000
```

---

## Next Document

Proceed to **05_FRONTEND_ARCHITECTURE.md** for Next.js frontend structure.
