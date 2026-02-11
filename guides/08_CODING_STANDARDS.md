# CBT System - Coding Standards & Best Practices

## Document Purpose
Comprehensive coding guidelines for maintaining code quality, consistency, and maintainability across the entire development team.

---

## General Principles

### 1. SOLID Principles
- **Single Responsibility**: Each class should have one reason to change
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable for base classes
- **Interface Segregation**: Clients shouldn't depend on interfaces they don't use
- **Dependency Inversion**: Depend on abstractions, not concretions

### 2. DRY (Don't Repeat Yourself)
- Extract common logic into reusable functions/classes
- Use inheritance and composition appropriately
- Create helper utilities for repeated operations

### 3. KISS (Keep It Simple, Stupid)
- Favor simple solutions over clever ones
- Write code for humans to read
- Avoid premature optimization

### 4. YAGNI (You Aren't Gonna Need It)
- Don't build features until they're needed
- Focus on current requirements
- Avoid speculative generality

---

## PHP Backend Standards (Laravel)

### Naming Conventions

```php
<?php

// ✅ GOOD - Clear, descriptive names

// Classes: PascalCase
class ExamSessionController {}
class UserService {}

// Methods: camelCase
public function createExam() {}
public function getUserById() {}

// Variables: camelCase
$examSession = new ExamSession();
$totalScore = 0;

// Constants: SCREAMING_SNAKE_CASE
const MAX_EXAM_DURATION = 180;
const AUTO_SAVE_INTERVAL = 5;

// Database tables: plural, snake_case
// exam_sessions, student_answers, activity_logs

// Model names: singular, PascalCase
class ExamSession extends Model {}
class StudentAnswer extends Model {}

// Controllers: PascalCase + "Controller"
class ExamController {}

// Requests: PascalCase + "Request"
class CreateExamRequest {}

// Resources: PascalCase + "Resource"
class ExamResource {}
```

---

### File Organization

```php
<?php

// Each file should contain only ONE class
// File name must match class name exactly

// ✅ GOOD
// File: app/Services/Exam/SessionService.php
namespace App\Services\Exam;

class SessionService
{
    // ...
}

// ❌ BAD
// File: app/Services/services.php
class SessionService {}
class GradingService {}  // Multiple classes in one file
```

---

### Method Structure

```php
<?php

namespace App\Services\Exam;

use App\Models\ExamSession;
use App\Models\Exam;
use App\Exceptions\ExamNotFoundException;

class SessionService
{
    // ✅ GOOD - Well-structured method
    
    /**
     * Start a new exam session
     *
     * @param int $examId
     * @param User $student
     * @return ExamSession
     * @throws ExamNotFoundException
     */
    public function startSession(int $examId, User $student): ExamSession
    {
        // 1. Validate input
        $exam = $this->getExam($examId);
        
        // 2. Check permissions
        $this->validateExamAccess($exam, $student);
        
        // 3. Business logic
        $session = $this->createSession($exam, $student);
        
        // 4. Log and return
        $this->logActivity($session, 'started');
        
        return $session;
    }
    
    // Private helper methods below public methods
    private function getExam(int $examId): Exam
    {
        $exam = Exam::find($examId);
        
        if (!$exam) {
            throw new ExamNotFoundException("Exam #{$examId} not found");
        }
        
        return $exam;
    }
    
    private function validateExamAccess(Exam $exam, User $student): void
    {
        if ($exam->status !== 'published') {
            throw new \Exception("Exam is not available");
        }
        
        // More validation...
    }
}
```

---

### Error Handling

```php
<?php

// ✅ GOOD - Specific exceptions
class ExamNotFoundException extends Exception {}
class ExamAlreadyStartedException extends Exception {}

// Usage
public function startSession(int $examId)
{
    try {
        $exam = $this->getExam($examId);
        // ...
    } catch (ExamNotFoundException $e) {
        return response()->json([
            'success' => false,
            'message' => 'Exam not found',
        ], 404);
    } catch (ExamAlreadyStartedException $e) {
        return response()->json([
            'success' => false,
            'message' => 'You have already started this exam',
        ], 409);
    }
}

// ❌ BAD - Catching generic Exception
try {
    // code
} catch (Exception $e) {
    // Too broad
}
```

---

### Database Queries

