# CBT System - API Specification

## Document Purpose
Complete RESTful API specification for both Online Platform and Offline Exam System. Use this to build consistent, secure, and scalable APIs.

---

## API Design Principles

### 1. RESTful Standards
- Use HTTP methods semantically: `GET`, `POST`, `PUT/PATCH`, `DELETE`
- Resource-based URLs (nouns, not verbs)
- Consistent response format
- Proper HTTP status codes

### 2. Security
- JWT authentication on all authenticated routes
- Role-based access control (RBAC)
- Rate limiting
- Input validation
- CORS configuration

### 3. Versioning
- API version in URL: `/api/v1/...`
- Maintain backward compatibility
- Deprecation warnings in headers

### 4. Response Format
```json
{
  "success": true|false,
  "message": "Human-readable message",
  "data": {}, // or [] for collections
  "meta": {
    "timestamp": "2025-02-10T12:00:00Z",
    "version": "1.0"
  },
  "pagination": { // For paginated responses
    "current_page": 1,
    "total_pages": 10,
    "per_page": 20,
    "total": 200
  }
}
```

### 5. Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": ["Email is required", "Email must be valid"],
    "password": ["Password must be at least 8 characters"]
  },
  "error_code": "VALIDATION_ERROR",
  "meta": {
    "timestamp": "2025-02-10T12:00:00Z"
  }
}
```

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource (e.g., email exists) |
| 422 | Unprocessable Entity | Semantic validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

---

## Authentication & Authorization

### Authentication Endpoints

#### POST `/api/v1/auth/register`
Register a new user (students only via this endpoint)

**Request:**
```json
{
  "email": "student@college.edu",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Smith",
  "student_id": "2024/CS/001",
  "phone": "+234XXXXXXXXXX"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": 1,
      "uuid": "a1b2c3d4-...",
      "email": "student@college.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "student_id": "2024/CS/001"
    }
  }
}
```

---

#### POST `/api/v1/auth/login`
User authentication

**Request:**
```json
{
  "email": "student@college.edu",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "uuid": "a1b2c3d4-...",
      "email": "student@college.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "avatar_url": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

---

#### POST `/api/v1/auth/refresh`
Refresh JWT token

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600
  }
}
```

---

#### POST `/api/v1/auth/logout`
Invalidate current token

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

#### GET `/api/v1/auth/me`
Get current authenticated user

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "uuid": "a1b2c3d4-...",
      "email": "student@college.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "student_id": "2024/CS/001",
      "is_active": true,
      "is_verified": true,
      "last_login_at": "2025-02-10T12:00:00Z"
    }
  }
}
```

---

## User Management (Admin & Lecturer)

#### GET `/api/v1/users`
List all users (Admin only)

**Query Parameters:**
- `role` (optional): Filter by role (admin, lecturer, student)
- `search` (optional): Search by name, email, or ID
- `page` (optional): Page number (default: 1)
- `per_page` (optional): Results per page (default: 20, max: 100)
- `is_active` (optional): Filter by active status (true/false)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "...",
      "email": "student@college.edu",
      "first_name": "John",
      "last_name": "Doe",
      "role": "student",
      "student_id": "2024/CS/001",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "per_page": 20,
    "total": 95
  }
}
```

---

#### POST `/api/v1/users`
Create a new user (Admin only - for lecturers/admins)

**Request:**
```json
{
  "email": "lecturer@college.edu",
  "password": "SecurePass123!",
  "first_name": "Jane",
  "last_name": "Smith",
  "role": "lecturer",
  "staff_id": "STAFF/2024/001",
  "phone": "+234XXXXXXXXXX",
  "department_id": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": 2,
      "uuid": "...",
      "email": "lecturer@college.edu",
      "role": "lecturer"
    }
  }
}
```

---

#### PUT `/api/v1/users/{id}`
Update user (Admin or Self)

**Request:**
```json
{
  "first_name": "Jane Updated",
  "phone": "+234XXXXXXXXXX",
  "is_active": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": 2,
      "first_name": "Jane Updated"
    }
  }
}
```

---

#### DELETE `/api/v1/users/{id}`
Soft delete user (Admin only)

**Response (204):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## Course Management

#### GET `/api/v1/courses`
List all courses

**Query Parameters:**
- `department_id` (optional)
- `semester` (optional)
- `level` (optional)
- `search` (optional)
- `page`, `per_page`

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "...",
      "code": "CS101",
      "title": "Introduction to Computer Science",
      "department": {
        "id": 1,
        "code": "CS",
        "name": "Computer Science"
      },
      "credit_hours": 3,
      "semester": "Fall 2025",
      "level": "100L",
      "is_active": true
    }
  ]
}
```

