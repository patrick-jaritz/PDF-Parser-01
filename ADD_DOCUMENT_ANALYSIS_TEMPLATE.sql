-- ============================================================================
-- ADD DOCUMENT ANALYSIS TEMPLATE
-- ============================================================================
-- Copy and paste this into your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ziypdqsiajnjyygkjtvc/sql
-- ============================================================================

INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES (
  'Document Analysis',
  'Advanced document analysis with core ideas, recommendations, actionable steps, and confidence scoring',
  '{
    "type": "object",
    "properties": {
      "metadata": {
        "type": "object",
        "properties": {
          "document_title": {"type": "string"},
          "author": {"type": "string"},
          "source_type": {"type": "string"},
          "date": {"type": "string"},
          "parsed_by": {"type": "string"},
          "analysis_level": {"type": "string", "enum": ["overview", "detailed", "critical"]},
          "tone": {"type": "string", "enum": ["neutral", "persuasive", "reflective"]},
          "confidence_score": {"type": "number"}
        }
      },
      "content_analysis": {
        "type": "object",
        "properties": {
          "core_idea": {
            "type": "object",
            "properties": {
              "short_summary": {"type": "string"},
              "detailed_summary": {"type": "string"},
              "key_points": {
                "type": "array",
                "items": {"type": "string"}
              },
              "supporting_evidence": {
                "type": "array",
                "items": {"type": "string"}
              },
              "confidence": {"type": "number"}
            }
          },
          "personal_recommendation": {
            "type": "object",
            "properties": {
              "context": {"type": "string"},
              "suggested_action": {"type": "string"},
              "rationale": {"type": "string"},
              "expected_outcome": {"type": "string"},
              "confidence": {"type": "number"}
            }
          },
          "actionable_next_steps": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "step_id": {"type": "number"},
                "description": {"type": "string"},
                "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                "deadline": {"type": "string"},
                "dependencies": {
                  "type": "array",
                  "items": {"type": "string"}
                },
                "required_resources": {
                  "type": "array",
                  "items": {"type": "string"}
                },
                "impact_estimate": {"type": "string"},
                "success_metric": {"type": "string"},
                "confidence": {"type": "number"}
              }
            }
          }
        }
      },
      "notes": {
        "type": "object",
        "properties": {
          "open_questions": {
            "type": "array",
            "items": {"type": "string"}
          },
          "related_topics": {
            "type": "array",
            "items": {"type": "string"}
          },
          "references": {
            "type": "array",
            "items": {"type": "string"}
          }
        }
      }
    }
  }'::jsonb,
  true,
  NULL
);

-- ✅ Done! Document Analysis template is now available.

