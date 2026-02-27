'use client';

import { useState } from 'react';
import Link from 'next/link';
import { bulkUploadUsers, downloadTemplate, type BulkUploadUsersResult } from '@/lib/api/users';
import { FileDropzone } from '@/components/ui/FileDropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Upload, Download, ChevronRight, CheckCircle2, AlertCircle,
    ChevronDown, ChevronUp, RotateCcw, GraduationCap,
} from 'lucide-react';

const COLUMNS = [
    { column: 'Full Name',         required: true,  example: 'Jane Doe',        notes: 'First + Last name (space-separated)' },
    { column: 'Identifier',        required: true,  example: 'CSC/2024/001',    notes: 'Matric number — student uses this to activate their account' },
    { column: 'Email',             required: false, example: 'jane@college.edu', notes: 'Optional — placeholder auto-generated if left blank' },
    { column: 'Role',              required: true,  example: 'student',          notes: 'Must be exactly "student" (lowercase)' },
    { column: 'Combination Code',  required: false, example: 'CSC/MTH',         notes: 'Combination code — school is auto-assigned from this' },
    { column: 'Level Code',        required: false, example: '100L',             notes: 'Level code (e.g. 100L, 200L, 300L)' },
    { column: 'Phone',             required: false, example: '+2348012345678',   notes: 'Optional contact number' },
];

type UploadState = 'idle' | 'uploading' | 'done';

export default function BulkUploadStudentsPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadState, setUploadState] = useState<UploadState>('idle');
    const [result, setResult] = useState<BulkUploadUsersResult | null>(null);
    const [uploadError, setUploadError] = useState<string>('');
    const [showErrors, setShowErrors] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleFile = (file: File) => {
        setSelectedFile(file);
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
                error.response?.data?.message || 'Upload failed. Please check the file format and try again.'
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
                    <Link href="/edu_portal/students" className="hover:text-foreground transition-colors">
                        Students
                    </Link>
                    <ChevronRight className="h-4 w-4" />
                    <span className="text-foreground font-medium">Bulk Upload</span>
                </nav>
                <h1 className="text-2xl font-bold tracking-tight">Bulk Upload Students</h1>
                <p className="text-muted-foreground">
                    Upload an Excel spreadsheet to create multiple student accounts at once.
                </p>
            </div>

            {/* Step 1 — Download Template */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-primary" />
                        Step 1 — Download Template
                    </CardTitle>
                    <CardDescription>
                        Download the Excel template, fill in the student details, then upload the file below.
                        The <strong>Combination Code</strong> (e.g. <code>CSC/MTH</code>) automatically sets the student's
                        school. The <strong>Level Code</strong> (e.g. <code>100L</code>) sets their academic level.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        onClick={async () => {
                            setIsDownloading(true);
                            try { await downloadTemplate('bulk-students-template'); }
                            catch { alert('Download failed. Please try again.'); }
                            finally { setIsDownloading(false); }
                        }}
                        disabled={isDownloading}
                        className="gap-2"
                    >
                        <Download className="h-4 w-4" />
                        {isDownloading ? 'Downloading…' : 'Download Template (.xlsx)'}
                    </Button>

                    <div>
                        <p className="mb-2 text-sm font-medium">Column guide:</p>
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
                                                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">Required</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Optional</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell font-mono text-xs">{col.example || '—'}</td>
                                            <td className="px-3 py-2 text-muted-foreground hidden md:table-cell text-xs">{col.notes}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </CardContent>
            </Card>

            {/* Step 2 — Upload */}
            {!isDone && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-primary" />
                            Step 2 — Upload File
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

                        {uploadError && (
                            <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                {uploadError}
                            </div>
                        )}

                        <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className="gap-2">
                            {isUploading ? (
                                <><Upload className="h-4 w-4 animate-pulse" /> Processing…</>
                            ) : (
                                <><Upload className="h-4 w-4" /> Upload &amp; Process</>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Step 3 — Results */}
            {isDone && result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-5 w-5" />
                            Upload Complete
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-4 text-center">
                                <GraduationCap className="mx-auto mb-1 h-5 w-5 text-green-600 dark:text-green-400" />
                                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{result.created}</p>
                                <p className="text-xs text-muted-foreground">Students Created</p>
                            </div>
                            <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4 text-center">
                                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{result.skipped}</p>
                                <p className="text-xs text-muted-foreground">Skipped (already exist)</p>
                            </div>
                            <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-4 text-center">
                                <p className="text-2xl font-bold text-red-700 dark:text-red-300">{result.errors.length}</p>
                                <p className="text-xs text-muted-foreground">Errors</p>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div className="rounded-md border border-destructive/20 bg-destructive/5">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-destructive"
                                    onClick={() => setShowErrors((v) => !v)}
                                >
                                    <span className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        {result.errors.length} row error{result.errors.length !== 1 ? 's' : ''} — click to {showErrors ? 'hide' : 'view'}
                                    </span>
                                    {showErrors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                                {showErrors && (
                                    <div className="border-t">
                                        <div className="max-h-60 overflow-y-auto">
                                            {result.errors.map((err, idx) => (
                                                <div key={idx} className="flex items-start gap-3 border-b last:border-0 px-4 py-2 text-sm">
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

                        <div className="flex flex-wrap gap-3">
                            <Button variant="outline" onClick={handleReset} className="gap-2">
                                <RotateCcw className="h-4 w-4" />
                                Upload Another File
                            </Button>
                            <Link href="/edu_portal/students">
                                <Button variant="secondary" className="gap-2">
                                    <GraduationCap className="h-4 w-4" />
                                    View All Students
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
