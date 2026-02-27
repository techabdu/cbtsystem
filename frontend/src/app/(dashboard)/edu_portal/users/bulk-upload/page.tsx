'use client';

import { useState } from 'react';
import Link from 'next/link';
import { bulkUploadUsers, type BulkUploadUsersResult } from '@/lib/api/users';
import { BACKEND_URL } from '@/lib/constants';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Upload,
    Download,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    RotateCcw,
    Users,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Column guide data                                                   */
/* ------------------------------------------------------------------ */

const COLUMNS = [
    { column: 'Full Name', required: true, example: 'John Doe', notes: 'First + Last name' },
    { column: 'Identifier', required: true, example: 'STU/2024/001', notes: 'Matric or staff number' },
    { column: 'Email', required: true, example: 'john@example.com', notes: 'Must be unique' },
    { column: 'Role', required: true, example: 'student', notes: 'student, lecturer, edu_portal, cbt' },
    { column: 'Department Name', required: false, example: 'Computer Science', notes: 'Must match existing dept' },
    { column: 'Phone', required: false, example: '+2348012345678', notes: 'Optional contact number' },
];

/* ------------------------------------------------------------------ */
/*  Status badge                                                        */
/* ------------------------------------------------------------------ */

type UploadState = 'idle' | 'uploading' | 'done';

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function BulkUploadUsersPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [result, setResult] = useState<BulkUploadUsersResult | null>(null);
    const [uploadError, setUploadError] = useState<string>('');
    const [showErrors, setShowErrors] = useState(false);

    const handleFile = (file: File) => {
        setSelectedFile(file);
        // Reset previous results when new file selected
        setResult(null);
        setUploadError('');
    };

    const handleClear = () => {
        setSelectedFile(null);
        setResult(null);
        setUploadError('');
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploadState('uploading');
        setUploadError('');
        setResult(null);

        try {
            const res = await bulkUploadUsers(selectedFile);
            setResult(res);
            setUploadState('done');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setUploadError(
                error.response?.data?.message ||
                    'Upload failed. Please check the file format and try again.'
            );
            setUploadState('idle');
        }
    };

    const handleReset = () => {
        setSelectedFile(null);
        setResult(null);
        setUploadError('');
        setShowErrors(false);
        setUploadState('idle');
    };

    const isUploading = uploadState === 'uploading';
    const isDone = uploadState === 'done';

    return (
        <div className="space-y-6 max-w-3xl">
            {/* Breadcrumb + Header */}
            <div>
                <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                    <Link href="/edu_portal/users" className="hover:text-foreground transition-colors">
                        Users
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground font-medium">Bulk Install</span>
                </nav>
                <h1 className="text-2xl font-bold tracking-tight">Bulk Install Users</h1>
                <p className="text-muted-foreground">
                    Upload an Excel spreadsheet to create multiple users at once.
                </p>
            </div>

            {/* Section 1 — Download Template */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Download Template
                    </CardTitle>
                    <CardDescription>
                        Download the Excel template, fill in the user details, then upload the file below.
                        Keep the column headers exactly as provided.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <a
                        href={`${BACKEND_URL}/templates/bulk-users-template.xlsx`}
                        download
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        <Download className="h-4 w-4" />
                        Download Template (.xlsx)
                    </a>

                    {/* Column Guide */}
                    <div>
                        <p className="mb-2 text-sm font-medium">Required columns:</p>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Column</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Required</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden sm:table-cell">Example</th>
                                        <th className="px-3 py-2 text-left font-medium text-muted-foreground hidden md:table-cell">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COLUMNS.map((col) => (
                                        <tr key={col.column} className="border-b last:border-0">
                                            <td className="px-3 py-2 font-mono text-xs font-medium">{col.column}</td>
                                            <td className="px-3 py-2">
                                                {col.required ? (
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                                        Required
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                        Optional
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell font-mono text-xs">
                                                {col.example}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground hidden md:table-cell text-xs">
                                                {col.notes}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Section 2 — Upload File */}
            {!isDone && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Upload File
                        </CardTitle>
                        <CardDescription>
                            Select your completed spreadsheet. Maximum 500 rows per file.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FileDropzone
                            onFile={handleFile}
                            onClear={handleClear}
                            selectedFile={selectedFile}
                            accept={{
                                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                                'application/vnd.ms-excel': ['.xls'],
                            }}
                            label="Drag & drop your Excel file here, or click to browse"
                            helpText="Accepts .xlsx and .xls files only — max 500 rows"
                            isLoading={isUploading}
                        />

                        {/* Upload error */}
                        {uploadError && (
                            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                {uploadError}
                            </div>
                        )}

                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || isUploading}
                            className="gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <Upload className="h-4 w-4 animate-pulse" />
                                    Processing…
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4" />
                                    Upload &amp; Process
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Section 3 — Results */}
            {isDone && result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            Upload Complete
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Summary */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 text-center">
                                <Users className="mx-auto mb-1 h-5 w-5 text-green-600 dark:text-green-400" />
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                                    {result.created}
                                </p>
                                <p className="text-xs text-muted-foreground">Users Created</p>
                            </div>
                            <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4 text-center">
                                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                                    {result.skipped}
                                </p>
                                <p className="text-xs text-muted-foreground">Skipped (already exist)</p>
                            </div>
                            <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4 text-center">
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                                    {result.errors.length}
                                </p>
                                <p className="text-xs text-muted-foreground">Errors</p>
                            </div>
                        </div>

                        {/* Errors list */}
                        {result.errors.length > 0 && (
                            <div className="rounded-md border border-destructive/20 bg-destructive/5">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-destructive"
                                    onClick={() => setShowErrors((v) => !v)}
                                >
                                    <span className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        {result.errors.length} row error{result.errors.length !== 1 ? 's' : ''} — click to{' '}
                                        {showErrors ? 'hide' : 'view'}
                                    </span>
                                    {showErrors ? (
                                        <ChevronUp className="h-4 w-4" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4" />
                                    )}
                                </button>
                                {showErrors && (
                                    <div className="border-t">
                                        <div className="max-h-60 overflow-y-auto">
                                            {result.errors.map((err, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start gap-3 border-b last:border-0 px-4 py-2 text-sm"
                                                >
                                                    <span className="shrink-0 rounded bg-destructive/10 px-2 py-0.5 font-mono text-xs font-medium text-destructive">
                                                        Row {err.row}
                                                    </span>
                                                    <span className="text-muted-foreground">{err.message}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                            <Button variant="outline" onClick={handleReset} className="gap-2">
                                <RotateCcw className="h-4 w-4" />
                                Upload Another File
                            </Button>
                            <Link href="/edu_portal/users">
                                <Button variant="secondary" className="gap-2">
                                    <Users className="h-4 w-4" />
                                    View All Users
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
