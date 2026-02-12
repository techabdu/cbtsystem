<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamQuestion extends Model
{
    use HasFactory;

    /* ------------------------------------------------------------------ */
    /*  Timestamps                                                        */
    /* ------------------------------------------------------------------ */

    /** Only created_at, no updated_at. */
    public $timestamps = false;

    /* ------------------------------------------------------------------ */
    /*  Mass Assignment                                                   */
    /* ------------------------------------------------------------------ */

    /** @var list<string> */
    protected $fillable = [
        'exam_id',
        'question_id',
        'question_order',
        'points',
        'is_required',
        'created_at',
    ];

    /* ------------------------------------------------------------------ */
    /*  Casts                                                             */
    /* ------------------------------------------------------------------ */

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'points'      => 'decimal:2',
            'is_required' => 'boolean',
            'created_at'  => 'datetime',
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Relationships                                                     */
    /* ------------------------------------------------------------------ */

    /** The exam this question link belongs to. */
    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    /** The question linked to the exam. */
    public function question(): BelongsTo
    {
        return $this->belongsTo(Question::class);
    }
}
