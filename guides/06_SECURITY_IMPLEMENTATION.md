# CBT System - Security Implementation Guide

## Document Purpose
Comprehensive security measures for both Online Platform and Offline Exam infrastructure. Follow this religiously to ensure system integrity.

---

## Security Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Network Security (Firewall, Air-gap, VLAN)        │
│  Layer 2: Application Security (Auth, RBAC, Validation)     │
│  Layer 3: Data Security (Encryption, Hashing)               │
│  Layer 4: Operational Security (Logging, Monitoring)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Network Security

### Online Platform Network Security

```nginx
# Nginx Configuration - /etc/nginx/sites-available/cbt-online

# Rate Limiting
limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=60r/m;

# SSL/TLS Configuration
server {
    listen 443 ssl http2;
    server_name cbt.college.edu;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/cbt.college.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/cbt.college.edu/privkey.pem;

    # Strong SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # API Endpoints with rate limiting
    location /api/v1/auth/login {
        limit_req zone=login_limit burst=2 nodelay;
        proxy_pass http://backend;
    }

    location /api/v1/ {
        limit_req zone=api_limit burst=10 nodelay;
        proxy_pass http://backend;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name cbt.college.edu;
    return 301 https://$server_name$request_uri;
}
```

---

### Offline Exam Network Security (Air-Gapped)

**Network Topology:**

```
┌────────────────────────────────────────────────────┐
│         EXAM ROOM NETWORK (ISOLATED)               │
│                                                     │
│  ┌──────────────┐                                  │
│  │ Exam Server  │ (192.168.100.1)                  │
│  │  - PHP App   │                                  │
│  │  - Database  │                                  │
│  │  - Redis     │                                  │
│  └──────┬───────┘                                  │
│         │                                           │
│    ┌────┴─────┐                                    │
│    │  Switch  │ (Managed, VLAN-enabled)            │
│    └────┬─────┘                                    │
│         │                                           │
│  ┌──────┴──────────────────────────┐              │
│  │  Student Terminals               │              │
│  │  192.168.100.10 - 192.168.100.250│              │
│  └──────────────────────────────────┘              │
│                                                     │
│  **NO INTERNET CONNECTION**                        │
│  **NO EXTERNAL DEVICES ALLOWED**                   │
└────────────────────────────────────────────────────┘
```

**Switch Configuration:**
```bash
# VLAN Configuration (isolate exam network)
vlan 100
  name EXAM_NETWORK
  
interface range GigabitEthernet 1-24
  switchport mode access
  switchport access vlan 100
  
# Disable unused ports
interface range GigabitEthernet 25-48
  shutdown
```

**Firewall Rules (Exam Server):**

**For Linux (Ubuntu Server):**
```bash
# UFW Configuration
# Allow only local network traffic

sudo ufw default deny incoming
sudo ufw default deny outgoing

# Allow from exam network only
sudo ufw allow from 192.168.100.0/24 to any port 80
sudo ufw allow from 192.168.100.0/24 to any port 443

# Deny all external
sudo ufw deny out to any

sudo ufw enable
```

**For Windows Server:**
```powershell
# PowerShell (Run as Administrator)

# Block all outbound internet traffic
New-NetFirewallRule -DisplayName "Block Outbound Internet" `
    -Direction Outbound `
    -Action Block `
    -RemoteAddress Internet

# Allow HTTP from local network only
New-NetFirewallRule -DisplayName "Allow HTTP from Exam LAN" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 80 `
    -RemoteAddress 192.168.100.0/24 `
    -Action Allow

# Allow HTTPS from local network only  
New-NetFirewallRule -DisplayName "Allow HTTPS from Exam LAN" `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 443 `
    -RemoteAddress 192.168.100.0/24 `
    -Action Allow

# Block all other inbound traffic
Set-NetFirewallProfile -Profile Domain,Public,Private -DefaultInboundAction Block

# Verify firewall rules
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*Exam*"}
```

---

## 2. Application Security

### Authentication & Authorization

#### JWT Implementation (PHP - Laravel)

