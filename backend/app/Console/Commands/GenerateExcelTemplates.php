<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Style\Border;

class GenerateExcelTemplates extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'templates:generate';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate Excel template files for bulk user and question uploads';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $templateDir = public_path('templates');

        if (! is_dir($templateDir)) {
            mkdir($templateDir, 0755, true);
            $this->info("Created templates directory: {$templateDir}");
        }

        $this->generateBulkUsersTemplate($templateDir);
        $this->generateBulkStudentsTemplate($templateDir);
        $this->generateBulkLecturersTemplate($templateDir);
        $this->generateBulkQuestionsTemplate($templateDir);

        $this->info('Excel templates generated successfully.');

        return Command::SUCCESS;
    }

    /**
     * Generate the bulk users upload template.
     */
    private function generateBulkUsersTemplate(string $dir): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Users');

        // Column headers
        $headers = [
            'A1' => 'Full Name',
            'B1' => 'Identifier',
            'C1' => 'Email',
            'D1' => 'Role',
            'E1' => 'Department Name',
            'F1' => 'Phone',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Header row styling
        $headerStyle = [
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4472C4']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ];
        $sheet->getStyle('A1:F1')->applyFromArray($headerStyle);

        // Sample data rows
        $sampleRows = [
            ['John Doe', 'STU/2024/001', 'john@example.com', 'student', 'Computer Science', '08012345678'],
            ['Jane Smith', 'STAFF/001', 'jane@example.com', 'lecturer', 'Mathematics', '08087654321'],
        ];

        foreach ($sampleRows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 2;
            $sheet->fromArray($row, null, "A{$rowNumber}");
        }

        // Helper comments in row 4
        $sheet->setCellValue('D4', 'student or lecturer');
        $sheet->setCellValue('D5', '(use exact role name)');

        // Column widths
        $columnWidths = ['A' => 25, 'B' => 20, 'C' => 30, 'D' => 15, 'E' => 30, 'F' => 18];
        foreach ($columnWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Data validation for Role column
        $validation = $sheet->getCell('D2')->getDataValidation();
        $validation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
        $validation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_INFORMATION);
        $validation->setAllowBlank(false);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"student,lecturer"');
        $sheet->setDataValidation('D2:D501', $validation);

        // Freeze header row
        $sheet->freezePane('A2');

        // Write file
        $writer = new Xlsx($spreadsheet);
        $writer->save("{$dir}/bulk-users-template.xlsx");

        $this->line("  <fg=green>✓</> Generated: bulk-users-template.xlsx");
    }

    /**
     * Generate the student-specific bulk upload template.
     * Columns: Full Name, Identifier (matric), Email, Role, Combination Code, Level Code, Phone
     */
    private function generateBulkStudentsTemplate(string $dir): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Students');

        $headers = [
            'A1' => 'Full Name',
            'B1' => 'Identifier',
            'C1' => 'Email',
            'D1' => 'Role',
            'E1' => 'Combination Code',
            'F1' => 'Level Code',
            'G1' => 'Phone',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1D7A4A']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ];
        $sheet->getStyle('A1:G1')->applyFromArray($headerStyle);

        // Sample data rows
        $sampleRows = [
            ['Jane Doe',   'CSC/2024/001', 'jane@college.edu',  'student', 'CSC/MTH', '100L', '08012345678'],
            ['John Smith', 'ENG/2024/002', '',                  'student', 'ENG/PHY', '200L', ''],
        ];

        foreach ($sampleRows as $i => $row) {
            $sheet->fromArray($row, null, 'A' . ($i + 2));
        }

        // Helper notes
        $sheet->setCellValue('D4', 'Must be exactly: student');
        $sheet->setCellValue('E4', 'e.g. CSC/MTH  (combination code)');
        $sheet->setCellValue('F4', 'e.g. 100L  (level code)');

        // Column widths
        foreach (['A' => 25, 'B' => 20, 'C' => 30, 'D' => 12, 'E' => 22, 'F' => 14, 'G' => 18] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Role dropdown validation
        $validation = $sheet->getCell('D2')->getDataValidation();
        $validation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
        $validation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_STOP);
        $validation->setAllowBlank(false);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"student"');
        $sheet->setDataValidation('D2:D501', $validation);

        $sheet->freezePane('A2');

        $writer = new Xlsx($spreadsheet);
        $writer->save("{$dir}/bulk-students-template.xlsx");
        $this->line("  <fg=green>✓</> Generated: bulk-students-template.xlsx");
    }

    /**
     * Generate the lecturer-specific bulk upload template.
     * Columns: Full Name, Identifier (file no), Email, Role, Department Code, Phone
     */
    private function generateBulkLecturersTemplate(string $dir): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Lecturers');

        $headers = [
            'A1' => 'Full Name',
            'B1' => 'Identifier',
            'C1' => 'Email',
            'D1' => 'Role',
            'E1' => 'Department Code',
            'F1' => 'Phone',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        $headerStyle = [
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1B4F9A']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ];
        $sheet->getStyle('A1:F1')->applyFromArray($headerStyle);

        // Sample data rows
        $sampleRows = [
            ['Dr. John Doe',   'STF/2024/001', 'john@college.edu', 'lecturer', 'CSC', '08012345678'],
            ['Mrs. Jane Smith', 'STF/2024/002', '',                'lecturer', 'MTH', ''],
        ];

        foreach ($sampleRows as $i => $row) {
            $sheet->fromArray($row, null, 'A' . ($i + 2));
        }

        // Helper notes
        $sheet->setCellValue('D4', 'Must be exactly: lecturer');
        $sheet->setCellValue('E4', 'e.g. CSC  (department code)');

        // Column widths
        foreach (['A' => 25, 'B' => 20, 'C' => 30, 'D' => 12, 'E' => 20, 'F' => 18] as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Role dropdown validation
        $validation = $sheet->getCell('D2')->getDataValidation();
        $validation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
        $validation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_STOP);
        $validation->setAllowBlank(false);
        $validation->setShowDropDown(true);
        $validation->setFormula1('"lecturer"');
        $sheet->setDataValidation('D2:D501', $validation);

        $sheet->freezePane('A2');

        $writer = new Xlsx($spreadsheet);
        $writer->save("{$dir}/bulk-lecturers-template.xlsx");
        $this->line("  <fg=green>✓</> Generated: bulk-lecturers-template.xlsx");
    }

    /**
     * Generate the bulk questions upload template.
     */
    private function generateBulkQuestionsTemplate(string $dir): void
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Questions');

        // Column headers
        $headers = [
            'A1' => 'Question',
            'B1' => 'Option A',
            'C1' => 'Option B',
            'D1' => 'Option C',
            'E1' => 'Option D',
            'F1' => 'Correct Answer',
            'G1' => 'Question Type',
            'H1' => 'Difficulty Level',
            'I1' => 'Topic',
            'J1' => 'Course Code',
        ];

        foreach ($headers as $cell => $value) {
            $sheet->setCellValue($cell, $value);
        }

        // Header row styling
        $headerStyle = [
            'font'      => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '375623']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]],
        ];
        $sheet->getStyle('A1:J1')->applyFromArray($headerStyle);

        // Sample data rows
        $sampleRows = [
            [
                'What is the capital of Nigeria?',
                'Lagos', 'Abuja', 'Kano', 'Port Harcourt',
                'B', 'mcq', 'easy', 'Geography', 'GEO101',
            ],
            [
                'Water boils at 100 degrees Celsius at sea level.',
                'True', 'False', '', '',
                'A', 'true_false', 'easy', 'Physics', 'PHY101',
            ],
        ];

        foreach ($sampleRows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 2;
            $sheet->fromArray($row, null, "A{$rowNumber}");
        }

        // Helper note row
        $sheet->setCellValue('F4', 'A, B, C, or D');
        $sheet->setCellValue('G4', 'mcq or true_false');
        $sheet->setCellValue('H4', 'easy, medium, or hard');

        // Column widths
        $columnWidths = ['A' => 50, 'B' => 20, 'C' => 20, 'D' => 20, 'E' => 20, 'F' => 16, 'G' => 15, 'H' => 16, 'I' => 20, 'J' => 14];
        foreach ($columnWidths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Data validation for Correct Answer column
        $answerValidation = $sheet->getCell('F2')->getDataValidation();
        $answerValidation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
        $answerValidation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_INFORMATION);
        $answerValidation->setAllowBlank(false);
        $answerValidation->setShowDropDown(true);
        $answerValidation->setFormula1('"A,B,C,D"');
        $sheet->setDataValidation('F2:F501', $answerValidation);

        // Data validation for Question Type column
        $typeValidation = $sheet->getCell('G2')->getDataValidation();
        $typeValidation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
        $typeValidation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_INFORMATION);
        $typeValidation->setAllowBlank(false);
        $typeValidation->setShowDropDown(true);
        $typeValidation->setFormula1('"mcq,true_false"');
        $sheet->setDataValidation('G2:G501', $typeValidation);

        // Data validation for Difficulty Level column
        $diffValidation = $sheet->getCell('H2')->getDataValidation();
        $diffValidation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
        $diffValidation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_INFORMATION);
        $diffValidation->setAllowBlank(false);
        $diffValidation->setShowDropDown(true);
        $diffValidation->setFormula1('"easy,medium,hard"');
        $sheet->setDataValidation('H2:H501', $diffValidation);

        // Wrap text for question column
        $sheet->getStyle('A2:A501')->getAlignment()->setWrapText(true);

        // Freeze header row
        $sheet->freezePane('A2');

        // Write file
        $writer = new Xlsx($spreadsheet);
        $writer->save("{$dir}/bulk-questions-template.xlsx");

        $this->line("  <fg=green>✓</> Generated: bulk-questions-template.xlsx");
    }
}
