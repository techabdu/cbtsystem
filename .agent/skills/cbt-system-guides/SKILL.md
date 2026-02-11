---
name: CBT System Development Guides
description: Comprehensive architecture, database, API, backend, frontend, security, deployment, and coding standards guides for the Computer-Based Testing (CBT) System project.
---

# CBT System Development Guides

## Overview

This project is a **Computer-Based Testing (CBT) System** — a full-stack, enterprise-grade examination platform with a hybrid cloud-edge architecture. It consists of an **Online Platform** (internet-facing, always available) and an **Offline Exam Infrastructure** (air-gapped campus network for actual exams).

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript, Tailwind CSS, Zustand, React Hook Form + Zod, TanStack Query, Socket.io-client
- **Backend**: Laravel 11+ (PHP 8.2+), RESTful JSON API, JWT Authentication
- **Database**: MySQL 8.0+ (InnoDB), Redis 7+ (caching, sessions, queues)
- **Infrastructure**: Nginx, PHP-FPM, Supervisor, Docker (dev), PM2 (frontend)

## Guide Files

Before starting any development work on this project, you **MUST** read the relevant guide files located in the `guides/` directory at the project root. The guides are numbered and should be referenced in order:

1. **`guides/01_SYSTEM_ARCHITECTURE_OVERVIEW.md`** — High-level architecture, technology stack, data flow patterns, security layers, scalability strategy, HA design
2. **`guides/02_DATABASE_SCHEMA.md`** — Complete MySQL database schema (14 tables across 2 databases: `cbt_online` and `cbt_exam`), naming conventions, indexes, Laravel migrations
3. **`guides/03_API_SPECIFICATION.md`** — Full RESTful API spec (`/api/v1/...`): auth, users, courses, questions, exams, exam sessions, dashboards, notifications, WebSocket events
4. **`guides/04_BACKEND_ARCHITECTURE.md`** — Laravel project structure, Repository/Service Layer patterns, SessionService, RecoveryService, GradingService, middleware, queue jobs
5. **`guides/05_FRONTEND_ARCHITECTURE.md`** — Next.js project structure, API client, auth/exam/auto-save/timer hooks, exam interface components, question display
6. **`guides/06_SECURITY_IMPLEMENTATION.md`** — Network security (Nginx, air-gap, VLAN, firewalls), JWT, RBAC, input validation, anti-cheating measures, device fingerprinting, audit logging
7. **`guides/07_DEPLOYMENT_AND_PHASES.md`** — Infrastructure requirements, dev/production deployment (online + offline Windows Server), 10-phase implementation roadmap (~21 weeks)
8. **`guides/08_CODING_STANDARDS.md`** — SOLID/DRY/KISS/YAGNI, PHP/TypeScript naming conventions, component structure, testing standards, git commit format, code review checklist

## How to Use These Guides

### When building new features:
1. First check `01_SYSTEM_ARCHITECTURE_OVERVIEW.md` to understand where the feature fits
2. Reference `02_DATABASE_SCHEMA.md` for any database changes
3. Follow `03_API_SPECIFICATION.md` for API endpoint design
4. Use `04_BACKEND_ARCHITECTURE.md` for backend patterns (Service Layer, Repository, etc.)
5. Use `05_FRONTEND_ARCHITECTURE.md` for frontend patterns (hooks, components, state)
6. Apply `06_SECURITY_IMPLEMENTATION.md` for all security considerations
7. Follow `08_CODING_STANDARDS.md` for code quality and conventions

### Key Architectural Rules:
- **Separation of Concerns**: Online Platform handles management/analytics/practice; Offline Exam System handles actual examinations only
- **Service Layer Pattern**: Business logic goes in `app/Services/`, NOT in controllers
- **Repository Pattern**: Data access abstraction is recommended
- **Auto-save**: Student answers auto-save every 5 seconds with versioning
- **Session Recovery**: System must recover from crashes/power failures with minimal data loss
- **Air-gapped Exam Network**: Offline exam server has NO internet connection during exams
- **JWT Authentication**: Stateless auth with short-lived tokens
- **RBAC**: Three roles — admin, lecturer, student

### Development Environment:
- Backend runs on XAMPP (PHP + MySQL) at the project root path
- Frontend runs as a separate Next.js dev server on port 3000
- Redis is optional for local development but required for production