```php
<?php

namespace App\Services\Auth;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use App\Models\User;
use Carbon\Carbon;

class JwtService
{
    private string $secret;
    private int $ttl = 3600; // 1 hour

    public function __construct()
    {
        $this->secret = config('jwt.secret');
    }

    /**
     * Generate JWT token
     */
    public function generateToken(User $user): string
    {
        $payload = [
            'iss' => config('app.url'),
            'sub' => $user->id,
            'iat' => Carbon::now()->timestamp,
            'exp' => Carbon::now()->addSeconds($this->ttl)->timestamp,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ];

        return JWT::encode($payload, $this->secret, 'HS256');
    }

    /**
     * Verify and decode JWT token
     */
    public function verifyToken(string $token): ?object
    {
        try {
            return JWT::decode($token, new Key($this->secret, 'HS256'));
        } catch (\Exception $e) {
            return null;
        }
    }

    /**
     * Refresh token
     */
    public function refreshToken(string $token): ?string
    {
        $decoded = $this->verifyToken($token);
        
        if (!$decoded) {
            return null;
        }

        // Check if token is about to expire (within 5 minutes)
        $expiresIn = $decoded->exp - Carbon::now()->timestamp;
        
        if ($expiresIn > 300) {
            return null; // No need to refresh yet
        }

        $user = User::find($decoded->sub);
        return $user ? $this->generateToken($user) : null;
    }
}
```

---

#### Role-Based Access Control (RBAC)

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class RoleMiddleware
{
    /**
     * Handle role-based access
     */
    public function handle(Request $request, Closure $next, ...$roles)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        if (!in_array($user->role, $roles)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden - Insufficient permissions',
            ], 403);
        }

        return $next($request);
    }
}

// Route definition
Route::middleware(['auth:api', 'role:admin,lecturer'])->group(function () {
    Route::get('/admin/users', [UserController::class, 'index']);
});
```

---

### Input Validation & Sanitization

```php
<?php

namespace App\Http\Requests\Question;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->user()->role === 'lecturer';
    }

    public function rules(): array
    {
        return [
            'course_id' => 'required|integer|exists:courses,id',
            'question_text' => 'required|string|max:2000|clean_html',
            'question_type' => [
                'required',
                Rule::in(['multiple_choice', 'true_false', 'fill_in_blank', 'essay'])
            ],
            'options' => 'required_if:question_type,multiple_choice|array|min:2|max:10',
            'options.*.key' => 'required_with:options|string|max:5',
            'options.*.value' => 'required_with:options|string|max:500|clean_html',
            'correct_answer' => 'required|clean_html',
            'points' => 'required|numeric|min:0.5|max:100',
            'difficulty_level' => 'nullable|in:easy,medium,hard',
        ];
    }

    protected function prepareForValidation(): void
    {
        // Sanitize HTML content
        $this->merge([
            'question_text' => $this->sanitizeHtml($this->question_text),
        ]);
    }

    private function sanitizeHtml(?string $html): ?string
    {
        if (!$html) return null;

        // Use HTMLPurifier or strip_tags
        return strip_tags($html, '<b><i><u><br><p>');
    }
}
```

**Custom Validation Rule:**

```php
<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class CleanHtml implements Rule
{
    public function passes($attribute, $value)
    {
        // Check for script tags, SQL injection patterns
        $dangerous = ['<script', 'javascript:', 'onerror=', 'onload=', 
                      'SELECT ', 'DROP ', 'INSERT ', 'UPDATE '];
        
        foreach ($dangerous as $pattern) {
            if (stripos($value, $pattern) !== false) {
                return false;
            }
        }

        return true;
    }

    public function message()
    {
        return 'The :attribute contains potentially harmful content.';
    }
}
```

---

### SQL Injection Prevention

```php
<?php

// ✅ GOOD - Using Eloquent ORM (parameterized queries)
$users = User::where('email', $email)
    ->where('is_active', true)
    ->get();

// ✅ GOOD - Using query builder with bindings
$results = DB::table('exam_sessions')
    ->where('student_id', $studentId)
    ->where('status', 'in_progress')
    ->get();

// ✅ GOOD - Raw query with bindings
$sessions = DB::select('SELECT * FROM exam_sessions WHERE student_id = ? AND status = ?', 
    [$studentId, 'in_progress']);

