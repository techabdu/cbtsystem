<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Student Transcript</title>
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

        /* ---- Student Info Block ---- */
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

        /* ---- Results Table ---- */
        .section-title {
            font-size: 13px;
            font-weight: bold;
            color: #1a5276;
            border-bottom: 1px solid #aed6f1;
            padding-bottom: 4px;
            margin-bottom: 10px;
        }

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
            vertical-align: top;
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

        /* ---- Grade Scale ---- */
        .grade-legend {
            background: #fdfefe;
            border: 1px solid #d5d8dc;
            border-radius: 4px;
            padding: 10px 14px;
            margin-bottom: 18px;
        }

        .grade-legend .legend-title {
            font-weight: bold;
            color: #1a5276;
            margin-bottom: 6px;
        }

        .grade-legend table {
            border-collapse: collapse;
        }

        .grade-legend td {
            padding: 3px 14px 3px 0;
            font-size: 11px;
        }

        /* ---- Footer ---- */
        .footer {
            border-top: 1px solid #d5d8dc;
            padding-top: 10px;
            font-size: 10px;
            color: #888888;
            display: flex;
            justify-content: space-between;
        }

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
        <div class="subtitle">Academic Examination Records Office</div>
        <div class="doc-title">Official Student Transcript</div>
    </div>

    {{-- ============================================================ --}}
    {{-- Student Information                                          --}}
    {{-- ============================================================ --}}
    <div class="info-block">
        <table>
            <tr>
                <td class="label">Student Name:</td>
                <td class="value">{{ $student->full_name }}</td>
                <td class="label">Matric No:</td>
                <td class="value">{{ $student->student_id ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="label">Email:</td>
                <td class="value">{{ $student->email }}</td>
                <td class="label">Phone:</td>
                <td class="value">{{ $student->phone ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="label">Department:</td>
                <td class="value">{{ $student->department?->name ?? 'N/A' }}</td>
                <td class="label">School:</td>
                <td class="value">{{ $student->department?->school?->name ?? 'N/A' }}</td>
            </tr>
            <tr>
                <td class="label">Level:</td>
                <td class="value">{{ $student->level?->name ?? $student->level_id ?? 'N/A' }}</td>
                <td class="label">Combination:</td>
                <td class="value">{{ $student->combination?->name ?? 'N/A' }}</td>
            </tr>
        </table>
    </div>

    {{-- ============================================================ --}}
    {{-- Results Table                                                --}}
    {{-- ============================================================ --}}
    <div class="section-title">Examination Results</div>

    @if($results->isEmpty())
        <div class="no-results">No examination results found for this student.</div>
    @else
        <table class="results-table">
            <thead>
                <tr>
                    <th style="width: 28%">Exam Title</th>
                    <th style="width: 14%">Course</th>
                    <th style="width: 8%; text-align: right;">Score</th>
                    <th style="width: 10%; text-align: right;">Total</th>
                    <th style="width: 10%; text-align: right;">%</th>
                    <th style="width: 8%; text-align: center;">Grade</th>
                    <th style="width: 10%; text-align: center;">Status</th>
                    <th style="width: 12%">Date</th>
                </tr>
            </thead>
            <tbody>
                @foreach($results as $result)
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
                        <td>{{ $result['exam_title'] ?? 'N/A' }}</td>
                        <td>{{ $result['course_code'] ?? 'N/A' }}</td>
                        <td style="text-align: right;">{{ number_format($result['score'], 1) }}</td>
                        <td style="text-align: right;">{{ number_format($result['total_marks'], 1) }}</td>
                        <td style="text-align: right;">{{ number_format($result['percentage'], 1) }}%</td>
                        <td style="text-align: center;" class="{{ $gradeClass }}">{{ $result['grade'] }}</td>
                        <td style="text-align: center;">
                            @if($result['passed'])
                                <span class="badge-pass">PASS</span>
                            @else
                                <span class="badge-fail">FAIL</span>
                            @endif
                        </td>
                        <td>{{ $result['submitted_at'] ?? 'N/A' }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif

    {{-- ============================================================ --}}
    {{-- Grade Scale Legend                                           --}}
    {{-- ============================================================ --}}
    <div class="grade-legend">
        <div class="legend-title">Grade Scale</div>
        <table>
            <tr>
                <td><strong>A</strong> — 70% to 100% (Distinction)</td>
                <td><strong>B</strong> — 60% to 69% (Credit)</td>
                <td><strong>C</strong> — 50% to 59% (Merit)</td>
                <td><strong>D</strong> — 45% to 49% (Pass)</td>
                <td><strong>F</strong> — 0% to 44% (Fail)</td>
            </tr>
        </table>
    </div>

    {{-- ============================================================ --}}
    {{-- Footer                                                       --}}
    {{-- ============================================================ --}}
    <div class="footer">
        <span>Generated: {{ $generatedAt }}</span>
        <span>This is a computer-generated transcript. No signature required.</span>
        <span>CBT System v1.0</span>
    </div>

</body>
</html>
