<?php

namespace App\Services\ExamSession;

use App\Models\ExamSession;
use App\Models\SessionSnapshot;
use App\Models\StudentAnswer;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecoveryService
{
    /**
     * Restore missing answers from the latest session snapshot.
     *
     * This is called when a student resumes an interrupted session (status = 'in_progress'
     * or 'interrupted'). If the live `student_answers` table is missing rows that existed
     * in the snapshot (e.g., due to a server crash mid-save), this method re-creates them.
     *
     * @return int Number of answers restored from snapshot (0 = nothing was missing)
     */
    public function restoreFromSnapshot(ExamSession $session): int
    {
        $snapshot = $this->getLatestSnapshot($session);

        if (! $snapshot) {
            return 0;
        }

        $snapshotData = $snapshot->snapshot_data;
        $savedAnswers = $snapshotData['answers'] ?? [];

        if (empty($savedAnswers)) {
            return 0;
        }

        // Fetch the question IDs that already have a final answer in the live table
        $existingQuestionIds = StudentAnswer::where('session_id', $session->id)
            ->where('is_final', true)
            ->pluck('question_id')
            ->toArray();

        $restored = 0;

        DB::transaction(function () use ($session, $savedAnswers, $existingQuestionIds, &$restored) {
            foreach ($savedAnswers as $savedAnswer) {
                $questionId = $savedAnswer['question_id'] ?? null;

                if (! $questionId) {
                    continue;
                }

                // Skip questions that already have a live final answer
                if (in_array($questionId, $existingQuestionIds)) {
                    continue;
                }

                // Re-create the answer from snapshot data
                try {
                    StudentAnswer::create([
                        'session_id'        => $session->id,
                        'question_id'       => $questionId,
                        'answer_text'       => $savedAnswer['answer_text'] ?? null,
                        'selected_option'   => $savedAnswer['selected_option'] ?? null,
                        'is_flagged'        => $savedAnswer['is_flagged'] ?? false,
                        'version'           => $savedAnswer['version'] ?? 1,
                        'is_final'          => true,
                        'first_answered_at' => now(),
                        'last_updated_at'   => now(),
                    ]);

                    $restored++;
                } catch (\Exception $e) {
                    // Log but don't fail — best-effort recovery
                    Log::warning("CBT Recovery: failed to restore answer for session {$session->id}, question {$questionId}: {$e->getMessage()}");
                }
            }

            // Sync the session's questions_answered counter after restore
            if ($restored > 0) {
                $answeredCount = StudentAnswer::where('session_id', $session->id)
                    ->where('is_final', true)
                    ->distinct('question_id')
                    ->count('question_id');

                $session->update(['questions_answered' => $answeredCount]);
            }
        });

        return $restored;
    }

    /**
     * Get a summary of the latest snapshot for this session.
     *
     * Used to show the student a "your session was recovered" message with
     * the number of answers saved and the time of the last snapshot.
     */
    public function getRecoverySummary(ExamSession $session): array
    {
        $snapshot = $this->getLatestSnapshot($session);

        if (! $snapshot) {
            return [
                'has_snapshot'     => false,
                'snapshot_time'    => null,
                'answers_in_snapshot' => 0,
                'time_remaining_at_snapshot' => null,
            ];
        }

        $data = $snapshot->snapshot_data;

        return [
            'has_snapshot'                => true,
            'snapshot_time'               => $snapshot->created_at?->toIso8601String(),
            'answers_in_snapshot'         => count($data['answers'] ?? []),
            'time_remaining_at_snapshot'  => $data['time_remaining'] ?? null,
        ];
    }

    /**
     * Find the most recent snapshot for a session.
     */
    private function getLatestSnapshot(ExamSession $session): ?SessionSnapshot
    {
        return SessionSnapshot::where('session_id', $session->id)
            ->latest('created_at')
            ->first();
    }
}