// ❌ BAD - Direct string concatenation
$sessions = DB::select("SELECT * FROM exam_sessions WHERE student_id = $studentId");
```

---

### XSS Prevention

```php
<?php

// Backend - Always escape output
namespace App\Http\Resources;

class QuestionResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id' => $this->id,
            'question_text' => htmlspecialchars($this->question_text, ENT_QUOTES, 'UTF-8'),
            'options' => $this->options->map(function ($option) {
                return [
                    'key' => $option['key'],
                    'value' => htmlspecialchars($option['value'], ENT_QUOTES, 'UTF-8'),
                ];
            }),
        ];
    }
}
```

```typescript
// Frontend - React automatically escapes JSX content
// BUT be careful with dangerouslySetInnerHTML

// ✅ GOOD - Automatic escaping
<p>{question.questionText}</p>

// ⚠️ USE WITH CAUTION - Only if HTML is sanitized on backend
import DOMPurify from 'dompurify';

<div 
  dangerouslySetInnerHTML={{
    __html: DOMPurify.sanitize(question.questionText)
  }}
/>
```

---

### CSRF Protection

```php
<?php

// Laravel automatically includes CSRF protection for web routes
// For API routes, use token-based authentication instead

// config/sanctum.php
return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,127.0.0.1')),
    
    'middleware' => [
        'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
    ],
];

// frontend - Include CSRF token in requests (if using sessions)
axios.defaults.headers.common['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]').content;
```

---

## 3. Data Security

### Password Hashing

```php
<?php

use Illuminate\Support\Facades\Hash;

// During registration/password reset
$user->password_hash = Hash::make($plainPassword, [
    'rounds' => 12, // bcrypt rounds
]);

// During login
if (Hash::check($plainPassword, $user->password_hash)) {
    // Password correct
}

// Check if rehash needed (if algorithm/rounds changed)
if (Hash::needsRehash($user->password_hash)) {
    $user->password_hash = Hash::make($plainPassword);
    $user->save();
}
```

**Password Policy:**

```php
<?php

namespace App\Rules;

use Illuminate\Contracts\Validation\Rule;

class StrongPassword implements Rule
{
    public function passes($attribute, $value)
    {
        // Minimum 8 characters, at least one uppercase, one lowercase, one number, one special
        return preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/', $value);
    }

    public function message()
    {
        return 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.';
    }
}
```

---

### Database Encryption

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class Question extends Model
{
    protected $casts = [
        'options' => 'encrypted:array',
        'correct_answer' => 'encrypted',
    ];

    // Or manual encryption
    public function setCorrectAnswerAttribute($value)
    {
        $this->attributes['correct_answer'] = Crypt::encryptString($value);
    }

    public function getCorrectAnswerAttribute($value)
    {
        return Crypt::decryptString($value);
    }
}
```

**PostgreSQL Column Encryption:**

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive data at rest
CREATE TABLE sensitive_data (
    id BIGSERIAL PRIMARY KEY,
    encrypted_data BYTEA NOT NULL
);

-- Insert encrypted data
INSERT INTO sensitive_data (encrypted_data) 
VALUES (pgp_sym_encrypt('sensitive info', 'encryption_key'));

-- Retrieve decrypted data
SELECT pgp_sym_decrypt(encrypted_data, 'encryption_key') 
FROM sensitive_data;
```

---

### Secure Session Management

```php
<?php

// config/session.php
return [
    'driver' => 'redis',
    'lifetime' => 120, // minutes
    'expire_on_close' => false,
    'encrypt' => true,
    'secure' => true, // HTTPS only
    'http_only' => true, // Not accessible via JavaScript
    'same_site' => 'strict',
];

// Session regeneration after login
auth()->login($user);
session()->regenerate();
```

---

## 4. Exam-Specific Security

### Anti-Cheating Measures

```typescript
// Frontend - Disable common cheat methods

export const useExamSecurity = (sessionId: number) => {
  useEffect(() => {
    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logViolation('right_click_attempted');
    };

    // Disable copy/paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('copy_attempted');
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      logViolation('paste_attempted');
    };

    // Detect tab switching
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('tab_switch_detected');
        setViolationCount((prev) => prev + 1);
      }
    };

    // Prevent F12 (developer tools)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        logViolation('devtools_attempt');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionId]);

  const logViolation = async (violationType: string) => {
    await fetch(`/api/v1/exam-sessions/${sessionId}/violations`, {
      method: 'POST',
      body: JSON.stringify({ violation_type: violationType }),
    });
  };
};
```

---

### Device Fingerprinting

```php
<?php

