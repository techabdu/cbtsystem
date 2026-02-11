# CBT System - Database Schema Design

## Document Purpose
Complete database schema for both the Online Platform and Offline Exam databases. Designed for MySQL 8.0+ with InnoDB engine.

---

## Database Strategy

### Two Separate Databases

1. **Online Platform Database** (`cbt_online`)
   - User management
   - Course management
   - Question bank
   - Analytics and reporting
   - Practice exams

2. **Offline Exam Database** (`cbt_exam`)
   - Synced question subsets
   - Exam sessions
   - Student responses
   - Real-time monitoring
   - Auto-save data

**Synchronization**: One-way sync from `cbt_online` → `cbt_exam` before exam periods

---

## Naming Conventions

- **Tables**: `snake_case`, plural nouns (e.g., `users`, `exam_sessions`)
- **Columns**: `snake_case` (e.g., `first_name`, `created_at`)
- **Primary Keys**: `id` (BIGSERIAL/BIGINT)
- **Foreign Keys**: `{table_singular}_id` (e.g., `user_id`, `course_id`)
- **Timestamps**: `created_at`, `updated_at`, `deleted_at` (soft deletes)
- **Boolean**: Prefix with `is_`, `has_`, `can_` (e.g., `is_active`, `has_submitted`)

---

## Schema Design Principles

1. **Normalization**: 3rd Normal Form (3NF) minimum
2. **Soft Deletes**: Use `deleted_at` for audit trail
3. **Audit Fields**: Every table has `created_at`, `updated_at`
4. **UUID Support**: Optional `uuid` column for public identifiers
5. **Indexing**: Strategic indexes on foreign keys and query columns
6. **Constraints**: Enforce data integrity at DB level

---

## Core Tables - Online Platform Database

### 1. Users Table

```sql
-- Users: Central authentication and user management
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    student_id VARCHAR(50) UNIQUE, -- For students only
    staff_id VARCHAR(50) UNIQUE, -- For lecturers/admins
    
    -- Contact
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    
    -- Role & Status
    role ENUM('admin', 'lecturer', 'student') NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Security
    email_verified_at TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    password_changed_at TIMESTAMP NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP NULL,
    
    -- Metadata
    metadata JSON, -- Flexible field for additional data
    
    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_users_email (email, deleted_at),
    INDEX idx_users_role (role, deleted_at),
    INDEX idx_users_student_id (student_id, deleted_at),
    INDEX idx_users_uuid (uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. Departments Table

```sql
-- Departments: Academic departments
CREATE TABLE departments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    code VARCHAR(20) UNIQUE NOT NULL, -- e.g., 'CS', 'ENG', 'BIO'
    name VARCHAR(200) NOT NULL,
    description TEXT,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    INDEX idx_departments_code (code, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 3. Courses Table

```sql
-- Courses: Academic courses
CREATE TABLE courses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,
    
    department_id BIGINT UNSIGNED NOT NULL,
    
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'CS101', 'MTH202'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    credit_hours INTEGER,
    semester VARCHAR(20), -- e.g., 'Fall 2025', 'Spring 2026'
    academic_year VARCHAR(20), -- e.g., '2025/2026'
    level VARCHAR(20), -- e.g., '100L', '200L', '300L', '400L'
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    INDEX idx_courses_department (department_id, deleted_at),
    INDEX idx_courses_code (code, deleted_at),
    INDEX idx_courses_semester (semester, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 4. Course Enrollments Table

```sql
-- Course Enrollments: Student-Course relationship
CREATE TABLE course_enrollments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    student_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    
    enrollment_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    status ENUM('active', 'dropped', 'completed') NOT NULL DEFAULT 'active',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, course_id),
    INDEX idx_enrollments_student (student_id),
    INDEX idx_enrollments_course (course_id),
    INDEX idx_enrollments_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 5. Course Lecturers Table