```php
<?php

// ✅ GOOD - Efficient queries with eager loading
$exams = Exam::with(['course', 'questions', 'sessions'])
    ->where('status', 'published')
    ->orderBy('start_time')
    ->get();

// ✅ GOOD - Query scopes for reusability
class Exam extends Model
{
    public function scopePublished($query)
    {
        return $query->where('status', 'published');
    }
    
    public function scopeUpcoming($query)
    {
        return $query->where('start_time', '>', now());
    }
}

// Usage
$upcomingExams = Exam::published()->upcoming()->get();

// ❌ BAD - N+1 query problem
$exams = Exam::all();
foreach ($exams as $exam) {
    echo $exam->course->name;  // Triggers additional query
}

// ✅ GOOD - Use chunk for large datasets
Exam::where('status', 'completed')
    ->chunk(100, function ($exams) {
        foreach ($exams as $exam) {
            // Process exam
        }
    });

// ❌ BAD - Loading all records into memory
$exams = Exam::all();  // Could be millions of records
```

---

### Validation

```php
<?php

namespace App\Http\Requests\Exam;

use Illuminate\Foundation\Http\FormRequest;

class CreateExamRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->role === 'lecturer';
    }

    public function rules(): array
    {
        return [
            'course_id' => 'required|integer|exists:courses,id',
            'title' => 'required|string|max:255',
            'start_time' => 'required|date|after:now',
            'end_time' => 'required|date|after:start_time',
            'duration_minutes' => 'required|integer|min:15|max:300',
            'total_marks' => 'required|numeric|min:1',
            'passing_marks' => 'required|numeric|lte:total_marks',
            'questions' => 'required|array|min:1',
            'questions.*.id' => 'required|exists:questions,id',
            'questions.*.points' => 'required|numeric|min:0.5',
        ];
    }

    public function messages(): array
    {
        return [
            'end_time.after' => 'End time must be after start time',
            'passing_marks.lte' => 'Passing marks cannot exceed total marks',
        ];
    }

    // Custom validation logic
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->somethingElseIsInvalid()) {
                $validator->errors()->add('field', 'Something is wrong!');
            }
        });
    }
}
```

---

### Comments & Documentation

```php
<?php

// ✅ GOOD - PHPDoc for all public methods
/**
 * Calculate the final score for an exam session
 *
 * This method processes all student answers, applies grading logic
 * based on question types, and returns a comprehensive result array.
 *
 * @param ExamSession $session The exam session to grade
 * @return array{
 *     score: float,
 *     total_possible: float,
 *     percentage: float,
 *     correct_answers: int,
 *     total_questions: int,
 *     passed: bool
 * }
 */
public function gradeSession(ExamSession $session): array
{
    // Implementation
}

// ✅ GOOD - Inline comments for complex logic
// Calculate weighted average based on question difficulty
$weightedScore = ($easyScore * 0.3) + ($mediumScore * 0.5) + ($hardScore * 0.2);

// ❌ BAD - Obvious comments
$i++; // Increment i
$total = $a + $b; // Add a and b

// ✅ GOOD - Self-documenting code
$isExamAccessible = $exam->isPublished() && 
                    $exam->isWithinTimeWindow() && 
                    $student->isEnrolled($exam->course_id);

// ❌ BAD - Needs comment to explain
if ($e->s == 'p' && now()->between($e->st, $e->et) && $s->c($e->cid)) {
    // What does this do?
}
```

---

## TypeScript/Next.js Frontend Standards

### Naming Conventions

```typescript
// ✅ GOOD

// Components: PascalCase
export default function ExamQuestionDisplay() {}
export const AnswerInput = () => {}

// Functions: camelCase
const handleSubmit = () => {}
const fetchExamData = async () => {}

// Variables: camelCase
const examSession = useState(null);
const isLoading = false;

// Types/Interfaces: PascalCase
interface ExamSession {
  id: number;
  examId: number;
}

type QuestionType = 'multiple_choice' | 'true_false' | 'essay';

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.college.edu';
const MAX_RETRY_ATTEMPTS = 3;

// Files: kebab-case
// exam-session.ts, question-display.tsx, use-exam.ts
```

---

### Component Structure

```typescript
// ✅ GOOD - Well-organized React component

'use client'; // If using client components

import { useState, useEffect } from 'react';
import { useExamSession } from '@/lib/hooks/useExamSession';
import QuestionDisplay from './QuestionDisplay';
import ExamTimer from './ExamTimer';

// Types at the top
interface ExamPageProps {
  sessionId: number;
}

// Component
export default function ExamPage({ sessionId }: ExamPageProps) {
  // Hooks first
  const { session, currentQuestion, isLoading } = useExamSession(sessionId);
  const [answer, setAnswer] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // Event handlers
  const handleAnswerChange = (value: string) => {
    setAnswer(value);
  };

  const handleSubmit = async () => {
    try {
      // Submit logic
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  // Conditional rendering
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!session || !currentQuestion) {
    return <ErrorMessage />;
  }

  // Main render
  return (
    <div className="exam-container">
      <ExamTimer timeRemaining={session.timeRemaining} />
      <QuestionDisplay
        question={currentQuestion}
        answer={answer}
        onAnswerChange={handleAnswerChange}
      />
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

// Helper functions outside component (if not used elsewhere, move to utils)
function calculateProgress(current: number, total: number): number {
  return (current / total) * 100;
}
```

