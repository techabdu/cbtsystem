'use client';

import { useState, useRef, useCallback } from 'react';
import { uploadQuestionImage, deleteQuestionImage } from '@/lib/api/questions';
import { Button } from '@/components/ui/button';
import {
    ImageIcon,
    Upload,
    X,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

export interface QuestionImageUploadProps {
    /** The ID of the question this image belongs to. */
    questionId: number;
    /** URL of the currently saved image, if any. */
    currentImageUrl?: string | null;
    /** Called when a new image has been successfully uploaded. */
    onUpload?: (imageUrl: string) => void;
    /** Called when the image has been successfully deleted. */
    onDelete?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function QuestionImageUpload({
    questionId,
    currentImageUrl,
    onUpload,
    onDelete,
}: QuestionImageUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Persisted image URL (saved on server)
    const [savedImageUrl, setSavedImageUrl] = useState<string | null>(currentImageUrl ?? null);

    // Staged file (selected but not yet saved)
    const [stagedFile, setStagedFile] = useState<File | null>(null);
    const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);

    // UI state
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    /* ------------------------------------------------------------------ */
    /*  Helpers                                                             */
    /* ------------------------------------------------------------------ */

    const clearStaged = useCallback(() => {
        setStagedFile(null);
        if (stagedPreviewUrl) {
            URL.revokeObjectURL(stagedPreviewUrl);
        }
        setStagedPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [stagedPreviewUrl]);

    const showSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    /* ------------------------------------------------------------------ */
    /*  File selection                                                      */
    /* ------------------------------------------------------------------ */

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate type
        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError('Invalid file type. Please select a JPG, PNG, GIF, or WebP image.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Validate size
        if (file.size > MAX_SIZE_BYTES) {
            setError('File is too large. Maximum allowed size is 2 MB.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // Revoke previous preview URL if any
        if (stagedPreviewUrl) {
            URL.revokeObjectURL(stagedPreviewUrl);
        }

        const preview = URL.createObjectURL(file);
        setStagedFile(file);
        setStagedPreviewUrl(preview);
    };

    /* ------------------------------------------------------------------ */
    /*  Upload                                                              */
    /* ------------------------------------------------------------------ */

    const handleUpload = async () => {
        if (!stagedFile) return;
        setIsUploading(true);
        setError(null);
        try {
            const res = await uploadQuestionImage(questionId, stagedFile);
            const imageUrl = res.data.image_url;
            setSavedImageUrl(imageUrl);
            onUpload?.(imageUrl);
            clearStaged();
            showSuccess('Image uploaded successfully.');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Delete                                                              */
    /* ------------------------------------------------------------------ */

    const handleDelete = async () => {
        if (!confirm('Remove this image from the question?')) return;
        setIsDeleting(true);
        setError(null);
        try {
            await deleteQuestionImage(questionId);
            setSavedImageUrl(null);
            onDelete?.();
            showSuccess('Image removed.');
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            setError(e.response?.data?.message || 'Failed to remove image. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Render                                                              */
    /* ------------------------------------------------------------------ */

    return (
        <div className="space-y-3">
            {/* Success message */}
            {successMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-800 dark:border-green-800/50 dark:bg-green-950/30 dark:text-green-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <p className="text-xs font-medium">{successMessage}</p>
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p className="text-xs font-medium">{error}</p>
                </div>
            )}

            {/* Currently saved image */}
            {savedImageUrl && !stagedFile && (
                <div className="relative inline-block">
                    <div className="overflow-hidden rounded-lg border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={savedImageUrl}
                            alt="Question image"
                            className="max-h-48 max-w-full object-contain"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-6 w-6"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        title="Remove image"
                    >
                        {isDeleting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Trash2 className="h-3 w-3" />
                        )}
                    </Button>
                </div>
            )}

            {/* Staged file preview */}
            {stagedFile && stagedPreviewUrl && (
                <div className="space-y-2">
                    <div className="overflow-hidden rounded-lg border border-primary/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={stagedPreviewUrl}
                            alt="Preview"
                            className="max-h-48 max-w-full object-contain"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {stagedFile.name} ({(stagedFile.size / 1024).toFixed(0)} KB)
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleUpload}
                            disabled={isUploading}
                            className="gap-1.5"
                        >
                            {isUploading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Upload className="h-3.5 w-3.5" />
                            )}
                            {isUploading ? 'Uploading...' : 'Save Image'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={clearStaged}
                            disabled={isUploading}
                            className="gap-1.5"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

            {/* Upload button — hidden input */}
            {!stagedFile && (
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES.join(',')}
                        onChange={handleFileChange}
                        className="sr-only"
                        id={`question-image-input-${questionId}`}
                    />
                    <label htmlFor={`question-image-input-${questionId}`}>
                        <span
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            )}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    fileInputRef.current?.click();
                                }
                            }}
                        >
                            {savedImageUrl ? (
                                <>
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    Replace Image
                                </>
                            ) : (
                                <>
                                    <Upload className="h-3.5 w-3.5" />
                                    Upload Image
                                </>
                            )}
                        </span>
                    </label>
                    <p className="mt-1 text-xs text-muted-foreground">
                        JPG, PNG, GIF or WebP &bull; Max 2 MB
                    </p>
                </div>
            )}
        </div>
    );
}
