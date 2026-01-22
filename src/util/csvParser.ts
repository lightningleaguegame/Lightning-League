/**
 * Improved CSV Parser for Question Import
 * Handles quoted fields, commas in text, and various CSV formats
 */

export interface CSVQuestionRow {
  subjectArea: string;
  questionText: string;
  correctAnswer: string;
  distractors: string[];
  level?: 'EL' | 'MS' | 'HS';
  isPublic?: boolean;
  importYear?: number;
  validationStatus?: 'pending' | 'approved' | 'flagged' | 'rejected';
  subgroup?: string;
  difficulty?: number;
  questionId?: number;
}

export interface CSVParseResult {
  questions: CSVQuestionRow[];
  errors: Array<{ row: number; error: string }>;
}

/**
 * Parse a CSV line handling quoted fields
 * Supports fields like: "text, with commas", "another field"
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator (not inside quotes)
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add the last field
  result.push(current.trim());
  return result;
}

/**
 * Normalize subject area code
 */
function normalizeSubjectArea(subject: string): string {
  const normalized = subject.trim().toUpperCase();
  const subjectMap: Record<string, string> = {
    'SS': 'SS',
    'SOCIAL STUDIES': 'SS',
    'SOCIAL': 'SS',
    'SC': 'SC',
    'SCIENCE': 'SC',
    'LA': 'LA',
    'LANGUAGE ARTS': 'LA',
    'ENGLISH': 'LA',
    'MA': 'MA',
    'MATH': 'MA',
    'MATHEMATICS': 'MA',
    'AH': 'AH',
    'ARTS & HUMANITIES': 'AH',
    'ARTS': 'AH',
    'HUMANITIES': 'AH',
    'GK': 'GK',
    'GENERAL KNOWLEDGE': 'GK',
  };

  return subjectMap[normalized] || 'GK';
}

/**
 * Normalize level
 */
function normalizeLevel(level: string): 'EL' | 'MS' | 'HS' {
  const normalized = level.trim().toUpperCase();
  if (normalized === 'MS' || normalized === 'MIDDLE SCHOOL' || normalized === 'MIDDLE') {
    return 'MS';
  }
  if (normalized === 'HS' || normalized === 'HIGH SCHOOL' || normalized === 'HIGH') {
    return 'HS';
  }
  return 'EL'; // Default to Elementary
}

/**
 * Parse CSV file content into question objects
 * 
 * Expected CSV format (matching the provided image):
 * - Column 0: Question ID (integer, can be used for tracking)
 * - Column 1: Category (MA, SS, SC, LA, AH - maps to subjectArea)
 * - Column 2: Subgroup (text description of topic/subcategory)
 * - Column 3: Difficulty (integer, typically 1-3)
 * - Column 4: Level (EL, MS, HS)
 * - Column 5: Question Text
 * - Column 6: Answer (correct answer)
 * - Column 7: Distractor 1
 * - Column 8: Distractor 2
 * - Column 9: Distractor 3
 * 
 * Header row is automatically detected and skipped
 */
export function parseCSVQuestions(csvContent: string): CSVParseResult {
  const questions: CSVQuestionRow[] = [];
  const errors: Array<{ row: number; error: string }> = [];

  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return {
      questions: [],
      errors: [{ row: 0, error: 'CSV file must have at least a header and one data row' }],
    };
  }

  // Detect header row (usually first row, but check for common header keywords)
  let startRow = 0;
  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes('question') ||
    firstLine.includes('category') ||
    firstLine.includes('subgroup') ||
    firstLine.includes('difficulty') ||
    firstLine.includes('level') ||
    firstLine.includes('answer') ||
    firstLine.includes('distractor')
  ) {
    startRow = 1; // Skip header
  }

  // Parse data rows
  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    try {
      const values = parseCSVLine(line);

      // Minimum required: 10 columns (Question ID, Category, Subgroup, Difficulty, Level, Question, Answer, 3 Distractors)
      if (values.length < 10) {
        errors.push({
          row: i + 1,
          error: `Row has only ${values.length} columns, expected 10 columns (Question ID, Category, Subgroup, Difficulty, Level, Question Text, Answer, Distractor 1, Distractor 2, Distractor 3)`,
        });
        continue;
      }

      // Parse each column according to the format
      const questionId = values[0] ? parseInt(values[0].trim()) : undefined;
      const category = normalizeSubjectArea(values[1] || 'GK');
      const subgroup = (values[2] || '').trim();
      const difficulty = values[3] ? parseInt(values[3].trim()) : undefined;
      const level = normalizeLevel(values[4] || 'EL');
      const questionText = (values[5] || '').trim();
      const correctAnswer = (values[6] || '').trim();
      const distractors: string[] = [];

      // Collect distractors (columns 7-9)
      for (let j = 7; j < Math.min(10, values.length); j++) {
        const distractor = (values[j] || '').trim();
        if (distractor) {
          distractors.push(distractor);
        }
      }

      // Validation
      if (!questionText) {
        errors.push({ row: i + 1, error: 'Question text is required (Column 6)' });
        continue;
      }

      if (!correctAnswer) {
        errors.push({ row: i + 1, error: 'Correct answer is required (Column 7)' });
        continue;
      }

      if (distractors.length === 0) {
        errors.push({ row: i + 1, error: 'At least one distractor is required (Columns 8-10)' });
        continue;
      }

      // Validate difficulty if provided
      if (difficulty !== undefined && (isNaN(difficulty) || difficulty < 1 || difficulty > 5)) {
        errors.push({ row: i + 1, error: `Invalid difficulty value: ${values[3]}. Expected 1-5.` });
        // Continue anyway, just don't store difficulty
      }

      questions.push({
        subjectArea: category,
        questionText,
        correctAnswer,
        distractors,
        level,
        isPublic: true, // Default to public for imported questions
        importYear: new Date().getFullYear(),
        validationStatus: 'pending', // Default to pending for imported questions
        subgroup: subgroup || undefined,
        difficulty: difficulty && !isNaN(difficulty) && difficulty >= 1 && difficulty <= 5 ? difficulty : undefined,
        questionId: questionId && !isNaN(questionId) ? questionId : undefined,
      });
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown parsing error',
      });
    }
  }

  return { questions, errors };
}