---

### TypeScript Best Practices

```typescript
// ✅ GOOD - Explicit types

interface User {
  id: number;
  email: string;
  role: 'admin' | 'lecturer' | 'student';
}

const getUser = async (id: number): Promise<User> => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
};

// ✅ GOOD - Type guards
function isStudent(user: User): user is User & { studentId: string } {
  return user.role === 'student';
}

if (isStudent(user)) {
  console.log(user.studentId); // TypeScript knows this exists
}

// ❌ BAD - Using 'any'
const getData = async (): Promise<any> => {
  // Loses type safety
};

// ✅ GOOD - Proper typing
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const getData = async (): Promise<ApiResponse<User[]>> => {
  // Type safe
};

// ✅ GOOD - Discriminated unions
type ExamStatus = 
  | { type: 'loading' }
  | { type: 'loaded'; data: Exam }
  | { type: 'error'; error: string };

function renderExam(status: ExamStatus) {
  switch (status.type) {
    case 'loading':
      return <Spinner />;
    case 'loaded':
      return <ExamView exam={status.data} />;
    case 'error':
      return <Error message={status.error} />;
  }
}
```

---

### React Hooks Best Practices

```typescript
// ✅ GOOD - Custom hook

export const useExamTimer = (durationSeconds: number) => {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 0) {
      setIsExpired(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
  };
};

// ✅ GOOD - useCallback for event handlers
const handleSave = useCallback(
  async (answer: string) => {
    await saveAnswer(questionId, answer);
  },
  [questionId] // Dependencies
);

// ✅ GOOD - useMemo for expensive computations
const sortedQuestions = useMemo(
  () => questions.sort((a, b) => a.order - b.order),
  [questions]
);

// ❌ BAD - Missing dependencies
useEffect(() => {
  fetchData(userId); // userId is used but not in deps
}, []); // Empty deps array

// ✅ GOOD - Proper dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

---

## General Code Quality

### Function Length

```typescript
// ✅ GOOD - Short, focused functions (< 20 lines)
const calculateScore = (answers: Answer[], questions: Question[]): number => {
  let total = 0;
  
  for (const answer of answers) {
    const question = questions.find(q => q.id === answer.questionId);
    if (question && isCorrect(answer, question)) {
      total += question.points;
    }
  }
  
  return total;
};

// ❌ BAD - Function too long (100+ lines)
const processExam = () => {
  // Validate
  // Calculate scores
  // Send notifications
  // Update database
  // Generate report
  // ... 100 more lines
};

// ✅ GOOD - Split into smaller functions
const processExam = async (exam: Exam) => {
  validateExam(exam);
  const scores = calculateScores(exam);
  await updateDatabase(scores);
  await sendNotifications(scores);
  return generateReport(scores);
};
```

---

### Error Messages

```typescript
// ✅ GOOD - User-friendly error messages
throw new Error('Unable to submit exam. Please check your connection and try again.');

// ❌ BAD - Technical jargon
throw new Error('ECONNREFUSED: Connection refused at TCP wrapper');

// ✅ GOOD - Informative validation errors
if (!email.includes('@')) {
  throw new ValidationError('Please enter a valid email address');
}

// ❌ BAD - Vague errors
throw new Error('Invalid input');
```

---

## Testing Standards

### Unit Tests

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\Exam\GradingService;

class GradingServiceTest extends TestCase
{
    private GradingService $gradingService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gradingService = new GradingService();
    }

    /** @test */
    public function it_grades_multiple_choice_correctly()
    {
        // Arrange
        $question = $this->createMultipleChoiceQuestion('B');
        $correctAnswer = $this->createAnswer('B');
        $incorrectAnswer = $this->createAnswer('A');

        // Act
        $isCorrect = $this->gradingService->gradeAnswer($question, $correctAnswer);
        $isIncorrect = $this->gradingService->gradeAnswer($question, $incorrectAnswer);

        // Assert
        $this->assertTrue($isCorrect);
        $this->assertFalse($isIncorrect);
    }

    /** @test */
    public function it_calculates_percentage_correctly()
    {
        // Arrange
        $totalScore = 75;
        $totalPossible = 100;

        // Act
        $percentage = $this->gradingService->calculatePercentage($totalScore, $totalPossible);

        // Assert
        $this->assertEquals(75.0, $percentage);
    }
}
```

