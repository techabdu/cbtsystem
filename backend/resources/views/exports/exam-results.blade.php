<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Exam Results — {{ $exam->title }}</title>
    <style>
        /* ---- Reset ---- */
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 12px;
            color: #333333;
            background: #ffffff;
            padding: 20px 30px;
        }

        /* ---- Header ---- */
        .header {
            text-align: center;
            border-bottom: 3px solid #1a5276;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }

        .header .institution {
            font-size: 18px;
            font-weight: bold;
            color: #1a5276;
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .header .subtitle {
            font-size: 13px;
            color: #555555;
            margin-top: 4px;
        }

        .header .doc-title {
            font-size: 15px;
            font-weight: bold;
            color: #c0392b;
            margin-top: 8px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        /* ---- Exam Info Block ---- */
        .info-block {
            background: #eaf4fb;
            border: 1px solid #aed6f1;
            border-radius: 4px;
            padding: 12px 16px;
            margin-bottom: 18px;
        }

        .info-block table {
            width: 100%;
            border-collapse: collapse;
        }

        .info-block td {
            padding: 4px 8px;
            vertical-align: top;
        }

        .info-block .label {
            font-weight: bold;
            color: #1a5276;
            width: 22%;
        }

        .info-block .value {
            width: 28%;
        }

        /* ---- Statistics Cards ---- */
        .stats-row {
            display: flex;
            margin-bottom: 18px;
        }

        .stat-card {
            flex: 1;
            text-align: center;
            border: 1px solid #d5d8dc;
            border-radius: 4px;
            padding: 10px 8px;
            margin-right: 8px;
            background: #fdfefe;
        }

        .stat-card:last-child {
            margin-right: 0;
        }

        .stat-card .stat-label {
            font-size: 10px;
            color: #888888;
            text-transform: uppercase;
            margin-bottom: 4px;
        }

        .stat-card .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #1a5276;
        }

        /* Fallback for DomPDF flex issues — use table */
        .stats-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 8px 0;
            margin-bottom: 18px;
        }

        .stats-table td {
            text-align: center;
            border: 1px solid #d5d8dc;
            border-radius: 4px;
            padding: 10px 8px;
            background: #fdfefe;
            width: 20%;
        }

        .stats-table .s-label {
            font-size: 10px;
            color: #888888;
            text-transform: uppercase;
            display: block;
        }

        .stats-table .s-value {
            font-size: 16px;
            font-weight: bold;
            color: #1a5276;
            display: block;
        }

        /* ---- Section Title ---- */
        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #1a5276;
            border-bottom: 1px solid #aed6f1;
            padding-bottom: 4px;
            margin-bottom: 10px;
        }

        /* ---- Results Table ---- */
        .results-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }

        .results-table th {
            background: #1a5276;
            color: #ffffff;
            padding: 7px 8px;
            text-align: left;
            font-size: 11px;
            font-weight: bold;
        }

        .results-table td {
            padding: 6px 8px;
            border-bottom: 1px solid #d5d8dc;
        }

        .results-table tr:nth-child(even) td {
            background: #f8f9fa;
        }

        .results-table .grade-a { color: #1e8449; font-weight: bold; }
        .results-table .grade-b { color: #2874a6; font-weight: bold; }
        .results-table .grade-c { color: #b7950b; font-weight: bold; }
        .results-table .grade-d { color: #d35400; font-weight: bold; }
        .results-table .grade-f { color: #c0392b; font-weight: bold; }

        .badge-pass {
            background: #d5f5e3;
            color: #1e8449;
            padding: 2px 7px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
        }

        .badge-fail {
            background: #fadbd8;
            color: #c0392b;
            padding: 2px 7px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: bold;
        }

        /* ---- Footer ---- */
        .footer {
            border-top: 1px solid #d5d8dc;
            padding-top: 10px;
            font-size: 10px;
            color: #888888;
        }

        .footer-left { float: left; }
        .footer-right { float: right; }

        .no-results {
            text-align: center;
            padding: 20px;
            color: #888888;
            font-style: italic;
        }
    </style>
</head>
<body>

    {{-- ============================================================ --}}
    {{-- Header                                                       --}}
    {{-- ============================================================ --}}
    <div class="header">
        <div class="institution">CBT Learning Management System</div>
        <div class="subtitle">Examination Results Summary</div>
        <div class="doc-title">{{ $exam->title }}</div>
    </div>

    {{-- ============================================================ --}}
    {{-- Exam Information                                             --}}
    {{-- ============================================================ --}}
    <div class="info-block">
        <table>
            <tr>
                <td class="label">Exam Title:</td>
                <td class="value">{{ $exam->title }}</td>
                <td class="label">Course Code:</td>
                <td class="value">{{ $exam->course?->code ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="label">Course Title:</td>
                <td class="value">{{ $exam->course?->title ?? 'N/A' }}</td>
                <td class="label">Department:</td>
                <td class="value">{{ $exam->course?->department?->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="label">Total Marks:</td>
                <td class="value">{{ number_format($exam->total_marks, 1) }}</td>
                <td class="label">Passing Marks:</td>
                <td class="value">{{ number_format($exam->passing_marks, 1) }}</td>
            </tr>
            <tr>
                <td class="label">Examiner:</td>
                <td class="value">{{ $exam->creator?->full_name ?? 'N/A' }}</td>
                <td class="label">Status:</td>
                <td class="value">{{ strtoupper(str_replace('_', ' ', $exam->status)) }}</td>
            </tr>
        </table>
    </div>

    {{-- ============================================================ --}}
    {{-- Summary Statistics                                           --}}
    {{-- ============================================================ --}}
    <div class="section-title">Summary Statistics</div>

    <table class="stats-table">
        <tr>
            <td>
                <span class="s-label">Total Students</span>
                <span class="s-value">{{ $summary['total_students'] }}</span>
            </td>
            <td>
                <span class="s-label">Mean Score</span>
                <span class="s-value">{{ number_format($summary['mean_score'], 1) }}</span>
            </td>
            <td>
                <span class="s-label">Highest Score</span>
                <span class="s-value">{{ number_format($summary['highest_score'], 1) }}</span>
            </td>
            <td>
                <span class="s-label">Lowest Score</span>
                <span class="s-value">{{ number_format($summary['lowest_score'], 1) }}</span>
            </td>
            <td>
                <span class="s-label">Pass Rate</span>
                <span class="s-value">{{ number_format($summary['pass_rate'], 1) }}%</span>
            </td>
        </tr>
    </table>

    {{-- ============================================================ --}}
    {{-- Per-Student Results                                          --}}
    {{-- ============================================================ --}}
    <div class="section-title">Student Results</div>

    @if($results->isEmpty())
        <div class="no-results">No submitted results found for this exam.</div>
    @else
        <table class="results-table">
            <thead>
                <tr>
                    <th style="width: 5%">#</th>
                    <th style="width: 30%">Student Name</th>
                    <th style="width: 16%">Matric No</th>
                    <th style="width: 10%; text-align: right;">Score</th>
                    <th style="width: 10%; text-align: right;">%</th>
                    <th style="width: 8%; text-align: center;">Grade</th>
                    <th style="width: 11%; text-align: center;">Result</th>
                </tr>
            </thead>
            <tbody>
                @foreach($results as $index => $result)
                    @php
                        $gradeClass = match($result['grade']) {
                            'A' => 'grade-a',
                            'B' => 'grade-b',
                            'C' => 'grade-c',
                            'D' => 'grade-d',
                            default => 'grade-f',
                        };
                    @endphp
                    <tr>
                        <td>{{ $index + 1 }}</td>
                        <td>{{ $result['student_name'] ?? 'N/A' }}</td>
                        <td>{{ $result['matric_no'] ?? 'N/A' }}</td>
                        <td style="text-align: right;">{{ number_format($result['score'], 1) }}</td>
                        <td style="text-align: right;">{{ number_format($result['percentage'], 1) }}%</td>
                        <td style="text-align: center;" class="{{ $gradeClass }}">{{ $result['grade'] }}</td>
                        <td style="text-align: center;">
                            @if($result['passed'])
                                <span class="badge-pass">PASS</span>
                            @else
                                <span class="badge-fail">FAIL</span>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- ============================================================ --}}
    {{-- Footer                                                       --}}
    {{-- ============================================================ --}}
    <div class="footer">
        <span class="footer-left">Generated: {{ $generatedAt }}</span>
        <span class="footer-right">CBT System v1.0 — Confidential</span>
    </div>

</body>
</html>
