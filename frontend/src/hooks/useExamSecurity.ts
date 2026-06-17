'use client';

import { useEffect, useRef, useCallback } from 'react';
import apiClient from '@/lib/api/client';

type ViolationType = 'tab_switch' | 'copy_paste' | 'right_click' | 'devtools' | 'window_blur' | 'screenshot_attempt';

interface UseExamSecurityOptions {
    sessionId: string;
    enabled?: boolean;
    onViolation?: (type: ViolationType, count: number) => void;
}

export function useExamSecurity({ sessionId, enabled = true, onViolation }: UseExamSecurityOptions) {
    const violationCount = useRef(0);
    const pendingViolations = useRef<ViolationType[]>([]);
    const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reportViolation = useCallback(async (type: ViolationType) => {
        violationCount.current += 1;
        onViolation?.(type, violationCount.current);

        try {
            await apiClient.post(`/exam-sessions/${sessionId}/violations`, { type });
        } catch {
            // Non-critical — don't disrupt the exam
        }
    }, [sessionId, onViolation]);

    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                reportViolation('tab_switch');
            }
        };

        const handleWindowBlur = () => {
            reportViolation('window_blur');
        };

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault();
            reportViolation('copy_paste');
        };

        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            reportViolation('copy_paste');
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            reportViolation('right_click');
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block F12 / Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+U
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'u') ||
                (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
            ) {
                e.preventDefault();
                reportViolation('devtools');
            }

            // Block PrintScreen
            if (e.key === 'PrintScreen') {
                e.preventDefault();
                reportViolation('screenshot_attempt');
            }

            // Block Ctrl+C / Ctrl+V / Ctrl+A in the exam context
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a')) {
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
                // Allow paste in text inputs (for essay answers) but log it
                if (e.key === 'c' || e.key === 'a') {
                    if (!isInput) {
                        e.preventDefault();
                    }
                    reportViolation('copy_paste');
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleWindowBlur);
        document.addEventListener('copy', handleCopy);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleWindowBlur);
            document.removeEventListener('copy', handleCopy);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('keydown', handleKeyDown);
            if (flushTimer.current) clearTimeout(flushTimer.current);
        };
    }, [enabled, reportViolation]);

    return { violationCount: violationCount.current };
}
