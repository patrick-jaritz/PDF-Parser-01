# DocETL Implementation Guide

## Overview

DocETL is a powerful, LLM-powered document processing pipeline framework that has been integrated into the document processing system. It provides a declarative interface for creating complex document transformation workflows using operators like map, reduce, filter, resolve, and gather.

## What is DocETL?

DocETL (Document ETL) is an agentic framework for building data processing pipelines specifically designed for unstructured documents. It was developed by UC Berkeley's EPIC Data Lab and addresses the challenge of processing complex documents at scale using Large Language Models (LLMs).

### Key Features

1. **Declarative Pipelines**: Define complex workflows using simple operator configurations
2. **LLM-Powered Transforms**: Use AI to extract, transform, and analyze document content
3. **Multiple Operators**: map, reduce, filter, resolve, gather, unnest, split, and join
4. **Execution Tracking**: Monitor pipeline runs with detailed metrics
5. **Reusable Operators**: Create and share operator configurations

## Architecture

### Database Schema

Four main tables support the DocETL system:

#### 1. `docetl_pipelines`
Stores pipeline definitions and configurations.

**Columns:**
- `id` - UUID primary key
- `name` - Pipeline name
- `description` - Pipeline description
- `config` - JSONB configuration with operators
- `status` - enum: draft, active, archived, error
- `user_id` - Creator reference
- `is_active` - Boolean flag
- `created_at` / `updated_at` - Timestamps

#### 2. `docetl_operators`
Stores reusable operator definitions.

**Columns:**
- `id` - UUID primary key
- `name` - Operator name
- `type` - enum: map, reduce, filter, resolve, gather, unnest, split, join
- `config` - JSONB operator configuration
- `description` - Operator description
- `user_id` - Creator reference
- `is_public` - Can be shared across users
- `created_at` - Timestamp

#### 3. `docetl_executions`
Tracks pipeline execution history.

**Columns:**
- `id` - UUID primary key
- `pipeline_id` - Reference to pipeline
- `status` - enum: pending, running, completed, failed, cancelled
- `input_data` - JSONB input documents
- `output_data` - JSONB results
- `metrics` - JSONB execution metrics
- `error_message` - Error details if failed
- `started_at` / `completed_at` - Timestamps
- `user_id` - Executor reference

#### 4. `docetl_datasets`
Stores datasets used by pipelines.

**Columns:**
- `id` - UUID primary key
- `name` - Dataset name
- `type` - Dataset type (documents, json, csv, etc)
- `source` - Source location or query
- `data` - JSONB actual data or metadata
- `pipeline_id` - Optional pipeline association
- `user_id` - Owner reference
- `created_at` - Timestamp

### Security (RLS)

All tables have Row Level Security (RLS) enabled:

- **Pipelines**: Users can only access their own pipelines
- **Operators**: Users can access their own operators + public operators
- **Executions**: Users can only access their own execution history
- **Datasets**: Users can only access their own datasets

## Operators

### 1. Map Operator

Transform each document using an LLM prompt.

**Use Cases:**
- Extract structured data from documents
- Classify documents
- Generate summaries
- Answer questions about content

**Configuration:**
```json
{
  "type": "map",
  "name": "extract_info",
  "config": {
    "prompt": "Extract the following from this document: title, author, date, main topics",
    "model": "gpt-4o-mini",
    "output_schema": {
      "title": "string",
      "author": "string",
      "date": "string",
      "main_topics": "array"
    }
  }
}
```

**Input:** Array of documents
**Output:** Array of documents with additional extracted fields

### 2. Filter Operator

Filter documents based on a condition.

**Use Cases:**
- Remove irrelevant documents
- Select documents meeting criteria
- Filter by date, author, or extracted fields

**Configuration:**
```json
{
  "type": "filter",
  "name": "filter_recent",
  "config": {
    "filter_condition": "new Date(item.date) > new Date('2020-01-01')"
  }
}
```

**Input:** Array of documents
**Output:** Filtered array of documents

### 3. Reduce Operator

Group and aggregate documents.

**Use Cases:**
- Summarize documents by category
- Aggregate statistics
- Combine related documents

**Configuration:**
```json
{
  "type": "reduce",
  "name": "group_by_topic",
  "config": {
    "reduce_key": "topic",
    "fold_prompt": "Summarize all documents about this topic",
    "model": "gpt-4o-mini"
  }
}
```

**Input:** Array of documents
**Output:** Array of grouped/aggregated results

### 4. Resolve Operator

Identify and merge duplicate or similar entities.

**Use Cases:**
- De-duplicate documents
- Entity resolution
- Merge similar records

**Configuration:**
```json
{
  "type": "resolve",
  "name": "deduplicate",
  "config": {
    "resolution_keys": ["title", "author"],
    "comparison_prompt": "Are these documents the same? Choose the best version.",
    "model": "gpt-4o-mini"
  }
}
```

