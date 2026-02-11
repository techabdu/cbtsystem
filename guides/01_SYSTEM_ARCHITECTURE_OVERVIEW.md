# CBT System - Architecture Overview

## Document Purpose
This document provides a high-level overview of the Computer-Based Testing (CBT) system architecture. Use this as the foundation for understanding the system design before diving into specific components.

---

## System Classification

**Architecture Pattern**: Hybrid Cloud-Edge Architecture
- **Online Platform**: Cloud-based (or on-premise cloud simulation)
- **Exam Infrastructure**: Air-gapped edge network (campus-based)
- **Communication**: One-way sync from online to offline during non-exam periods

---

## Core Architecture Principles

### 1. Separation of Concerns
- **Online Platform**: Management, Analytics, Practice
- **Offline Exam System**: Actual examinations only
- **No Direct Connection**: Physical network separation during exams

### 2. Defense in Depth
- Multiple security layers
- Network isolation
- Application-level security
- Data encryption at rest and in transit
- Audit logging at every level

### 3. High Availability
- Auto-recovery mechanisms
- Session persistence
- Real-time data backup
- Failover capabilities

### 4. Scalability First
- Horizontal scaling support
- Load balancing
- Queue-based processing
- Database optimization

---

## System Components Map

```
┌─────────────────────────────────────────────────────────────┐
│                     ONLINE PLATFORM                          │
│  (Internet-accessible, always available)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Admin Panel │  │ Lecturer     │  │  Student     │      │
│  │  Dashboard   │  │ Dashboard    │  │  Dashboard   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         API Layer (Next.js API Routes)               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Backend Services (PHP - Laravel/Slim)           │   │
│  │  • User Management    • Analytics                    │   │
│  │  • Course Management  • Reports                      │   │
│  │  • Practice Exams     • Notifications                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Primary Database (PostgreSQL/MySQL)          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ ONE-WAY SYNC
                            │ (During non-exam periods)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              OFFLINE EXAM INFRASTRUCTURE                     │
│  (Air-gapped campus network, exam periods only)              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Exam Server (PHP Backend)                  │   │
│  │  • Session Management   • Answer Auto-save           │   │
│  │  • Exam Delivery        • State Recovery             │   │
│  │  • Real-time Monitoring • Integrity Checks           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Exam Database (PostgreSQL - Read-Heavy)         │   │
│  │  • Questions (read-only during exam)                 │   │
│  │  • Student Responses (write-intensive)               │   │
│  │  • Session States (continuous updates)               │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Student    │  │  Student    │  │  Student    │         │
│  │  Terminal 1 │  │  Terminal 2 │  │  Terminal N │   ...   │
│  │  (Browser)  │  │  (Browser)  │  │  (Browser)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: Zustand / Redux Toolkit
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios / TanStack Query
- **Real-time**: Socket.io-client (for exam monitoring)

### Backend (PHP)
- **Framework**: Laravel 11+ OR Slim Framework 4+ (decision depends on team familiarity)
- **API Style**: RESTful JSON API
- **Authentication**: JWT (JSON Web Tokens)
- **Session Management**: Redis
- **Queue System**: Redis Queue
- **Real-time**: Socket.io (Node.js microservice) OR Laravel WebSockets

### Database
- **Primary DB**: MySQL 8.0+ with InnoDB
- **Caching**: Redis 7+
- **Session Store**: Redis
- **Search**: MySQL Full-Text Search

### Infrastructure
- **Web Server**: Nginx (reverse proxy + static files)
- **Application Server**: PHP-FPM 8.2+
- **Process Manager**: Supervisor (for queues and workers)
- **Container**: Docker + Docker Compose (development)
- **Backup**: Automated PostgreSQL dumps + replication

---

## Data Flow Patterns

### 1. Normal Operations (Non-Exam Period)
```
Online Platform → Data Sync → Offline Exam Database
(One-way synchronization of questions, users, exam configs)
```

### 2. During Examination
```
Student Browser → Exam Server → Exam Database
(Fully isolated, no internet, auto-save every 3-5 seconds)
```

### 3. Post-Examination
```
Exam Database → Data Export → Online Platform
(Results upload, analytics processing)
```

---

## Security Layers

### Layer 1: Network Security
- Air-gapped exam network (physical separation)
- VLAN isolation
- Firewall rules (online platform)
- DDoS protection (online platform)

### Layer 2: Application Security
- JWT authentication with short expiration
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention (prepared statements)
- XSS protection
- CSRF tokens

### Layer 3: Data Security
- Encryption at rest (database encryption)
- Encryption in transit (TLS 1.3)
- Password hashing (bcrypt/Argon2)
- Secure session management
- PII data masking

### Layer 4: Operational Security
- Comprehensive audit logging
- Activity monitoring
- Intrusion detection
- Regular security audits
- Backup encryption

---

## Scalability Strategy

### Horizontal Scaling
- **Web Tier**: Multiple Nginx + PHP-FPM instances behind load balancer
- **Database**: Read replicas for reporting and analytics
- **Caching**: Redis cluster
- **Queue Processing**: Multiple worker instances

### Vertical Scaling
- Optimized database queries and indexes
- Connection pooling
- Query result caching
- CDN for static assets

### Expected Load
- **Students**: 10,000+ total users
- **Concurrent Exams**: 5,000 simultaneous sessions
- **Write Operations**: ~15,000-25,000 writes/minute (at 5000 concurrent users, auto-save every 5 sec)
- **Database**: 100-200 connections during peak

---

## High Availability Design

### Auto-Recovery Features
1. **Session Persistence**
   - Continuous state saving to Redis
   - Database transaction logs
   - Recovery from last checkpoint

2. **Answer Auto-Save**
   - Client-side: Every 3 seconds to local storage
   - Server-side: Every 5 seconds to database
   - Conflict resolution on reconnection

3. **Power Failure Protection**
   - UPS backup (hardware)
   - Automatic session recovery
   - Resume from exact question and time

4. **System Crash Recovery**
   - Health check endpoints
   - Auto-restart mechanisms (Supervisor)
   - Database WAL (Write-Ahead Logging)

---

## Deployment Architecture

### Development Environment
```
Local Machine:
- PHP 8.2+ with built-in server or XAMPP/MAMP
- MySQL 8.0+
- Redis (optional for development)
- Next.js dev server (port 3000)
```

### Production Environment (Online Platform)
```
Load Balancer (Nginx)
  ↓