---

#### POST `/api/v1/courses`
Create a course (Admin/Lecturer)

**Request:**
```json
{
  "department_id": 1,
  "code": "CS101",
  "title": "Introduction to Computer Science",
  "description": "Foundational course in CS",
  "credit_hours": 3,
  "semester": "Fall 2025",
  "academic_year": "2025/2026",
  "level": "100L"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course": {
      "id": 1,
      "code": "CS101",
      "title": "Introduction to Computer Science"
    }
  }
}
```

---

#### GET `/api/v1/courses/{id}`
Get single course details

**Response (200):**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": 1,
      "code": "CS101",
      "title": "Introduction to Computer Science",
      "description": "...",
      "department": {...},
      "lecturers": [
        {
          "id": 2,
          "name": "Dr. Jane Smith",
          "role": "coordinator"
        }
      ],
      "total_students": 150,
      "total_exams": 5
    }
  }
}
```

---

#### GET `/api/v1/courses/{id}/students`
Get enrolled students for a course (Lecturer/Admin)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "student_id": "2024/CS/001",
      "name": "John Doe",
      "email": "student@college.edu",
      "enrollment_date": "2025-01-15",
      "status": "active"
    }
  ]
}
```

---

#### POST `/api/v1/courses/{id}/enroll`
Enroll a student in a course

**Request:**
```json
{
  "student_id": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Student enrolled successfully"
}
```

---

## Question Bank

#### GET `/api/v1/questions`
List questions (Lecturer/Admin)

**Query Parameters:**
- `course_id` (required for lecturers)
- `question_type` (optional)
- `difficulty_level` (optional)
- `search` (optional)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "...",
      "question_text": "What is the capital of France?",
      "question_type": "multiple_choice",
      "options": [
        {"key": "A", "value": "London"},
        {"key": "B", "value": "Paris"},
        {"key": "C", "value": "Berlin"},
        {"key": "D", "value": "Madrid"}
      ],
      "correct_answer": "B",
      "points": 2.0,
      "difficulty_level": "easy",
      "course": {
        "id": 1,
        "code": "GEO101"
      },
      "created_by": {
        "id": 2,
        "name": "Dr. Jane Smith"
      }
    }
  ]
}
```

---

#### POST `/api/v1/questions`
Create a question (Lecturer)

**Request:**
```json
{
  "course_id": 1,
  "question_text": "What is the capital of France?",
  "question_type": "multiple_choice",
  "options": [
    {"key": "A", "value": "London"},
    {"key": "B", "value": "Paris"},
    {"key": "C", "value": "Berlin"},
    {"key": "D", "value": "Madrid"}
  ],
  "correct_answer": "B",
  "points": 2.0,
  "difficulty_level": "easy",
  "topic": "European Geography",
  "tags": ["geography", "capitals", "europe"]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question": {
      "id": 1,
      "uuid": "..."
    }
  }
}
```

---

#### PUT `/api/v1/questions/{id}`
Update a question (Lecturer - own questions only)

**Request:** (Same as create, partial updates allowed)

**Response (200):**
```json
{
  "success": true,
  "message": "Question updated successfully"
}
```

---

#### DELETE `/api/v1/questions/{id}`
Delete a question (Lecturer/Admin)

**Response (204)**

---

#### POST `/api/v1/questions/bulk-upload`
Bulk upload questions (Excel/CSV/JSON)

**Request:** (multipart/form-data)
```
file: questions.xlsx
course_id: 1
```

**Response (201):**
```json
{
  "success": true,
  "message": "Bulk upload completed",
  "data": {
    "total_processed": 100,
    "successful": 95,
    "failed": 5,
    "errors": [
      {
        "row": 15,
        "error": "Invalid question type"
      }
    ]
  }
}
```

---

## Exam Management

#### GET `/api/v1/exams`
List exams

**Query Parameters:**
- `course_id` (optional)
- `status` (optional)
- `exam_type` (optional)
- `upcoming` (optional): Show only upcoming exams

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "...",
      "title": "Midterm Exam - CS101",
      "course": {
        "id": 1,
        "code": "CS101",
        "title": "Intro to CS"
      },
      "exam_type": "midterm",
      "start_time": "2025-03-15T10:00:00Z",
      "end_time": "2025-03-15T12:00:00Z",
      "duration_minutes": 120,
      "total_marks": 100,
      "status": "published",
      "total_questions": 50,
      "total_enrolled": 150,
      "total_completed": 0
    }
  ]
}
```

