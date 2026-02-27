<?php

namespace App\Exports;

use App\Models\ExamSession;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class ResultsExport implements
    FromCollection,
    WithHeadings,
    WithMapping,
    WithStyles,
    ShouldAutoSize
{
    /**
     * @param  array<string, mixed>  $filters
     */
    public function __construct(
        private readonly array $filters = []
    ) {}

    /**
     * @return Collection
     */
    public function collection(): Collection
    {
        $query = ExamSession::query()
            ->whereIn('status', ['submitted', 'auto_submitted'])
            ->with([
                'student.department',
                'exam.course.department.school',
            ]);

        if (! empty($this->filters['exam_id'])) {
            $query->where('exam_id', (int) $this->filters['exam_id']);
        }

        if (! empty($this->filters['department_id'])) {
            $query->whereHas(
                'exam.course',
                fn ($q) => $q->where('department_id', (int) $this->filters['department_id'])
            );
        }

        if (! empty($this->filters['school_id'])) {
            $query->whereHas(
                'exam.course.department',
                fn ($q) => $q->where('school_id', (int) $this->filters['school_id'])
            );
        }

        return $query->get();
    }

    /**
     * Column headings for the Excel sheet.
     *
     * @return array<int, string>
     */
    public function headings(): array
    {
        return [
            'Student Name',
            'Matric No',
            'Exam Title',
            'Course Code',
            'Score',
            'Total Marks',
            'Percentage',
            'Grade',
            'Status',
            'Date Submitted',
        ];
    }

    /**
     * Map each session row to an array of values.
     *
     * @param  ExamSession  $session
     * @return array<int, mixed>
     */
    public function map($session): array
    {
        $student    = $session->student;
        $exam       = $session->exam;
        $score      = (float) ($session->total_score ?? 0);
        $totalMarks = (float) ($exam?->total_marks ?? 0);
        $percentage = $totalMarks > 0 ? round(($score / $totalMarks) * 100, 2) : 0;
        $grade      = $this->calculateGrade($percentage);
        $passed     = $score >= (float) ($exam?->passing_marks ?? $totalMarks * 0.5);

        return [
            $student?->full_name,
            $student?->student_id,
            $exam?->title,
            $exam?->course?->code,
            number_format($score, 2),
            number_format($totalMarks, 2),
            number_format($percentage, 2) . '%',
            $grade,
            $passed ? 'Passed' : 'Failed',
            $session->submitted_at?->format('Y-m-d H:i'),
        ];
    }

    /**
     * Style the header row.
     */
    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '375623']],
                'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }

    /**
     * Calculate letter grade from percentage score.
     */
    private function calculateGrade(float $percentage): string
    {
        return match (true) {
            $percentage >= 70 => 'A',
            $percentage >= 60 => 'B',
            $percentage >= 50 => 'C',
            $percentage >= 45 => 'D',
            default           => 'F',
        };
    }
}
