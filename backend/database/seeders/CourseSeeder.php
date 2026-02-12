<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CourseSeeder extends Seeder
{
    /**
     * Seed sample courses.
     */
    public function run(): void
    {
        // Get department IDs
        $departments = DB::table('departments')->pluck('id', 'code')->toArray();

        $courses = [
            // Computer Science courses
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['CS'],
                'code' => 'CS101',
                'title' => 'Introduction to Computer Science',
                'description' => 'Fundamentals of computer science including algorithms, data structures, and problem solving.',
                'credit_hours' => 3,
                'semester' => 'Fall 2025',
                'academic_year' => '2025/2026',
                'level' => '100L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['CS'],
                'code' => 'CS201',
                'title' => 'Data Structures and Algorithms',
                'description' => 'Advanced study of data structures, sorting, searching, and algorithm analysis.',
                'credit_hours' => 4,
                'semester' => 'Fall 2025',
                'academic_year' => '2025/2026',
                'level' => '200L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['CS'],
                'code' => 'CS301',
                'title' => 'Database Management Systems',
                'description' => 'Relational databases, SQL, normalization, indexing, and transaction management.',
                'credit_hours' => 3,
                'semester' => 'Spring 2026',
                'academic_year' => '2025/2026',
                'level' => '300L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Mathematics courses
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['MTH'],
                'code' => 'MTH101',
                'title' => 'Calculus I',
                'description' => 'Limits, derivatives, integrals, and the fundamental theorem of calculus.',
                'credit_hours' => 4,
                'semester' => 'Fall 2025',
                'academic_year' => '2025/2026',
                'level' => '100L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['MTH'],
                'code' => 'MTH202',
                'title' => 'Linear Algebra',
                'description' => 'Vector spaces, matrices, linear transformations, eigenvalues, and eigenvectors.',
                'credit_hours' => 3,
                'semester' => 'Spring 2026',
                'academic_year' => '2025/2026',
                'level' => '200L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Physics course
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['PHY'],
                'code' => 'PHY101',
                'title' => 'General Physics I',
                'description' => 'Mechanics, waves, thermodynamics, and introductory electromagnetism.',
                'credit_hours' => 4,
                'semester' => 'Fall 2025',
                'academic_year' => '2025/2026',
                'level' => '100L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Engineering course
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['ENG'],
                'code' => 'ENG201',
                'title' => 'Engineering Mathematics',
                'description' => 'Applied mathematical methods for engineering: ODEs, Laplace transforms, Fourier analysis.',
                'credit_hours' => 3,
                'semester' => 'Fall 2025',
                'academic_year' => '2025/2026',
                'level' => '200L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            // Biology course
            [
                'uuid' => Str::uuid()->toString(),
                'department_id' => $departments['BIO'],
                'code' => 'BIO101',
                'title' => 'General Biology',
                'description' => 'Cell biology, genetics, evolution, and ecology.',
                'credit_hours' => 3,
                'semester' => 'Fall 2025',
                'academic_year' => '2025/2026',
                'level' => '100L',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('courses')->insert($courses);
    }
}