---

### Frontend Tests

```typescript
// Jest + React Testing Library

import { render, screen, fireEvent } from '@testing-library/react';
import QuestionDisplay from './QuestionDisplay';

describe('QuestionDisplay', () => {
  const mockQuestion = {
    id: 1,
    questionText: 'What is 2 + 2?',
    questionType: 'multiple_choice',
    options: [
      { key: 'A', value: '3' },
      { key: 'B', value: '4' },
      { key: 'C', value: '5' },
    ],
  };

  it('renders question text', () => {
    render(<QuestionDisplay question={mockQuestion} />);
    
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
  });

  it('calls onAnswerChange when option is selected', () => {
    const handleAnswerChange = jest.fn();
    
    render(
      <QuestionDisplay
        question={mockQuestion}
        onAnswerChange={handleAnswerChange}
      />
    );

    const optionB = screen.getByLabelText(/4/);
    fireEvent.click(optionB);

    expect(handleAnswerChange).toHaveBeenCalledWith('B');
  });
});
```

---

## Git Commit Standards

### Commit Message Format

```bash
# Format: <type>(<scope>): <subject>

# Types:
# feat: New feature
# fix: Bug fix
# docs: Documentation changes
# style: Code style (formatting, missing semi-colons, etc)
# refactor: Code refactoring
# test: Adding or updating tests
# chore: Maintenance tasks

# Examples:

feat(exam): Add auto-save functionality
fix(auth): Resolve JWT expiration issue
docs(api): Update API documentation for exam endpoints
refactor(grading): Simplify grading algorithm
test(session): Add unit tests for session recovery

# Commit body (optional, but recommended for complex changes):
feat(exam): Add auto-save functionality

- Implement 5-second auto-save interval
- Add session recovery on page reload
- Store state in Redis for persistence

Closes #123
```

---

### Branch Naming

```bash
# Format: <type>/<description>

# Examples:
feature/exam-auto-save
fix/authentication-bug
hotfix/security-vulnerability
docs/api-documentation
refactor/database-queries
```

---

## Code Review Checklist

Before submitting code for review:

- [ ] Code follows style guide
- [ ] All tests pass
- [ ] New features have tests
- [ ] No console.log() or dd() left in code
- [ ] No commented-out code
- [ ] Meaningful variable names
- [ ] Functions are focused and < 20 lines
- [ ] No security vulnerabilities
- [ ] Documentation updated
- [ ] Commit messages are clear

---

## Performance Guidelines

### Backend

```php
<?php

// ✅ GOOD - Eager loading
$exams = Exam::with('questions', 'course')->get();

// ✅ GOOD - Caching
$exams = Cache::remember('upcoming-exams', 3600, function () {
    return Exam::published()->upcoming()->get();
});

// ✅ GOOD - Database indexing
Schema::table('exam_sessions', function (Blueprint $table) {
    $table->index(['exam_id', 'student_id']);
    $table->index('status');
});

// ✅ GOOD - Query optimization
$sessions = ExamSession::select('id', 'exam_id', 'status')
    ->where('status', 'in_progress')
    ->limit(100)
    ->get();
```

### Frontend

```typescript
// ✅ GOOD - Lazy loading
const ExamResults = lazy(() => import('./ExamResults'));

// ✅ GOOD - Memoization
const expensiveCalculation = useMemo(
  () => processLargeDataset(data),
  [data]
);

// ✅ GOOD - Debouncing
const debouncedSearch = useDebouncedCallback(
  (value) => performSearch(value),
  300
);

// ✅ GOOD - Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';
```

---

## Security Guidelines

- [ ] Never commit secrets/credentials
- [ ] Always use parameterized queries
- [ ] Validate and sanitize all inputs
- [ ] Escape all outputs
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Hash passwords with bcrypt
- [ ] Use CSRF protection
- [ ] Implement proper CORS
- [ ] Keep dependencies updated

---

## Documentation

Every project should have:

1. **README.md** - Setup instructions, overview
2. **API Documentation** - All endpoints documented
3. **Database Schema** - ER diagrams, table descriptions
4. **Deployment Guide** - How to deploy
5. **Contributing Guide** - How to contribute

---

This concludes the comprehensive coding standards document. Following these guidelines will ensure high-quality, maintainable, and secure code across the CBT system.
