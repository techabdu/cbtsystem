# CBT System - Frontend Architecture (Next.js)

## Document Purpose
Complete Next.js 14+ frontend architecture using App Router, React Server Components, and modern best practices.

---

## Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI Library**: React 18+
- **Styling**: Tailwind CSS
- **State Management**: Zustand (lightweight) or Redux Toolkit
- **Forms**: React Hook Form + Zod validation
- **HTTP Client**: Axios + TanStack Query (React Query)
- **Real-time**: Socket.io-client
- **Charts**: Recharts or Chart.js
- **Date/Time**: date-fns
- **Icons**: Lucide React or Heroicons

---

## Project Structure

```
cbt-frontend/
├── app/
│   ├── (auth)/                    # Auth layout group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/               # Dashboard layout group
│   │   ├── student/
│   │   │   ├── page.tsx          # Student dashboard
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── exams/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   ├── results/
│   │   │   │   └── page.tsx
│   │   │   └── practice/
│   │   │       └── page.tsx
│   │   ├── lecturer/
│   │   │   ├── page.tsx
│   │   │   ├── courses/
│   │   │   ├── questions/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── create/
│   │   │   │   └── [id]/edit/
│   │   │   ├── exams/
│   │   │   │   ├── create/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── edit/
│   │   │   │   │   └── results/
│   │   │   └── analytics/
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── departments/
│   │   │   └── settings/
│   │   └── layout.tsx             # Shared dashboard layout
│   ├── exam/
│   │   └── [sessionId]/
│   │       └── page.tsx           # Full-screen exam interface
│   ├── api/                       # API routes (if needed)
│   ├── layout.tsx                 # Root layout
│   ├── loading.tsx                # Global loading
│   ├── error.tsx                  # Global error
│   └── not-found.tsx
├── components/
│   ├── ui/                        # Reusable UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── forms/                     # Form components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── QuestionForm.tsx
│   │   └── ExamForm.tsx
│   ├── exam/                      # Exam-specific components
│   │   ├── QuestionDisplay.tsx
│   │   ├── ExamTimer.tsx
│   │   ├── ExamNavigation.tsx
│   │   ├── AnswerInput.tsx
│   │   └── ExamSubmitDialog.tsx
│   ├── dashboard/                 # Dashboard components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── StatCard.tsx
│   │   └── RecentActivity.tsx
│   ├── charts/
│   │   ├── PerformanceChart.tsx
│   │   └── ResultsChart.tsx
│   └── shared/
│       ├── Navbar.tsx
│       ├── Footer.tsx
│       └── LoadingSpinner.tsx
├── lib/
│   ├── api/                       # API client functions
│   │   ├── client.ts              # Axios instance
│   │   ├── auth.ts
│   │   ├── courses.ts
│   │   ├── exams.ts
│   │   ├── questions.ts
│   │   └── sessions.ts
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useExamSession.ts
│   │   ├── useAutoSave.ts
│   │   ├── useTimer.ts
│   │   └── useWebSocket.ts
│   ├── store/                     # State management
│   │   ├── authStore.ts
│   │   ├── examStore.ts
│   │   └── uiStore.ts
│   ├── utils/                     # Utility functions
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── helpers.ts
│   ├── types/                     # TypeScript types
│   │   ├── api.ts
│   │   ├── models.ts
│   │   └── forms.ts
│   └── constants.ts
├── public/
│   ├── images/
│   └── icons/
├── styles/
│   └── globals.css
├── middleware.ts                  # Next.js middleware
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Core Components

### 1. API Client Setup

```typescript
// lib/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { getAuthToken, clearAuthToken } from '@/lib/utils/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<any>) => {
    if (error.response?.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
    }
    
    return Promise.reject(error.response?.data || error.message);
  }
);
```

---

### 2. Authentication Hook

```typescript
// lib/hooks/useAuth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as authApi from '@/lib/api/auth';

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'lecturer' | 'student';
  avatarUrl?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(email, password);
          set({
            user: response.data.user,
            token: response.data.token,
            isAuthenticated: true,
            isLoading: false,
          });
          localStorage.setItem('auth_token', response.data.token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        authApi.logout();
        localStorage.removeItem('auth_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      register: async (data: any) => {
        set({ isLoading: true });
        try {
          await authApi.register(data);
          set({ isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      refreshUser: async () => {
        try {
          const response = await authApi.getCurrentUser();
          set({ user: response.data.user });
        } catch (error) {
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

---

### 3. Exam Session Hook (Critical)

```typescript
// lib/hooks/useExamSession.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as sessionApi from '@/lib/api/sessions';
import { useAutoSave } from './useAutoSave';
import { useTimer } from './useTimer';

interface ExamSession {
  id: number;
  examId: number;
  currentQuestionIndex: number;
  totalQuestions: number;
  timeRemainingSeconds: number;
  status: string;
}

interface Question {
  id: number;
  questionNumber: number;
  questionText: string;
  questionType: string;
  options?: Array<{ key: string; value: string }>;
  points: number;
  imageUrl?: string;
}

export const useExamSession = (sessionId: number) => {
  const router = useRouter();
  const [session, setSession] = useState<ExamSession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<any>(null);
  const [isFlagged, setIsFlagged] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-save hook
  const { saveAnswer, isSaving } = useAutoSave(sessionId);

  // Timer hook
  const { timeRemaining, isExpired } = useTimer(
    session?.timeRemainingSeconds || 0
  );

  // Load session and current question
  const loadSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const sessionData = await sessionApi.getSessionStatus(sessionId);
      setSession(sessionData.data.session);

      const questionData = await sessionApi.getCurrentQuestion(sessionId);
      setCurrentQuestion(questionData.data.question);
      setCurrentAnswer(questionData.data.session.saved_answer);
      setIsFlagged(questionData.data.session.is_flagged);

      setIsLoading(false);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [sessionId]);

  // Navigate to question
  const goToQuestion = useCallback(async (index: number) => {
    try {
      const questionData = await sessionApi.getQuestion(sessionId, index);
      setCurrentQuestion(questionData.data.question);
      setCurrentAnswer(questionData.data.session.saved_answer);
      setIsFlagged(questionData.data.session.is_flagged);
      
      setSession((prev) => prev ? {
        ...prev,
        currentQuestionIndex: index,
      } : null);
    } catch (err: any) {
      setError(err.message);
    }
  }, [sessionId]);

  // Save answer (triggered by auto-save)
  const handleSaveAnswer = useCallback((answer: any, flagged: boolean) => {
    if (!currentQuestion) return;

    saveAnswer(currentQuestion.id, answer, flagged);
    setCurrentAnswer(answer);
    setIsFlagged(flagged);
  }, [currentQuestion, saveAnswer]);

  // Submit exam
  const submitExam = useCallback(async () => {
    try {
      await sessionApi.submitSession(sessionId);
      router.push('/student/results');
    } catch (err: any) {
      setError(err.message);
    }
  }, [sessionId, router]);

  // Auto-submit when time expires
  useEffect(() => {
    if (isExpired && session?.status === 'in_progress') {
      submitExam();
    }
  }, [isExpired, session, submitExam]);

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Recovery on page reload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session?.status === 'in_progress') {
        e.preventDefault();
        e.returnValue = 'You have an active exam session. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  return {
    session,
    currentQuestion,
    currentAnswer,
    isFlagged,
    isLoading,
    isSaving,
    error,
    timeRemaining,
    goToQuestion,
    saveAnswer: handleSaveAnswer,
    submitExam,
  };
};
```

---

### 4. Auto-Save Hook

```typescript
// lib/hooks/useAutoSave.ts
import { useCallback, useRef, useEffect } from 'react';
import { useState } from 'react';
import * as sessionApi from '@/lib/api/sessions';
import { useDebounce } from './useDebounce';

const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

export const useAutoSave = (sessionId: number) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveQueueRef = useRef<Map<number, any>>(new Map());
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Process save queue
  const processSaveQueue = useCallback(async () => {
    if (saveQueueRef.current.size === 0) return;

    setIsSaving(true);
    const entries = Array.from(saveQueueRef.current.entries());
    saveQueueRef.current.clear();

    try {
      // Save all pending answers
      await Promise.all(
        entries.map(([questionId, data]) =>
          sessionApi.saveAnswer(sessionId, questionId, data.answer, data.isFlagged)
        )
      );
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Re-queue failed saves
      entries.forEach(([questionId, data]) => {
        saveQueueRef.current.set(questionId, data);
      });
    } finally {
      setIsSaving(false);
    }
  }, [sessionId]);

  // Queue an answer for saving
  const saveAnswer = useCallback((questionId: number, answer: any, isFlagged: boolean) => {
    saveQueueRef.current.set(questionId, { answer, isFlagged });

    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer
    saveTimerRef.current = setTimeout(() => {
      processSaveQueue();
    }, AUTO_SAVE_INTERVAL);
  }, [processSaveQueue]);

  // Force immediate save
  const forceSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    processSaveQueue();
  }, [processSaveQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      // Force save remaining items
      if (saveQueueRef.current.size > 0) {
        processSaveQueue();
      }
    };
  }, [processSaveQueue]);

  return {
    saveAnswer,
    forceSave,
    isSaving,
    lastSaved,
  };
};
```

---

### 5. Timer Hook

```typescript
// lib/hooks/useTimer.ts
import { useState, useEffect, useRef } from 'react';

export const useTimer = (initialSeconds: number) => {
  const [timeRemaining, setTimeRemaining] = useState(initialSeconds);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setTimeRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (timeRemaining <= 0) {
      setIsExpired(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
  };
};
```

---

### 6. Exam Interface Component

```typescript
// app/exam/[sessionId]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useExamSession } from '@/lib/hooks/useExamSession';
import QuestionDisplay from '@/components/exam/QuestionDisplay';
import ExamTimer from '@/components/exam/ExamTimer';
import ExamNavigation from '@/components/exam/ExamNavigation';
import ExamSubmitDialog from '@/components/exam/ExamSubmitDialog';
import { useState } from 'react';

export default function ExamPage() {
  const params = useParams();
  const sessionId = parseInt(params.sessionId as string);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);

  const {
    session,
    currentQuestion,
    currentAnswer,
    isFlagged,
    isLoading,
    isSaving,
    timeRemaining,
    goToQuestion,
    saveAnswer,
    submitExam,
  } = useExamSession(sessionId);

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Loading exam...</div>
    </div>;
  }

  if (!session || !currentQuestion) {
    return <div className="flex items-center justify-center h-screen">
      <div className="text-xl text-red-600">Exam session not found</div>
    </div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          Question {currentQuestion.questionNumber} of {session.totalQuestions}
        </h1>
        
        <div className="flex items-center gap-4">
          {isSaving && (
            <span className="text-sm text-gray-500">Saving...</span>
          )}
          <ExamTimer timeRemaining={timeRemaining} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <QuestionDisplay
            question={currentQuestion}
            answer={currentAnswer}
            isFlagged={isFlagged}
            onAnswerChange={(answer) => saveAnswer(answer, isFlagged)}
            onFlagToggle={() => saveAnswer(currentAnswer, !isFlagged)}
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-white border-t px-6 py-4">
        <ExamNavigation
          currentIndex={session.currentQuestionIndex}
          totalQuestions={session.totalQuestions}
          onNavigate={goToQuestion}
          onSubmit={() => setShowSubmitDialog(true)}
        />
      </div>

      {/* Submit Dialog */}
      {showSubmitDialog && (
        <ExamSubmitDialog
          onConfirm={submitExam}
          onCancel={() => setShowSubmitDialog(false)}
          questionsAnswered={session.currentQuestionIndex + 1}
          totalQuestions={session.totalQuestions}
        />
      )}
    </div>
  );
}
```

---

### 7. Question Display Component

```typescript
// components/exam/QuestionDisplay.tsx
import { Question } from '@/lib/types/models';

interface Props {
  question: Question;
  answer: any;
  isFlagged: boolean;
  onAnswerChange: (answer: any) => void;
  onFlagToggle: () => void;
}

export default function QuestionDisplay({
  question,
  answer,
  isFlagged,
  onAnswerChange,
  onFlagToggle,
}: Props) {
  const renderAnswerInput = () => {
    switch (question.questionType) {
      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option) => (
              <label
                key={option.key}
                className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="answer"
                  value={option.key}
                  checked={answer === option.key}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="mr-3 h-4 w-4"
                />
                <span>{option.key}. {option.value}</span>
              </label>
            ))}
          </div>
        );

      case 'true_false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <label
                key={option}
                className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={answer === option}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="mr-3 h-4 w-4"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        );

      case 'essay':
        return (
          <textarea
            value={answer || ''}
            onChange={(e) => onAnswerChange(e.target.value)}
            className="w-full h-48 p-4 border rounded-lg resize-none"
            placeholder="Type your answer here..."
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Question Text */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-lg mb-2">{question.questionText}</p>
            {question.imageUrl && (
              <img
                src={question.imageUrl}
                alt="Question"
                className="mt-4 max-w-md rounded-lg"
              />
            )}
          </div>
          
          {/* Flag Button */}
          <button
            onClick={onFlagToggle}
            className={`ml-4 p-2 rounded ${
              isFlagged ? 'text-red-600' : 'text-gray-400'
            }`}
          >
            🚩 {isFlagged ? 'Flagged' : 'Flag'}
          </button>
        </div>
        
        <p className="text-sm text-gray-500 mt-2">
          {question.points} {question.points === 1 ? 'point' : 'points'}
        </p>
      </div>

      {/* Answer Input */}
      {renderAnswerInput()}
    </div>
  );
}
```

---

## State Management Strategy

### Zustand Store (Lightweight)

```typescript
// lib/store/examStore.ts
import { create } from 'zustand';

interface ExamState {
  currentSessionId: number | null;
  answers: Map<number, any>;
  flaggedQuestions: Set<number>;
  setAnswer: (questionId: number, answer: any) => void;
  toggleFlag: (questionId: number) => void;
  clearSession: () => void;
}

export const useExamStore = create<ExamState>((set) => ({
  currentSessionId: null,
  answers: new Map(),
  flaggedQuestions: new Set(),

  setAnswer: (questionId, answer) =>
    set((state) => {
      const newAnswers = new Map(state.answers);
      newAnswers.set(questionId, answer);
      return { answers: newAnswers };
    }),

  toggleFlag: (questionId) =>
    set((state) => {
      const newFlags = new Set(state.flaggedQuestions);
      if (newFlags.has(questionId)) {
        newFlags.delete(questionId);
      } else {
        newFlags.add(questionId);
      }
      return { flaggedQuestions: newFlags };
    }),

  clearSession: () =>
    set({
      currentSessionId: null,
      answers: new Map(),
      flaggedQuestions: new Set(),
    }),
}));
```

---

## Middleware (Authentication Guard)

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/register');
  const isDashboard = request.nextUrl.pathname.startsWith('/student') ||
                      request.nextUrl.pathname.startsWith('/lecturer') ||
                      request.nextUrl.pathname.startsWith('/admin');

  if (!token && isDashboard) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL('/student', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/student/:path*', '/lecturer/:path*', '/admin/:path*', '/login', '/register'],
};
```

---

## Next Document

Proceed to **06_SECURITY_IMPLEMENTATION.md** for comprehensive security measures.