---

#### POST `/api/v1/exams`
Create an exam (Lecturer)

**Request:**
```json
{
  "course_id": 1,
  "title": "Midterm Exam - CS101",
  "description": "Covers chapters 1-5",
  "instructions": "Answer all questions. No backtracking allowed.",
  "exam_type": "midterm",
  "start_time": "2025-03-15T10:00:00Z",
  "end_time": "2025-03-15T12:00:00Z",
  "duration_minutes": 120,
  "total_marks": 100,
  "passing_marks": 50,
  "randomize_questions": true,
  "randomize_options": true,
  "allow_backtrack": false,
  "questions_per_page": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Exam created successfully",
  "data": {
    "exam": {
      "id": 1,
      "uuid": "...",
      "status": "draft"
    }
  }
}
```

---

#### POST `/api/v1/exams/{id}/questions`
Add questions to exam

**Request:**
```json
{
  "questions": [
    {
      "question_id": 1,
      "points": 2.0,
      "order": 1
    },
    {
      "question_id": 2,
      "points": 3.0,
      "order": 2
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Questions added to exam",
  "data": {
    "total_questions": 2,
    "total_marks": 5.0
  }
}
```

---

#### POST `/api/v1/exams/{id}/publish`
Publish exam (make available to students)

**Response (200):**
```json
{
  "success": true,
  "message": "Exam published successfully"
}
```

---

#### GET `/api/v1/exams/{id}/results`
Get exam results (Lecturer/Admin)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "exam": {
      "id": 1,
      "title": "Midterm Exam"
    },
    "statistics": {
      "total_students": 150,
      "completed": 145,
      "in_progress": 3,
      "not_started": 2,
      "average_score": 75.5,
      "highest_score": 98,
      "lowest_score": 35,
      "pass_rate": 85.5
    },
    "results": [
      {
        "student": {
          "id": 1,
          "student_id": "2024/CS/001",
          "name": "John Doe"
        },
        "score": 85,
        "percentage": 85.0,
        "status": "submitted",
        "submitted_at": "2025-03-15T11:45:00Z"
      }
    ]
  }
}
```

---

## Exam Session (Offline - Student Exam Taking)

#### POST `/api/v1/exam-sessions/start`
Start an exam session

**Request:**
```json
{
  "exam_id": 1,
  "exam_password": "optional_password"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Exam session started",
  "data": {
    "session": {
      "id": 1,
      "uuid": "...",
      "session_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "exam": {
        "id": 1,
        "title": "Midterm Exam",
        "duration_minutes": 120,
        "total_questions": 50,
        "total_marks": 100,
        "instructions": "..."
      },
      "started_at": "2025-03-15T10:05:00Z",
      "scheduled_end_time": "2025-03-15T12:05:00Z",
      "current_question_index": 0,
      "questions_answered": 0
    }
  }
}
```

---

#### GET `/api/v1/exam-sessions/{id}/question`
Get current question (or specific question by index)

**Query Parameters:**
- `index` (optional): Question index (default: current)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "question": {
      "id": 1,
      "question_number": 1,
      "total_questions": 50,
      "question_text": "What is the capital of France?",
      "question_type": "multiple_choice",
      "options": [
        {"key": "A", "value": "London"},
        {"key": "B", "value": "Paris"},
        {"key": "C", "value": "Berlin"},
        {"key": "D", "value": "Madrid"}
      ],
      "points": 2.0,
      "has_image": false,
      "image_url": null
    },
    "session": {
      "time_remaining_seconds": 7080,
      "current_index": 0,
      "is_flagged": false,
      "saved_answer": null
    }
  }
}
```

---

#### POST `/api/v1/exam-sessions/{id}/answer`
Save answer (auto-save)

**Request:**
```json
{
  "question_id": 1,
  "answer": "B",
  "is_flagged": false,
  "time_spent_seconds": 45
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Answer saved",
  "data": {
    "saved_at": "2025-03-15T10:06:15Z",
    "version": 3
  }
}
```

---

#### POST `/api/v1/exam-sessions/{id}/submit`
Submit exam (final submission)