**Input:** Array of documents (potentially with duplicates)
**Output:** Array of resolved/unique documents

### 5. Gather Operator

Collect related items together without LLM processing.

**Use Cases:**
- Group chunks from same document
- Collect related items
- Prepare data for further processing

**Configuration:**
```json
{
  "type": "gather",
  "name": "gather_chunks",
  "config": {
    "gather_key": "document_id",
    "content_key": "text"
  }
}
```

**Input:** Array of items
**Output:** Array of grouped items

### 6. Unnest Operator

Flatten nested arrays into separate items.

**Use Cases:**
- Expand arrays into individual items
- Split multi-valued fields
- Prepare data for processing

**Configuration:**
```json
{
  "type": "unnest",
  "name": "expand_topics",
  "config": {
    "unnest_key": "main_topics"
  }
}
```

**Input:** Array with nested arrays
**Output:** Flattened array

### 7. Split Operator

Split document content into chunks.

**Use Cases:**
- Break large documents into sections
- Create document chunks
- Prepare for context-aware processing

**Configuration:**
```json
{
  "type": "split",
  "name": "chunk_document",
  "config": {
    "content_key": "content"
  }
}
```

**Input:** Array of documents
**Output:** Array of document chunks

### 8. Join Operator

Join two datasets (basic implementation).

**Use Cases:**
- Combine data from multiple sources
- Enrich documents with additional data

**Configuration:**
```json
{
  "type": "join",
  "name": "join_metadata",
  "config": {
    "join_key": "document_id",
    "join_type": "left"
  }
}
```

## Edge Function: execute-docetl-pipeline

The pipeline execution engine runs as a Supabase Edge Function.

**Endpoint:** `execute-docetl-pipeline`

**Input:**
```json
{
  "pipeline_id": "uuid",
  "input_data": [
    {
      "content": "Document text...",
      "metadata": {}
    }
  ],
  "user_id": "uuid"
}
```

**Output:**
```json
{
  "success": true,
  "execution_id": "uuid",
  "results": [
    {
      "title": "Extracted Title",
      "author": "Author Name",
      "...": "..."
    }
  ],
  "metrics": {
    "total_tokens": 1234,
    "total_cost": 0.05,
    "operator_metrics": {
      "extract_info": {
        "duration_ms": 1500,
        "input_count": 1,
        "output_count": 1,
        "status": "completed"
      }
    },
    "total_duration_ms": 2000,
    "operators_executed": 3
  }
}
```

### Execution Flow

1. **Load Pipeline**: Fetch pipeline configuration from database
2. **Create Execution Record**: Track execution with pending status
3. **Execute Operators**: Run each operator in sequence
   - Call LLMs when needed (map, reduce, resolve)
   - Apply transformations (filter, gather, unnest, split)
   - Track metrics per operator
4. **Update Execution**: Save results and metrics
5. **Return Results**: Send processed data to client

## User Interface

### Pipeline Management Page

**Route:** `/doc-etl`

**Features:**
- View all pipelines
- Create new pipelines
- View pipeline configurations
- See recent executions
- Delete pipelines
- Expand/collapse pipeline details

**UI Components:**
- Pipeline cards with status badges
- Execution history with status icons
- Create example pipeline modal
- Configuration viewer (JSON display)

## Example Pipelines

### Example 1: Document Information Extraction

**Purpose:** Extract structured data from documents and filter by date

```json
{
  "name": "Extract and Filter Documents",
  "operators": [
    {
      "type": "map",
      "name": "extract_info",
      "config": {
        "prompt": "Extract: title, author, date, main topics",
        "model": "gpt-4o-mini",
        "output_schema": {
          "title": "string",
          "author": "string",
          "date": "string",
          "main_topics": "array"
        }
      }
    },
    {
      "type": "filter",
      "name": "recent_only",
      "config": {
        "filter_condition": "new Date(item.date) > new Date('2020-01-01')"
      }
    }
  ]
}
```

### Example 2: Topic Summarization

**Purpose:** Group documents by topic and create summaries

```json
{
  "name": "Topic Summarization Pipeline",
  "operators": [
    {
      "type": "map",
      "name": "extract_topics",
      "config": {
        "prompt": "Extract main topic from this document",
        "output_schema": {
          "topic": "string"
        }
      }
    },
    {
      "type": "unnest",
      "name": "expand_topics",
      "config": {
        "unnest_key": "topic"
      }
    },
    {
      "type": "reduce",
      "name": "summarize_by_topic",
      "config": {
        "reduce_key": "topic",
        "fold_prompt": "Write a comprehensive summary of all documents about this topic"
      }
    }
  ]
}
```

### Example 3: Entity Resolution

**Purpose:** Identify and merge duplicate documents