Web/App Servers (3+ instances)
  ↓
Database Primary (PostgreSQL)
  ↓
Read Replicas (2+ instances)

Redis Cluster
Queue Workers (Supervisor)
```

### Production Environment (Offline Exam)
```
Exam Server (Dedicated)
  ↓
Exam Database (PostgreSQL)
  ↓
Redis (Session + Cache)

Student Terminals (100-500 machines)
```

---

## Critical Design Decisions

### 1. Why Hybrid Architecture?
- **Reliability**: Offline exams eliminate network dependency
- **Security**: Air-gapped prevents external attacks
- **Flexibility**: Online platform for day-to-day operations

### 2. Why MySQL?
- Widely available on shared hosting
- Excellent JSON support (JSON columns)
- Proven reliability and performance
- Large ecosystem and community support
- Good concurrent write performance with InnoDB

### 3. Why Redis?
- In-memory speed for session management
- Built-in pub/sub for real-time features
- Queue support for background jobs

### 4. Why JWT Over Session Cookies?
- Stateless authentication (easier scaling)
- Mobile app support (future-proof)
- Cross-domain support

---

## Key Metrics & Monitoring

### Performance Metrics
- API response time: < 200ms (95th percentile)
- Database query time: < 50ms (average)
- Answer auto-save: < 1 second (client to server)
- Page load time: < 2 seconds (LCP)

### Availability Metrics
- Online Platform Uptime: 99.5%+
- Exam System Uptime: 99.9%+ (during exam periods)
- Data Recovery: < 5 seconds of lost data (max)

### Business Metrics
- Concurrent exam sessions
- Exam completion rate
- System error rate
- Cheat detection alerts

---

## Next Steps

After reviewing this overview, proceed to read:

1. **02_DATABASE_SCHEMA.md** - Complete database design
2. **03_API_SPECIFICATION.md** - RESTful API endpoints
3. **04_BACKEND_ARCHITECTURE.md** - PHP backend structure
4. **05_FRONTEND_ARCHITECTURE.md** - Next.js frontend structure
5. **06_SECURITY_IMPLEMENTATION.md** - Security measures
6. **07_DEPLOYMENT_GUIDE.md** - Infrastructure setup
7. **08_CODING_STANDARDS.md** - Development guidelines
8. **09_IMPLEMENTATION_PHASES.md** - Development roadmap

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-10 | System Architect | Initial architecture design |