**Request:**
```json
{
  "confirm": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Exam submitted successfully",
  "data": {
    "session": {
      "id": 1,
      "status": "submitted",
      "submitted_at": "2025-03-15T11:45:00Z",
      "total_score": 85,
      "percentage": 85.0
    }
  }
}
```

---

#### GET `/api/v1/exam-sessions/{id}/status`
Get session status (for recovery)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": 1,
      "status": "in_progress",
      "current_question_index": 25,
      "questions_answered": 24,
      "time_remaining_seconds": 3600,
      "last_activity_at": "2025-03-15T10:45:00Z"
    }
  }
}
```

---

#### POST `/api/v1/exam-sessions/{id}/recover`
Recover interrupted session

**Response (200):**
```json
{
  "success": true,
  "message": "Session recovered",
  "data": {
    "session": {
      "id": 1,
      "current_question_index": 25,
      "recovered_from": "2025-03-15T10:45:00Z"
    }
  }
}
```

---

## Dashboard & Analytics

#### GET `/api/v1/dashboard/student`
Student dashboard

**Response (200):**
```json
{
  "success": true,
  "data": {
    "enrolled_courses": 6,
    "upcoming_exams": [
      {
        "id": 1,
        "course_code": "CS101",
        "title": "Midterm Exam",
        "start_time": "2025-03-15T10:00:00Z",
        "duration_minutes": 120
      }
    ],
    "recent_results": [
      {
        "exam_id": 2,
        "course_code": "MTH101",
        "title": "Quiz 1",
        "score": 18,
        "total": 20,
        "percentage": 90.0
      }
    ],
    "performance_summary": {
      "total_exams_taken": 5,
      "average_score": 82.5
    }
  }
}
```

---

#### GET `/api/v1/dashboard/lecturer`
Lecturer dashboard

**Response (200):**
```json
{
  "success": true,
  "data": {
    "assigned_courses": 3,
    "active_exams": 2,
    "pending_results": 1,
    "total_students": 450,
    "recent_activity": [...]
  }
}
```

---

#### GET `/api/v1/dashboard/admin`
Admin dashboard

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total_users": 5000,
    "total_students": 4500,
    "total_lecturers": 150,
    "active_exams": 10,
    "system_health": {
      "database": "healthy",
      "cache": "healthy",
      "disk_usage": "45%"
    }
  }
}
```

---

## Notifications

#### GET `/api/v1/notifications`
Get user notifications

**Query Parameters:**
- `unread_only` (optional): Show only unread

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Exam Reminder",
      "message": "Your CS101 Midterm Exam starts in 1 hour",
      "type": "exam_reminder",
      "is_read": false,
      "created_at": "2025-03-15T09:00:00Z"
    }
  ]
}
```

---

#### PATCH `/api/v1/notifications/{id}/read`
Mark notification as read

**Response (200):**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

---

## Rate Limiting

| Endpoint Pattern | Rate Limit |
|------------------|------------|
| `/api/v1/auth/login` | 5 requests/minute |
| `/api/v1/auth/*` | 10 requests/minute |
| `/api/v1/exam-sessions/*/answer` | 100 requests/minute |
| `/api/v1/*` (general) | 60 requests/minute |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1615824000
```

---

## WebSocket Events (Real-time Features)

### Connection
```javascript
const socket = io('wss://exam.college.edu', {
  auth: {
    token: 'JWT_TOKEN'
  }
});
```

### Events

#### Exam Monitoring (Lecturer/Admin)
```javascript
// Subscribe to exam
socket.emit('subscribe:exam', { exam_id: 1 });

// Receive updates
socket.on('exam:student-progress', (data) => {
  // { student_id, questions_answered, current_question }
});

socket.on('exam:submission', (data) => {
  // { student_id, score, submitted_at }
});
```

#### Student Session (Auto-save confirmation)
```javascript
socket.on('answer:saved', (data) => {
  // { question_id, version, saved_at }
});

socket.on('session:warning', (data) => {
  // { message: 'Connection unstable', severity: 'warning' }
});
```

---

## File Upload Endpoints

#### POST `/api/v1/upload/image`
Upload image (for questions)

**Request:** (multipart/form-data)
```
file: image.png
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "url": "https://cdn.college.edu/images/abc123.png",
    "filename": "abc123.png",
    "size": 245760
  }
}
```

---

## Next Document

Proceed to **04_BACKEND_ARCHITECTURE.md** for PHP backend structure.