```json
{
  "name": "Deduplication Pipeline",
  "operators": [
    {
      "type": "map",
      "name": "extract_metadata",
      "config": {
        "prompt": "Extract title and author",
        "output_schema": {
          "title": "string",
          "author": "string"
        }
      }
    },
    {
      "type": "resolve",
      "name": "deduplicate",
      "config": {
        "resolution_keys": ["title", "author"],
        "comparison_prompt": "Are these the same document? Choose the best version.",
        "model": "gpt-4o-mini"
      }
    }
  ]
}
```

## Integration with Existing System

### OCR Integration

DocETL pipelines can process OCR output:

1. **Upload Document** → OCR Processing → Extract Text
2. **Text becomes input** to DocETL pipeline
3. **Pipeline processes** extracted text
4. **Structured output** returned

**Example Flow:**
```
PDF → OCR.space → Extracted Text → DocETL Map Operator → Structured JSON
```

### LLM Integration

DocETL reuses the existing `generate-structured-output` Edge Function:

- Map operators call LLM with prompts
- Reduce operators use LLMs for aggregation
- Resolve operators use LLMs for comparison

## Performance Metrics

Each execution tracks:

- **Total Duration**: Overall pipeline execution time
- **Operator Metrics**: Per-operator timing and counts
- **Token Usage**: LLM token consumption
- **Cost**: Estimated API costs
- **Error Tracking**: Failed operators and error messages

## API Usage

### Create Pipeline

```typescript
const { data, error } = await supabase
  .from('docetl_pipelines')
  .insert({
    name: 'My Pipeline',
    description: 'Process documents',
    user_id: userId,
    status: 'draft',
    config: {
      operators: [/* operator configs */]
    }
  });
```

### Execute Pipeline

```typescript
const { data } = await supabase.functions.invoke('execute-docetl-pipeline', {
  body: {
    pipeline_id: pipelineId,
    input_data: documents,
    user_id: userId
  }
});
```

### Get Executions

```typescript
const { data } = await supabase
  .from('docetl_executions')
  .select('*')
  .eq('pipeline_id', pipelineId)
  .order('created_at', { ascending: false });
```

## Best Practices

### 1. Pipeline Design

- **Start Simple**: Begin with basic operators, add complexity gradually
- **Test Incrementally**: Test each operator before adding more
- **Use Clear Names**: Name operators descriptively
- **Add Descriptions**: Document what each operator does

### 2. Prompt Engineering

- **Be Specific**: Clear, specific prompts work best
- **Include Examples**: Show expected output format
- **Use Output Schemas**: Define structure for consistent results
- **Iterate**: Refine prompts based on results

### 3. Performance Optimization

- **Filter Early**: Remove irrelevant documents early in pipeline
- **Batch When Possible**: Group similar operations
- **Choose Right Model**: Use smaller models for simple tasks
- **Cache Results**: Reuse pipeline outputs when possible

### 4. Error Handling

- **Check Operator Results**: Monitor for failures
- **Add Validation**: Verify output quality
- **Handle Errors Gracefully**: Continue processing when possible
- **Log Everything**: Use comprehensive logging

## Future Enhancements

Potential improvements:

1. **Visual Pipeline Builder**: Drag-and-drop interface
2. **Operator Library**: Pre-built operators for common tasks
3. **Pipeline Templates**: Ready-to-use pipelines for common workflows
4. **Real-time Streaming**: Process documents as they arrive
5. **Advanced Joins**: More sophisticated data combination
6. **Conditional Branching**: Dynamic pipeline paths
7. **Parallel Execution**: Run operators concurrently
8. **Cost Optimization**: Automatically optimize for cost/performance

## Troubleshooting

### Pipeline Not Executing

- Check pipeline status is `active`
- Verify user has permissions
- Check Edge Function logs in Supabase
- Ensure input data format is correct

### Operator Failing

- Review operator configuration
- Check prompt clarity
- Verify output schema matches
- Look at execution metrics for details

### Poor Results

- Refine prompts with more specificity
- Add examples to prompts
- Use larger/better models
- Add validation/filter operators

### Slow Execution

- Reduce data volume with filters
- Use smaller models where appropriate
- Check for redundant operators
- Optimize prompts for efficiency

## Files Created/Modified

### Database
- Migration: `supabase/migrations/create_docetl_pipeline_tables.sql`

### Edge Function
- Function: `supabase/functions/execute-docetl-pipeline/index.ts`

### Frontend
- Page: `src/pages/DocETLPipelines.tsx`
- Routes: `src/App.tsx` (added /doc-etl route)
- Navigation: `src/components/Navigation.tsx` (added DocETL link)

### Documentation
- This file: `DOCETL_IMPLEMENTATION.md`

## Conclusion

DocETL provides a powerful, flexible framework for building document processing pipelines. With 8 operators, LLM integration, and a user-friendly interface, it enables sophisticated document analysis workflows without writing complex code.

The declarative approach makes pipelines easy to understand, modify, and share. Integration with the existing OCR and LLM infrastructure means pipelines can leverage the full document processing stack.

Start with the example pipelines, experiment with operators, and build custom workflows tailored to your document processing needs.
