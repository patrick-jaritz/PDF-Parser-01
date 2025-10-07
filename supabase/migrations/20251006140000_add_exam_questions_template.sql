/*
  # Add Exam Questions Template

  1. New Template
    - Adds a public template for extracting exam questions, answers, topics, tags, and difficulty
    - Includes structured schema for:
      - Question text
      - Multiple answer options
      - Correct answer
      - Topic/subject area
      - Tags for categorization
      - Difficulty level
      - Points value
      - Explanation (if available)

  2. Purpose
    - Enables users to easily extract structured exam question data from documents
    - Perfect for creating question banks and study materials
    - Supports various question types (multiple choice, true/false, etc.)
*/

-- Insert exam questions template
INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES
  (
    'Exam Questions',
    'Extract exam questions with answers, topics, tags, and difficulty levels',
    '{
      "type": "object",
      "properties": {
        "exam_title": {"type": "string"},
        "subject": {"type": "string"},
        "total_questions": {"type": "number"},
        "questions": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "question_number": {"type": "number"},
              "question": {"type": "string"},
              "answer_1": {"type": "string"},
              "answer_2": {"type": "string"},
              "answer_3": {"type": "string"},
              "answer_4": {"type": "string"},
              "answer_5": {"type": "string"},
              "correct_answer": {"type": "string"},
              "topic": {"type": "string"},
              "tags": {
                "type": "array",
                "items": {"type": "string"}
              },
              "difficulty": {"type": "string"},
              "points": {"type": "number"},
              "explanation": {"type": "string"}
            }
          }
        }
      }
    }'::jsonb,
    true,
    NULL
  )
ON CONFLICT DO NOTHING;
