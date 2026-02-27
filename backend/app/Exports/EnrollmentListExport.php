<?php

namespace App\Exports;

use App\Models\CourseEnrollment;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class EnrollmentListExport implements
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
        $query = CourseEnrollment::query()
            ->with([
                'student.department.school',
                'student.level',
                'course.department.school',
            ])
            ->where('status', 'active');

        if (! empty($this->filters['course_id'])) {
            $query->where('course_id', (int) $this->filters['course_id']);
        }

        if (! empty($this->filters['department_id'])) {
            $query->whereHas('course', fn ($q) => $q->where('department_id', (int) $this->filters['department_id']));
        }

        if (! empty($this->filters['school_id'])) {
            $query->whereHas('course.department', fn ($q) => $q->where('school_id', (int) $this->filters['school_id']));
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
            'Email',
            'Course Code',
            'Course Title',
            'Department',
            'School',
            'Level',
        ];
    }

    /**
     * Map each enrollment row to an array of values.
     *
     * @param  CourseEnrollment  $enrollment
     * @return array<int, mixed>
     */
    public function map($enrollment): array
    {
        $student = $enrollment->student;
        $course  = $enrollment->course;

        return [
            $student?->full_name,
            $student?->student_id,
            $student?->email,
            $course?->code,
            $course?->title,
            $course?->department?->name,
            $course?->department?->school?->name,
            $student?->level?->name ?? $student?->level_id,
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
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
                'alignment' => ['horizontal' => \PhpOffice\PhpSpreadsheet\Style\Alignment::HORIZONTAL_CENTER],
            ],
        ];
    }
}