```sql
-- Course Lecturers: Lecturer-Course assignment
CREATE TABLE course_lecturers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    lecturer_id BIGINT UNSIGNED NOT NULL,
    course_id BIGINT UNSIGNED NOT NULL,
    
    role ENUM('lecturer', 'coordinator', 'assistant') NOT NULL DEFAULT 'lecturer',
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (lecturer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment (lecturer_id, course_id),
    INDEX idx_course_lecturers_lecturer (lecturer_id),
    INDEX idx_course_lecturers_course (course_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 6. Question Bank Table

```sql
-- Questions: Master question repository
CREATE TABLE questions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,
    
    course_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    
    -- Question Content
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'fill_in_blank', 'essay', 'matching') NOT NULL,
    
    -- For multiple choice, true/false, matching
    options JSON, -- Array of options: [{"key": "A", "value": "Option text"}, ...]
    correct_answer JSON, -- Can be single value or array for multiple correct answers
    
    -- Media attachments
    has_image BOOLEAN DEFAULT FALSE,
    image_url VARCHAR(500),
    has_audio BOOLEAN DEFAULT FALSE,
    audio_url VARCHAR(500),
    
    -- Configuration
    points DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    difficulty_level ENUM('easy', 'medium', 'hard'),
    
    -- Categorization
    topic VARCHAR(200),
    tags JSON, -- Array of tags for filtering
    
    -- Analytics
    times_used INTEGER DEFAULT 0,
    average_score DECIMAL(5,2),
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by BIGINT UNSIGNED,
    verified_at TIMESTAMP NULL,
    
    -- Metadata
    metadata JSON,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (verified_by) REFERENCES users(id),
    INDEX idx_questions_course (course_id, deleted_at),
    INDEX idx_questions_created_by (created_by),
    INDEX idx_questions_type (question_type, deleted_at),
    INDEX idx_questions_difficulty (difficulty_level, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 7. Exams Table

```sql
-- Exams: Exam configuration and metadata
CREATE TABLE exams (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,
    
    course_id BIGINT UNSIGNED NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    
    -- Exam Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    
    -- Exam Type
    exam_type ENUM('midterm', 'final', 'quiz', 'practice', 'makeup') NOT NULL,
    
    -- Scheduling
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL, -- Per-student duration
    
    -- Configuration
    total_marks DECIMAL(6,2) NOT NULL,
    passing_marks DECIMAL(6,2) NOT NULL,
    
    -- Question Selection
    randomize_questions BOOLEAN DEFAULT TRUE,
    randomize_options BOOLEAN DEFAULT TRUE,
    questions_per_page INTEGER DEFAULT 1,
    
    -- Rules
    allow_backtrack BOOLEAN DEFAULT FALSE, -- Can student go back to previous questions?
    show_results_immediately BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT FALSE,
    
    -- Access Control
    requires_password BOOLEAN DEFAULT FALSE,
    exam_password_hash VARCHAR(255),
    allowed_student_ids JSON, -- Array of student IDs if restricted
    
    -- Status
    status ENUM('draft', 'published', 'ongoing', 'completed', 'archived') NOT NULL DEFAULT 'draft',
    is_practice BOOLEAN DEFAULT FALSE, -- Practice exam vs real exam
    
    -- Proctoring (future feature)
    enable_proctoring BOOLEAN DEFAULT FALSE,
    proctoring_config JSON,
    
    -- Metadata
    metadata JSON,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_exams_course (course_id, deleted_at),
    INDEX idx_exams_status (status, deleted_at),
    INDEX idx_exams_start_time (start_time, deleted_at),
    INDEX idx_exams_type (exam_type, deleted_at),
    CONSTRAINT valid_exam_time CHECK (end_time > start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 8. Exam Questions Table

```sql
-- Exam Questions: Links questions to specific exams
CREATE TABLE exam_questions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    exam_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    
    -- Order and scoring
    question_order INTEGER NOT NULL,
    points DECIMAL(5,2) NOT NULL, -- Can override question's default points
    
    -- Question variation (for randomization)
    is_required BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_exam_question (exam_id, question_id),
    INDEX idx_exam_questions_exam (exam_id),
    INDEX idx_exam_questions_question (question_id),
    INDEX idx_exam_questions_order (exam_id, question_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Core Tables - Offline Exam Database

### 9. Exam Sessions Table (CRITICAL)

```sql
-- Exam Sessions: Individual student exam attempts
CREATE TABLE exam_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(36) UNIQUE NOT NULL,
    
    exam_id BIGINT UNSIGNED NOT NULL, -- References online DB exam ID
    student_id BIGINT UNSIGNED NOT NULL, -- References online DB user ID
    
    -- Session Tracking
    session_token VARCHAR(255) UNIQUE NOT NULL, -- JWT or UUID for authentication
    
    -- Timing
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scheduled_end_time TIMESTAMP NOT NULL, -- started_at + duration_minutes
    submitted_at TIMESTAMP NULL,
    actual_end_time TIMESTAMP NULL,
    
    -- Question Order (personalized)
    question_sequence JSON NOT NULL, -- Array of question IDs in random order for this student
    
    -- Progress Tracking
    current_question_index INTEGER NOT NULL DEFAULT 0,
    questions_answered INTEGER NOT NULL DEFAULT 0,
    questions_flagged JSON DEFAULT (JSON_ARRAY()), -- Array of question IDs marked for review
    
    -- Status
    status ENUM('not_started', 'in_progress', 'submitted', 'auto_submitted', 'interrupted') NOT NULL DEFAULT 'in_progress',
    
    -- Recovery Data
    last_activity_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    recovery_data JSON, -- Complete session state for crash recovery
    
    -- Scoring
    total_score DECIMAL(6,2),
    percentage DECIMAL(5,2),
    
    -- Integrity
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    
    -- Flags
    has_violations BOOLEAN DEFAULT FALSE,
    violation_count INTEGER DEFAULT 0,
    violations JSON DEFAULT (JSON_ARRAY()), -- Array of violation events
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_session (exam_id, student_id), -- One session per student per exam
    INDEX idx_sessions_exam (exam_id),
    INDEX idx_sessions_student (student_id),
    INDEX idx_sessions_status (status),
    INDEX idx_sessions_token (session_token),
    INDEX idx_sessions_activity (last_activity_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 10. Student Answers Table (CRITICAL - High Write Volume)

```sql
-- Student Answers: Real-time answer storage
CREATE TABLE student_answers (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    session_id BIGINT UNSIGNED NOT NULL,
    question_id BIGINT UNSIGNED NOT NULL,
    
    -- Answer Content
    answer_text TEXT, -- For essay/fill-in-blank
    selected_option JSON, -- For multiple choice: single value or array
    
    -- Metadata
    is_flagged BOOLEAN DEFAULT FALSE, -- Marked for review
    time_spent_seconds INTEGER, -- Time spent on this question
    
    -- Versioning (for auto-save)
    version INTEGER NOT NULL DEFAULT 1,
    is_final BOOLEAN DEFAULT FALSE,
    
    -- Scoring (populated after submission)
    is_correct BOOLEAN,
    points_awarded DECIMAL(5,2),
    
    -- Timestamps
    first_answered_at TIMESTAMP NULL,
    last_updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_answer_version (session_id, question_id, version),
    INDEX idx_answers_session (session_id),
    INDEX idx_answers_question (question_id),
    INDEX idx_answers_final (session_id, is_final),
    INDEX idx_answers_updated (last_updated_at),
    
    -- Partial index for active answers
    INDEX idx_answers_active (session_id, question_id, is_final)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 11. Session Snapshots Table (Auto-Save Storage)

```sql
-- Session Snapshots: Complete session state backups
CREATE TABLE session_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    session_id BIGINT UNSIGNED NOT NULL,
    
    -- Complete State
    snapshot_data JSON NOT NULL, -- Full session state including all answers
    
    -- Metadata
    snapshot_type ENUM('auto_save', 'manual', 'recovery', 'checkpoint') NOT NULL,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
    INDEX idx_snapshots_session (session_id),
    INDEX idx_snapshots_created (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Keep only last 50 snapshots per session (cleanup policy)
```

---

### 12. Activity Logs Table

```sql
-- Activity Logs: Audit trail for all actions
CREATE TABLE activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    user_id BIGINT UNSIGNED,
    session_id BIGINT UNSIGNED,
    
    -- Action Details
    action VARCHAR(100) NOT NULL, -- e.g., 'login', 'answer_saved', 'exam_submitted'
    entity_type VARCHAR(50), -- e.g., 'exam', 'question', 'user'
    entity_id BIGINT UNSIGNED,
    
    -- Context
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Data
    old_values JSON,
    new_values JSON,
    metadata JSON,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES exam_sessions(id) ON DELETE SET NULL,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_session (session_id),
    INDEX idx_activity_action (action),
    INDEX idx_activity_created (created_at),
    INDEX idx_activity_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 13. System Settings Table

```sql
-- System Settings: Configuration key-value store
CREATE TABLE system_settings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    `key` VARCHAR(100) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    value_type ENUM('string', 'integer', 'boolean', 'json') NOT NULL,
    
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Can be accessed by frontend?
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_settings_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 14. Notifications Table

```sql
-- Notifications: User notifications
CREATE TABLE notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    user_id BIGINT UNSIGNED NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'exam_reminder', 'result_published', 'system_alert'
    
    -- Related Entity
    related_entity_type VARCHAR(50),
    related_entity_id BIGINT UNSIGNED,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Delivery
    sent_via JSON, -- Array: ['email', 'in_app', 'sms']
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (user_id, is_read),
    INDEX idx_notifications_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## Relationships Summary

```
USERS (1) ──< (M) COURSE_ENROLLMENTS >── (1) COURSES
USERS (1) ──< (M) COURSE_LECTURERS >── (1) COURSES
USERS (1) ──< (M) QUESTIONS (created_by)
COURSES (1) ──< (M) QUESTIONS
COURSES (1) ──< (M) EXAMS
EXAMS (1) ──< (M) EXAM_QUESTIONS >── (M) QUESTIONS
EXAMS (1) ──< (M) EXAM_SESSIONS
EXAM_SESSIONS (1) ──< (M) STUDENT_ANSWERS
EXAM_SESSIONS (1) ──< (M) SESSION_SNAPSHOTS
DEPARTMENTS (1) ──< (M) COURSES
```

---

## Sample Data Insertion

```sql
-- Sample Admin User (use Laravel's Hash::make() for real password)
INSERT INTO users (uuid, email, password_hash, first_name, last_name, role, is_active, is_verified)
VALUES (UUID(), 'admin@college.edu', '$2y$10$...', 'System', 'Administrator', 'admin', TRUE, TRUE);

-- Sample System Settings
INSERT INTO system_settings (`key`, value, value_type, description, is_public) VALUES
('auto_save_interval', '5', 'integer', 'Auto-save interval in seconds', FALSE),
('max_concurrent_exams', '5000', 'integer', 'Maximum concurrent exam sessions', FALSE),
('session_timeout_minutes', '120', 'integer', 'Session timeout duration', FALSE),
('enable_proctoring', 'false', 'boolean', 'Enable proctoring features', FALSE);
```

---

## Performance Optimization

### Essential Indexes
All foreign keys and frequently queried columns are already indexed above. Additional composite indexes:

```sql
-- Composite indexes for common queries
CREATE INDEX idx_sessions_exam_status ON exam_sessions(exam_id, status);
CREATE INDEX idx_answers_session_final ON student_answers(session_id, is_final);
CREATE INDEX idx_enrollments_student_status ON course_enrollments(student_id, status);

-- Additional indexes for active records
CREATE INDEX idx_users_active_role ON users(role, is_active, deleted_at);
CREATE INDEX idx_exams_published ON exams(course_id, status, deleted_at);
```

### MySQL-Specific Optimizations

```sql
-- Use InnoDB buffer pool (set in my.cnf)
-- innodb_buffer_pool_size = 4G (50-70% of RAM)

-- Query cache (if using MySQL 5.7, disabled in 8.0+)
-- query_cache_size = 256M
-- query_cache_type = 1

-- Connection pooling
-- max_connections = 200

-- For JSON columns, consider extracting frequently-queried fields
ALTER TABLE questions ADD COLUMN difficulty VARCHAR(20) 
  GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.difficulty'))) STORED;
CREATE INDEX idx_questions_difficulty_computed ON questions(difficulty);
```

### Partitioning Strategy (For Large Datasets)

```sql
-- Partition student_answers by RANGE (for time-based partitioning after reaching 10M+ records)
-- This would require table restructuring

-- Partition activity_logs by month (after reaching millions of records)
ALTER TABLE activity_logs 
PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
    PARTITION p202501 VALUES LESS THAN (202502),
    PARTITION p202502 VALUES LESS THAN (202503),
    -- Add new partitions monthly
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

---

## Backup Strategy

1. **Full Backup**: Daily at 2 AM
2. **Incremental Backup**: Every 6 hours
3. **WAL Archiving**: Continuous (PostgreSQL)
4. **Retention**: 30 days full backups, 7 days incrementals

---

## Laravel Migration Notes

### Creating Migrations

```php
<?php
// database/migrations/2025_02_11_000001_create_users_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id(); // BIGINT UNSIGNED AUTO_INCREMENT
            $table->uuid('uuid')->unique();
            
            $table->string('email')->unique();
            $table->string('password_hash');
            
            $table->string('first_name', 100);
            $table->string('last_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('student_id', 50)->unique()->nullable();
            $table->string('staff_id', 50)->unique()->nullable();
            
            $table->string('phone', 20)->nullable();
            $table->string('avatar_url', 500)->nullable();
            
            $table->enum('role', ['admin', 'lecturer', 'student']);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_verified')->default(false);
            
            $table->timestamp('email_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('password_changed_at')->nullable();
            $table->integer('failed_login_attempts')->default(0);
            $table->timestamp('locked_until')->nullable();
            
            $table->json('metadata')->nullable();
            
            $table->timestamps(); // created_at, updated_at
            $table->softDeletes(); // deleted_at
            
            // Indexes
            $table->index(['email', 'deleted_at']);
            $table->index(['role', 'deleted_at']);
            $table->index(['student_id', 'deleted_at']);
            $table->index('uuid');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

### Model Configuration for UUID

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class User extends Model
{
    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });
    }
    
    protected $casts = [
        'metadata' => 'array',
        'is_active' => 'boolean',
        'is_verified' => 'boolean',
    ];
}
```

---

## Next Document

Proceed to **03_API_SPECIFICATION.md** for RESTful API design.
