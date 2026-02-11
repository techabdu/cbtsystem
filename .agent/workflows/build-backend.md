---
description: Build or modify backend APIs, services, or database for the CBT system. Loads DB schema, API spec, backend architecture, and security guides.
---

# Build Backend Workflow

Use this workflow when building new API endpoints, services, database migrations, or modifying backend logic.

## Steps

1. **Read the database schema** to understand existing tables, relationships, naming conventions, and indexes.
   - Read file: `guides/02_DATABASE_SCHEMA.md`

2. **Read the API specification** to follow endpoint naming, request/response format, HTTP status codes, and rate limiting patterns.
   - Read file: `guides/03_API_SPECIFICATION.md`

3. **Read the backend architecture** to follow the Laravel project structure, Service Layer pattern, Repository pattern, middleware, and queue jobs.
   - Read file: `guides/04_BACKEND_ARCHITECTURE.md`

4. **Read the security guide** to ensure proper authentication, authorization, input validation, SQL injection prevention, and audit logging.
   - Read file: `guides/06_SECURITY_IMPLEMENTATION.md`

5. **Read the coding standards** (PHP/Laravel section) for naming conventions, method structure, error handling, and database query best practices.
   - Read file: `guides/08_CODING_STANDARDS.md`

6. **Plan the backend changes**:
   - **Database**: What migrations are needed? Follow naming conventions (snake_case, plural tables, soft deletes, audit timestamps)
   - **Models**: What Eloquent models and relationships are needed?
   - **Services**: What business logic goes in the Service Layer? (NOT in controllers)
   - **Controllers**: Thin controllers that delegate to services
   - **Form Requests**: What validation rules are needed?
   - **API Resources**: What response transformers are needed?
   - **Middleware**: Does this need role-based access control?
   - **Events/Jobs**: Any background processing needed?

7. **Propose the implementation plan** with the specific files to create/modify. Wait for user approval.

8. **Implement the backend** following the approved plan:
   - Create migrations first, then models, then services, then controllers
   - Use Form Requests for all input validation
   - Use API Resources for all response formatting
   - Follow the standard JSON response format: `{ success, message, data, meta, pagination }`
   - Add proper indexes on foreign keys and frequently queried columns
   - Include audit logging for important actions
   - Use eager loading to prevent N+1 queries
