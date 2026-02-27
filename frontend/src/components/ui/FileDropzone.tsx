'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { Upload, File, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Props                                                               */
/* ------------------------------------------------------------------ */

interface FileDropzoneProps {
    onFile: (file: File) => void;
    accept?: Accept;
    label?: string;
    helpText?: string;
    isLoading?: boolean;
    /** Clear the currently selected file */
    onClear?: () => void;
    /** Externally controlled selected file (shows filename even after parent re-renders) */
    selectedFile?: File | null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export function FileDropzone({
    onFile,
    accept,
    label = 'Drag & drop or click to browse',
    helpText,
    isLoading = false,
    onClear,
    selectedFile,
}: FileDropzoneProps) {
    // Internal file state when `selectedFile` prop is not provided
    const [internalFile, setInternalFile] = useState<File | null>(null);

    const file = selectedFile !== undefined ? selectedFile : internalFile;

    const onDrop = useCallback(
        (acceptedFiles: File[]) => {
            if (isLoading) return;
            const picked = acceptedFiles[0];
            if (!picked) return;
            if (selectedFile === undefined) setInternalFile(picked);
            onFile(picked);
        },
        [isLoading, onFile, selectedFile]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        multiple: false,
        disabled: isLoading,
    });

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (selectedFile === undefined) setInternalFile(null);
        onClear?.();
    };

    return (
        <div className="space-y-2">
            {/* Drop Zone */}
            <div
                {...getRootProps()}
                className={cn(
                    'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                    isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
                    isLoading && 'cursor-not-allowed opacity-60',
                    file && 'border-primary/40 bg-primary/5'
                )}
            >
                <input {...getInputProps()} />

                {isLoading ? (
                    <>
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">Uploading…</p>
                    </>
                ) : file ? (
                    <>
                        <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 p-2">
                                <File className="h-6 w-6 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium">{file.name}</p>
                                <p className="text-xs text-muted-foreground">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClear}
                            className="absolute right-3 top-3 rounded-full p-1 hover:bg-muted transition-colors"
                            aria-label="Remove file"
                        >
                            <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <p className="text-xs text-muted-foreground">Click to choose a different file</p>
                    </>
                ) : (
                    <>
                        <div className="rounded-full bg-muted p-4">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">{label}</p>
                            {helpText && (
                                <p className="mt-1 text-xs text-muted-foreground">{helpText}</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
