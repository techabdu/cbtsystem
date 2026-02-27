<?php

namespace App\Imports;

use App\Models\Course;
use App\Models\Question;
use App\Models\User;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class QuestionImport implements ToCollection, WithHeadingRow
{
    private int $created = 0;
    private int $skipped = 0;
    /** @var array<int, array{row: int, message: string}> */
    private array $errors = [];

    public function __construct(
        private readonly User $lecturer
    ) {}

    /**
     * Process the spreadsheet rows as a collection.
     */
    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $this->processRow($row->toArray(), $index + 2);
        }
    }

    /**
     * Process a single row.
     *
     * @param  array<string, mixed>  $row
     */
    private function processRow(array $row, int $rowNumber): void
    {
        // WithHeadingRow lowercases and snakes the heading names
        $questionText = trim((string) ($row['question'] ?? ''));
        $optionA      = trim((string) ($row['option_a'] ?? ''));
        $optionB      = trim((string) ($row['option_b'] ?? ''));
        $optionC      = trim((string) ($row['option_c'] ?? ''));
        $optionD      = trim((string) ($row['option_d'] ?? ''));
        $correctRaw   = strtoupper(trim((string) ($row['correct_answer'] ?? '')));
        $questionType = strtolower(trim((string) ($row['question_type'] ?? 'mcq')));
        $difficulty   = strtolower(trim((string) ($row['difficulty_level'] ?? '')));
        $topic        = trim((string) ($row['topic'] ?? ''));
        $courseCode   = trim((string) ($row['course_code'] ?? ''));

        // ---- Required fields ----
        if (empty($questionText)) {
            $this->recordError($rowNumber, 'Question text is required.');
            return;
        }

        if (empty($correctRaw)) {
            $this->recordError($rowNumber, 'Correct Answer is required (A, B, C, or D).');
            return;
        }

        if (! in_array($correctRaw, ['A', 'B', 'C', 'D'], true)) {
            $this->recordError($rowNumber, "Correct Answer must be A, B, C, or D (got '{$correctRaw}').");
            return;
        }

        // ---- Map correct answer letter to option value ----
        $optionMap = [
            'A' => $optionA,
            'B' => $optionB,
            'C' => $optionC,
            'D' => $optionD,
        ];

        $correctAnswerValue = $optionMap[$correctRaw] ?? '';

        if (empty($correctAnswerValue)) {
            $this->recordError($rowNumber, "Option {$correctRaw} is empty — cannot set it as the correct answer.");
            return;
        }

        // ---- Resolve course ----
        $courseId = null;
        if (! empty($courseCode)) {
            $course = Course::whereRaw('UPPER(code) = ?', [strtoupper($courseCode)])->first();
            if (! $course) {
                $this->recordError($rowNumber, "Course '{$courseCode}' not found.");
                return;
            }

            // Verify lecturer is assigned to this course
            if ($this->lecturer->role === 'lecturer') {
                $assignedIds = $this->lecturer->taughtCourses()->pluck('courses.id')->toArray();
                if (! in_array($course->id, $assignedIds)) {
                    $this->recordError($rowNumber, "You are not assigned to course '{$courseCode}'.");
                    return;
                }
            }

            $courseId = $course->id;
        }

        // ---- Validate question type ----
        $validTypes = ['multiple_choice', 'mcq', 'true_false'];
        if (! in_array($questionType, $validTypes, true)) {
            $questionType = 'multiple_choice';
        }

        $normalizedType = ($questionType === 'mcq') ? 'multiple_choice' : $questionType;

        // ---- Validate difficulty ----
        $validDifficulties = ['easy', 'medium', 'hard', ''];
        if (! in_array($difficulty, $validDifficulties, true)) {
            $difficulty = null;
        }

        // ---- Build options array ----
        $options = [];
        foreach (['A' => $optionA, 'B' => $optionB, 'C' => $optionC, 'D' => $optionD] as $key => $value) {
            if (! empty($value)) {
                $options[] = ['key' => $key, 'value' => $value];
            }
        }

        // ---- Create question ----
        try {
            Question::create([
                'course_id'        => $courseId,
                'created_by'       => $this->lecturer->id,
                'question_text'    => $questionText,
                'question_type'    => $normalizedType,
                'options'          => $options ?: null,
                'correct_answer'   => [$correctAnswerValue],
                'difficulty_level' => $difficulty ?: null,
                'topic'            => ! empty($topic) ? $topic : null,
                'points'           => 1.00,
                'is_active'        => true,
            ]);

            $this->created++;
        } catch (\Throwable $e) {
            $this->recordError($rowNumber, 'Failed to save: ' . $e->getMessage());
        }
    }

    private function recordError(int $row, string $message): void
    {
        $this->errors[] = ['row' => $row, 'message' => $message];
        $this->skipped++;
    }

    /**
     * @return array{created: int, skipped: int, errors: array<int, array{row: int, message: string}>}
     */
    public function getResults(): array
    {
        return [
            'created' => $this->created,
            'skipped' => $this->skipped,
            'errors'  => $this->errors,
        ];
    }
}