namespace App\Services\Security;

class DeviceFingerprintService
{
    /**
     * Generate device fingerprint
     */
    public function generateFingerprint(Request $request): string
    {
        $components = [
            $request->ip(),
            $request->userAgent(),
            $request->header('Accept-Language'),
            $request->header('Accept-Encoding'),
        ];

        return hash('sha256', implode('|', $components));
    }

    /**
     * Verify device fingerprint
     */
    public function verifyFingerprint(ExamSession $session, Request $request): bool
    {
        $currentFingerprint = $this->generateFingerprint($request);
        
        return $session->device_fingerprint === $currentFingerprint;
    }
}
```

---

## 5. Audit Logging

```php
<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class AuditService
{
    /**
     * Log user activity
     */
    public function log(
        string $action,
        ?int $userId = null,
        ?string $entityType = null,
        ?int $entityId = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?array $metadata = null
    ): void {
        ActivityLog::create([
            'user_id' => $userId ?? auth()->id(),
            'action' => $action,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'metadata' => $metadata,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    /**
     * Log exam violation
     */
    public function logViolation(ExamSession $session, string $violationType): void
    {
        $violations = $session->violations ?? [];
        $violations[] = [
            'type' => $violationType,
            'timestamp' => now()->toIso8601String(),
            'ip' => request()->ip(),
        ];

        $session->update([
            'violations' => $violations,
            'violation_count' => count($violations),
            'has_violations' => true,
        ]);

        $this->log('exam_violation', $session->student_id, 'exam_session', $session->id, null, null, [
            'violation_type' => $violationType,
        ]);
    }
}
```

---

## 6. Backup & Recovery Security

```bash
#!/bin/bash
# Automated backup script with encryption

BACKUP_DIR="/backups/cbt"
DATE=$(date +%Y%m%d_%H%M%S)
ENCRYPTION_KEY="/secure/backup.key"

# PostgreSQL backup with encryption
pg_dump cbt_online | \
  gzip | \
  openssl enc -aes-256-cbc -salt -pass file:$ENCRYPTION_KEY \
  > "$BACKUP_DIR/db_$DATE.sql.gz.enc"

# File backup
tar -czf - /var/www/cbt/storage | \
  openssl enc -aes-256-cbc -salt -pass file:$ENCRYPTION_KEY \
  > "$BACKUP_DIR/files_$DATE.tar.gz.enc"

# Verify backup integrity
sha256sum "$BACKUP_DIR/db_$DATE.sql.gz.enc" > "$BACKUP_DIR/db_$DATE.sql.gz.enc.sha256"

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.enc" -mtime +30 -delete

# Upload to secure off-site storage
# rsync -avz --delete $BACKUP_DIR remote-backup:/backups/
```

---

## 7. Security Checklist

### Pre-Deployment Security Checklist

- [ ] All passwords stored as bcrypt hashes with rounds >= 12
- [ ] JWT secret is cryptographically random (256-bit minimum)
- [ ] All API endpoints require authentication
- [ ] RBAC implemented for all sensitive operations
- [ ] Input validation on all user inputs
- [ ] SQL injection protection via parameterized queries
- [ ] XSS protection via output escaping
- [ ] CSRF protection enabled
- [ ] HTTPS enforced (no HTTP)
- [ ] Security headers configured (HSTS, CSP, X-Frame-Options)
- [ ] Rate limiting on authentication endpoints
- [ ] Sensitive data encrypted at rest
- [ ] Database credentials rotated
- [ ] Audit logging enabled
- [ ] Backup encryption enabled
- [ ] Error messages don't leak system info
- [ ] Debug mode disabled in production
- [ ] File upload validation (type, size)
- [ ] Session timeout configured
- [ ] Exam network air-gapped
- [ ] Anti-cheating measures active

---

## Next Document

Proceed to **07_DEPLOYMENT_GUIDE.md** for infrastructure setup.
