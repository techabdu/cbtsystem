<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CourseSeeder extends Seeder
{
    /**
     * Seed sample courses for each department.
     * ~3 courses per department across 34 departments = ~102 courses.
     * Course code format: {DEPT_CODE} {LEVEL}{SERIAL} e.g. "MTH 111"
     */
    public function run(): void
    {
        $depts  = DB::table('departments')->pluck('id', 'code');
        $levels = DB::table('levels')->pluck('id', 'code');
        $now    = now();

        // Define a helper to build a course row
        $c = function (string $deptCode, string $levelCode, string $courseNum, string $name, string $desc, int $credits = 2) use ($depts, $levels, $now) {
            return [
                'uuid'          => Str::uuid()->toString(),
                'department_id' => $depts[$deptCode] ?? null,
                'level_id'      => $levels[$levelCode] ?? null,
                'code'          => "{$deptCode} {$courseNum}",
                'title'         => $name,
                'description'   => $desc,
                'semester'      => ((int)$courseNum % 2 === 1) ? 'first' : 'second',
                'academic_year' => '2025/2026',
                'credit_hours'  => $credits,
                'is_active'     => true,
                'created_at'    => $now,
                'updated_at'    => $now,
            ];
        };

        $courses = [
            // ── Mathematics Education (MTH) ────────────────────────────────
            $c('MTH', '100L', '111', 'Elementary Mathematics I',       'Sets, number theory, basic algebra, trigonometry.'),
            $c('MTH', '100L', '112', 'Elementary Mathematics II',      'Calculus, coordinate geometry, statistics.'),
            $c('MTH', '200L', '221', 'Linear Algebra',                 'Matrices, vectors, linear transformations, eigenvalues.'),
            $c('MTH', '300L', '331', 'Abstract Algebra',               'Groups, rings, fields, and homomorphisms.', 3),

            // ── Physics Education (PHY) ────────────────────────────────────
            $c('PHY', '100L', '111', 'Mechanics & Properties of Matter', 'Kinematics, dynamics, Newton\'s laws, elasticity.'),
            $c('PHY', '100L', '112', 'Waves, Sound & Light',            'Wave motion, optics, geometrical and physical optics.'),
            $c('PHY', '200L', '221', 'Electromagnetism',                'Electric fields, magnetic fields, Maxwell\'s equations.'),
            $c('PHY', '300L', '331', 'Quantum Physics',                 'Quantum theory, atomic models, photoelectric effect.', 3),

            // ── Chemistry Education (CHM) ──────────────────────────────────
            $c('CHM', '100L', '111', 'Introductory Chemistry I',       'Atomic structure, bonding, states of matter, reactions.'),
            $c('CHM', '100L', '112', 'Introductory Chemistry II',      'Organic chemistry fundamentals, functional groups.'),
            $c('CHM', '200L', '221', 'Physical Chemistry',             'Thermodynamics, kinetics, equilibrium, electrochemistry.'),
            $c('CHM', '300L', '331', 'Analytical Chemistry',           'Volumetric, gravimetric, and instrumental analysis.', 3),

            // ── Biology Education (BIO) ────────────────────────────────────
            $c('BIO', '100L', '111', 'General Biology I',              'Cell biology, plants, animals, ecology fundamentals.'),
            $c('BIO', '100L', '112', 'General Biology II',             'Genetics, evolution, classification, microorganisms.'),
            $c('BIO', '200L', '221', 'Microbiology',                   'Bacteria, viruses, fungi, diseases and immunity.'),
            $c('BIO', '300L', '331', 'Genetics & Molecular Biology',   'DNA, gene expression, heredity, mutations.', 3),

            // ── Integrated Science Education (INT) ────────────────────────
            $c('INT', '100L', '111', 'Integrated Science I',           'Scientific method, matter, energy, the universe.'),
            $c('INT', '100L', '112', 'Integrated Science II',          'Living systems, technology and society.'),
            $c('INT', '200L', '221', 'Environmental Science',          'Ecosystems, pollution, conservation, climate change.'),

            // ── Agricultural Science Education (AGR) ──────────────────────
            $c('AGR', '100L', '111', 'Principles of Agriculture',      'Crop production, soil science, farm management.'),
            $c('AGR', '100L', '112', 'Agricultural Biology',           'Plant physiology, animal husbandry, genetics.'),
            $c('AGR', '200L', '221', 'Agricultural Economics',         'Farm accounts, cost-benefit analysis, marketing.'),

            // ── Computer Science Education (CSC) ──────────────────────────
            $c('CSC', '100L', '111', 'Introduction to Computing',      'Hardware, software, programming basics, algorithms.'),
            $c('CSC', '100L', '112', 'Computer Applications',          'Word processing, spreadsheets, databases, internet.'),
            $c('CSC', '200L', '221', 'Programming Fundamentals',       'Structured programming with Python/C, logic, loops.'),
            $c('CSC', '300L', '331', 'Database Systems',               'Relational databases, SQL, normalisation, transactions.', 3),

            // ── Physical & Health Education (PHE) ─────────────────────────
            $c('PHE', '100L', '111', 'Foundations of Physical Education', 'History, philosophy, health and fitness concepts.'),
            $c('PHE', '100L', '112', 'Sports Theory & Practice',       'Athletics, team sports, coaching principles.'),
            $c('PHE', '200L', '221', 'Human Anatomy & Physiology',     'Musculoskeletal, cardiovascular, respiratory systems.'),

            // ── Economics Education (ECO) ──────────────────────────────────
            $c('ECO', '100L', '111', 'Introductory Economics I',       'Microeconomics: demand, supply, market structures.'),
            $c('ECO', '100L', '112', 'Introductory Economics II',      'Macroeconomics: GDP, inflation, fiscal policy.'),
            $c('ECO', '200L', '221', 'Public Finance',                 'Government expenditure, taxation, budget deficits.'),

            // ── Geography Education (GEO) ──────────────────────────────────
            $c('GEO', '100L', '111', 'Physical Geography I',           'Geomorphology, atmosphere, weather, climate.'),
            $c('GEO', '100L', '112', 'Human Geography',                'Population, settlement, economic activities, regions.'),
            $c('GEO', '200L', '221', 'Map Reading & Cartography',      'Topographic maps, scale, projection, GIS basics.'),

            // ── History Education (HIS) ────────────────────────────────────
            $c('HIS', '100L', '111', 'Nigerian History to 1800',       'Pre-colonial states, empires, societies and trade.'),
            $c('HIS', '100L', '112', 'African History to 1800',        'Ancient Africa, trans-Saharan and Atlantic trade.'),
            $c('HIS', '200L', '221', 'Nigerian History 1800–2000',     'Colonialism, nationalism, independence, civil war.'),

            // ── Christian Religious Studies (CRS) ─────────────────────────
            $c('CRS', '100L', '111', 'Introduction to the Bible',      'Old Testament: origins, history, major books.'),
            $c('CRS', '100L', '112', 'New Testament Studies',          'Gospels, Acts, Epistles, eschatology.'),
            $c('CRS', '200L', '221', 'Christian Ethics',               'Moral theology, social justice, Christian living.'),

            // ── Islamic Studies Education (ISL) ───────────────────────────
            $c('ISL', '100L', '111', 'Introduction to Islam',          'Quran, Hadith, pillars of Islam, Islamic history.'),
            $c('ISL', '100L', '112', 'Islamic Jurisprudence I',        'Sources of Sharia, ijtihad, fiqh principles.'),
            $c('ISL', '200L', '221', 'Arabic for Islamic Studies',     'Quranic Arabic grammar, morphology, vocabulary.'),

            // ── Social Studies Education (SS) ─────────────────────────────
            $c('SS', '100L', '111', 'Foundations of Social Studies',   'Sociology, civic education, cultural values.'),
            $c('SS', '100L', '112', 'The Nigerian Society',            'Ethnicity, religion, governance, national development.'),
            $c('SS', '200L', '221', 'Population Studies',              'Demography, census, population policy, urbanisation.'),

            // ── Political Science Education (POL) ─────────────────────────
            $c('POL', '100L', '111', 'Introduction to Political Science', 'State, government, sovereignty, constitutions.'),
            $c('POL', '100L', '112', 'Nigerian Government & Politics', 'Nigerian constitution, federalism, elections.'),

            // ── English Language Education (ENG) ──────────────────────────
            $c('ENG', '100L', '111', 'Introduction to English Linguistics', 'Phonetics, morphology, syntax, semantics.'),
            $c('ENG', '100L', '112', 'Oral English',                   'Pronunciation, intonation, listening skills.'),
            $c('ENG', '200L', '221', 'Introduction to Literature',     'Poetry, prose, drama — African and world literature.'),
            $c('ENG', '300L', '331', 'Advanced Grammar & Composition', 'Stylistics, essay writing, academic discourse.', 3),

            // ── French Language Education (FRE) ───────────────────────────
            $c('FRE', '100L', '111', 'French Language I',              'Basic vocabulary, greetings, grammar, pronunciation.'),
            $c('FRE', '100L', '112', 'French Language II',             'Present and past tenses, conversations, reading.'),
            $c('FRE', '200L', '221', 'French Literature',              'Francophone African literature, poetry, comprehension.'),

            // ── Hausa Language Education (HAU) ────────────────────────────
            $c('HAU', '100L', '111', 'Hausa Phonology & Morphology',   'Sounds, tones, word formation, verb patterns.'),
            $c('HAU', '100L', '112', 'Hausa Composition & Prose',      'Writing skills, narrative, short stories.'),
            $c('HAU', '200L', '221', 'Hausa Literature',               'Classical and modern Hausa poetry and prose.'),

            // ── Arabic Language Education (ARA) ───────────────────────────
            $c('ARA', '100L', '111', 'Arabic Grammar I (Nahw)',        'Arabic alphabet, vowels, nouns, basic sentence structure.'),
            $c('ARA', '100L', '112', 'Arabic Grammar II (Sarf)',       'Verb conjugation, patterns, morphological analysis.'),
            $c('ARA', '200L', '221', 'Arabic Prose & Composition',     'Reading comprehension, writing, modern standard Arabic.'),

            // ── Igbo Language Education (IGB) ─────────────────────────────
            $c('IGB', '100L', '111', 'Igbo Phonology & Morphology',   'Igbo sounds, tones, word formation.'),
            $c('IGB', '100L', '112', 'Igbo Prose & Composition',      'Reading, writing, grammar exercises.'),
            $c('IGB', '200L', '221', 'Igbo Literature',                'Oral tradition, proverbs, modern Igbo writing.'),

            // ── Yoruba Language Education (YOR) ───────────────────────────
            $c('YOR', '100L', '111', 'Yoruba Phonology & Morphology',  'Tones, vowels, verb/noun formation.'),
            $c('YOR', '100L', '112', 'Yoruba Prose & Composition',     'Reading, writing, grammar.'),

            // ── Early Childhood Care & Education (ECCE) ───────────────────
            $c('ECCE', '100L', '111', 'Child Development I',           'Stages of development, learning theories.'),
            $c('ECCE', '100L', '112', 'Play Theory & Practice',        'Role of play, classroom management for young learners.'),
            $c('ECCE', '200L', '221', 'Early Childhood Curriculum',    'Curriculum design for age 0–8, assessment methods.'),

            // ── Primary Education Studies (PES) ───────────────────────────
            $c('PES', '100L', '111', 'Foundations of Primary Education', 'Primary school system, teaching methods, assessment.'),
            $c('PES', '100L', '112', 'Literacy & Numeracy Teaching',   'Reading, writing, number work for primary level.'),
            $c('PES', '200L', '221', 'Primary Curriculum Studies',     'Subject-specific pedagogy across the primary curriculum.'),

            // ── General Education (GEDU) ───────────────────────────────────
            $c('GEDU', '100L', '111', 'Introduction to Education',     'Philosophy of education, educational systems.'),
            $c('GEDU', '100L', '112', 'Educational Psychology',        'Learning theories, motivation, individual differences.'),

            // ── Curriculum & Instruction (CINS) ───────────────────────────
            $c('CINS', '100L', '111', 'Curriculum Theory',             'Definition, types, models, evaluation of curriculum.'),
            $c('CINS', '200L', '221', 'Instructional Design',          'Lesson planning, objectives, materials, assessment.'),

            // ── Educational Psychology (EDPS) ─────────────────────────────
            $c('EDPS', '100L', '111', 'Principles of Psychology',      'Perception, learning, memory, motivation.'),
            $c('EDPS', '200L', '221', 'Counselling & Guidance',        'Theories of counselling, career guidance.'),

            // ── Business Education (BUS) ───────────────────────────────────
            $c('BUS', '100L', '111', 'Principles of Business',         'Business concepts, forms of business ownership.'),
            $c('BUS', '100L', '112', 'Typewriting & Office Practice',  'Keyboard skills, office procedures, filing.'),
            $c('BUS', '200L', '221', 'Accounting Fundamentals',        'Transactions, ledger, trial balance, final accounts.'),
            $c('BUS', '300L', '331', 'Business Communication',         'Report writing, correspondence, presentations.', 3),

            // ── Fine & Applied Arts Education (FINE) ──────────────────────
            $c('FINE', '100L', '111', 'Introduction to Fine Arts',     'Drawing, colour theory, elements and principles of art.'),
            $c('FINE', '100L', '112', 'Art History',                   'African and world art history, artistic movements.'),
            $c('FINE', '200L', '221', 'Sculpture & Three-Dimensional Design', 'Clay, wood, metal sculpture techniques.'),

            // ── Home Economics Education (HOME) ───────────────────────────
            $c('HOME', '100L', '111', 'Food Science & Nutrition',      'Nutrients, food groups, nutrition and health.'),
            $c('HOME', '100L', '112', 'Clothing & Textiles',           'Fibre types, fabric construction, garment making.'),
            $c('HOME', '200L', '221', 'Home Management',               'Resource management, family economics, housing.'),

            // ── Technical Education (TECH) ─────────────────────────────────
            $c('TECH', '100L', '111', 'Technical Drawing',             'Engineering drawing, projections, CAD basics.'),
            $c('TECH', '100L', '112', 'Workshop Technology',           'Tools, materials, basic fabrication skills.'),
            $c('TECH', '200L', '221', 'Electrical Technology',         'Circuits, AC/DC, electrical installations basics.'),

            // ── Agricultural Technical Education (AGRT) ───────────────────
            $c('AGRT', '100L', '111', 'Principles of Agricultural Technology', 'Farm machinery, irrigation, post-harvest tech.'),
            $c('AGRT', '200L', '221', 'Agricultural Mechanisation',    'Tractor operations, implement calibration.'),

            // ── Basic & Special Education (BCE) ───────────────────────────
            $c('BCE', '100L', '111', 'Foundations of Special Education', 'Disabilities, inclusion, adaptive learning.'),
            $c('BCE', '200L', '221', 'Special Needs Assessment',       'Diagnostic tools, IEP writing, support strategies.'),

            // ── Early Childhood Care Practice (ECCP) ──────────────────────
            $c('ECCP', '100L', '111', 'Practicum I (Observation)',     'Classroom observation in early childhood settings.'),
            $c('ECCP', '200L', '221', 'Practicum II (Teaching)',       'Supervised teaching practice in crèche and nursery.'),

            // ── Primary School Teaching Practice (PRIM) ───────────────────
            $c('PRIM', '100L', '111', 'Teaching Practice Orientation', 'School placement briefing, professionalism, records.'),
            $c('PRIM', '200L', '221', 'Teaching Practice Supervision', 'Supervised primary school classroom teaching.'),
        ];

        // Filter out any that have null department (code not found)
        $courses = array_filter($courses, fn($c) => ! is_null($c['department_id']));

        foreach (array_chunk(array_values($courses), 50) as $chunk) {
            DB::table('courses')->insert($chunk);
        }
    }
}
