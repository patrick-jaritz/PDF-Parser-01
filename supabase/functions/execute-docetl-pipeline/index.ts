import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { EdgeLogger, generateRequestId } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PipelineOperator {
  id: string;
  name: string;
  type: 'map' | 'reduce' | 'filter' | 'resolve' | 'gather' | 'unnest' | 'split' | 'join';
  config: {
    prompt?: string;
    model?: string;
    output_schema?: Record<string, any>;
    reduce_key?: string;
    fold_prompt?: string;
    filter_condition?: string;
    resolution_keys?: string[];
    comparison_prompt?: string;
    gather_key?: string;
    content_key?: string;
    unnest_key?: string;
    join_key?: string;
    join_type?: 'inner' | 'left' | 'right';
  };
}

interface Pipeline {
  id: string;
  name: string;
  description?: string;
  config: {
    operators: PipelineOperator[];
    llm_provider?: 'openai' | 'anthropic' | 'mistral-large';
    datasets?: Array<{
      name: string;
      type: string;
      source: string;
    }>;
  };
}

interface ExecutionContext {
  data: any[];
  metadata: {
    total_tokens?: number;
    total_cost?: number;
    operator_metrics: Record<string, any>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  const requestId = generateRequestId();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const logger = new EdgeLogger(supabase, requestId);

  try {
    const { pipeline_id, input_data, user_id } = await req.json();

    logger.info('system', 'DocETL pipeline execution started', {
      pipelineId: pipeline_id,
      userId: user_id,
      inputCount: Array.isArray(input_data) ? input_data.length : 1
    });

    const { data: pipeline, error: pipelineError } = await supabase
      .from('docetl_pipelines')
      .select('*')
      .eq('id', pipeline_id)
      .maybeSingle();

    if (pipelineError || !pipeline) {
      throw new Error(`Pipeline not found: ${pipelineError?.message || 'Unknown error'}`);
    }

    const executionId = crypto.randomUUID();
    const startTime = new Date();

    await supabase.from('docetl_executions').insert({
      id: executionId,
      pipeline_id,
      user_id,
      status: 'running',
      input_data,
      started_at: startTime.toISOString()
    });

    const context: ExecutionContext = {
      data: Array.isArray(input_data) ? input_data : [input_data],
      metadata: {
        total_tokens: 0,
        total_cost: 0,
        operator_metrics: {}
      }
    };

    const operators = pipeline.config?.operators || [];

    for (const operator of operators) {
      logger.info('system', `Executing operator: ${operator.name}`, {
        type: operator.type,
        operatorId: operator.id
      });

      const operatorStartTime = Date.now();

      try {
        context.data = await executeOperator(operator, context.data, supabase, logger);

        const operatorDuration = Date.now() - operatorStartTime;
        context.metadata.operator_metrics[operator.name] = {
          duration_ms: operatorDuration,
          input_count: Array.isArray(input_data) ? input_data.length : 1,
          output_count: context.data.length,
          status: 'completed'
        };

        logger.info('system', `Operator completed: ${operator.name}`, {
          duration_ms: operatorDuration,
          output_count: context.data.length
        });
      } catch (operatorError) {
        logger.error('system', `Operator failed: ${operator.name}`, operatorError, {
          operatorId: operator.id,
          operatorType: operator.type
        });

        context.metadata.operator_metrics[operator.name] = {
          status: 'failed',
          error: operatorError instanceof Error ? operatorError.message : String(operatorError)
        };

        throw operatorError;
      }
    }

    const completedAt = new Date();
    const totalDuration = completedAt.getTime() - startTime.getTime();

    await supabase.from('docetl_executions').update({
      status: 'completed',
      output_data: { results: context.data },
      metrics: {
        ...context.metadata,
        total_duration_ms: totalDuration,
        operators_executed: operators.length
      },
      completed_at: completedAt.toISOString()
    }).eq('id', executionId);

    logger.info('system', 'DocETL pipeline execution completed', {
      executionId,
      totalDuration,
      operatorsExecuted: operators.length,
      outputCount: context.data.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        execution_id: executionId,
        results: context.data,
        metrics: context.metadata
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    logger.critical('system', 'DocETL pipeline execution failed', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function executeOperator(
  operator: PipelineOperator,
  data: any[],
  supabase: any,
  logger: EdgeLogger
): Promise<any[]> {
  switch (operator.type) {
    case 'map':
      return await executeMapOperator(operator, data, supabase, logger);
    case 'filter':
      return await executeFilterOperator(operator, data, logger);
    case 'reduce':
      return await executeReduceOperator(operator, data, supabase, logger);
    case 'resolve':
      return await executeResolveOperator(operator, data, supabase, logger);
    case 'gather':
      return await executeGatherOperator(operator, data, logger);
    case 'unnest':
      return await executeUnnestOperator(operator, data, logger);
    case 'split':
      return await executeSplitOperator(operator, data, logger);
    case 'join':
      return await executeJoinOperator(operator, data, logger);
    default:
      throw new Error(`Unknown operator type: ${operator.type}`);
  }
}

async function executeMapOperator(
  operator: PipelineOperator,
  data: any[],
  supabase: any,
  logger: EdgeLogger
): Promise<any[]> {
  const { prompt, model = 'gpt-4o-mini', output_schema } = operator.config;

  if (!prompt) {
    throw new Error('Map operator requires a prompt');
  }

  const results = [];

  for (const item of data) {
    try {
      const llmResponse = await callLLM({
        prompt,
        data: item,
        model,
        output_schema,
        supabase,
        logger
      });

      results.push({
        ...item,
        ...llmResponse
      });
    } catch (error) {
      logger.warning('system', 'Map operator item failed', { item, error });
      results.push({
        ...item,
        _error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return results;
}

async function executeFilterOperator(
  operator: PipelineOperator,
  data: any[],
  logger: EdgeLogger
): Promise<any[]> {
  const { filter_condition } = operator.config;

  if (!filter_condition) {
    logger.warning('system', 'Filter operator missing condition, returning all data');
    return data;
  }

  return data.filter(item => {
    try {
      const func = new Function('item', `return ${filter_condition}`);
      return func(item);
    } catch (error) {
      logger.warning('system', 'Filter condition evaluation failed', { item, error });
      return false;
    }
  });
}

async function executeReduceOperator(
  operator: PipelineOperator,
  data: any[],
  supabase: any,
  logger: EdgeLogger
): Promise<any[]> {
  const { reduce_key, fold_prompt, model = 'gpt-4o-mini' } = operator.config;

  if (!reduce_key) {
    throw new Error('Reduce operator requires reduce_key');
  }

  const grouped: Record<string, any[]> = {};

  for (const item of data) {
    const key = item[reduce_key];
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  const results = [];

  for (const [key, items] of Object.entries(grouped)) {
    if (fold_prompt) {
      const llmResponse = await callLLM({
        prompt: fold_prompt,
        data: { key, items },
        model,
        supabase,
        logger
      });

      results.push({
        [reduce_key]: key,
        ...llmResponse,
        _original_count: items.length
      });
    } else {
      results.push({
        [reduce_key]: key,
        items,
        count: items.length
      });
    }
  }

  return results;
}

async function executeResolveOperator(
  operator: PipelineOperator,
  data: any[],
  supabase: any,
  logger: EdgeLogger
): Promise<any[]> {
  const { resolution_keys = [], comparison_prompt, model = 'gpt-4o-mini' } = operator.config;

  if (resolution_keys.length === 0) {
    logger.warning('system', 'Resolve operator has no resolution keys, returning data unchanged');
    return data;
  }

  const resolved: any[] = [];
  const processed = new Set<number>();

  for (let i = 0; i < data.length; i++) {
    if (processed.has(i)) continue;

    const item = data[i];
    const duplicates = [item];

    for (let j = i + 1; j < data.length; j++) {
      if (processed.has(j)) continue;

      const otherItem = data[j];
      const isSimilar = resolution_keys.every(key =>
        item[key] === otherItem[key]
      );

      if (isSimilar) {
        duplicates.push(otherItem);
        processed.add(j);
      }
    }

    if (duplicates.length > 1 && comparison_prompt) {
      const llmResponse = await callLLM({
        prompt: comparison_prompt,
        data: { candidates: duplicates },
        model,
        supabase,
        logger
      });

      resolved.push({
        ...llmResponse,
        _resolved_from: duplicates.length
      });
    } else {
      resolved.push(item);
    }

    processed.add(i);
  }

  return resolved;
}

async function executeGatherOperator(
  operator: PipelineOperator,
  data: any[],
  logger: EdgeLogger
): Promise<any[]> {
  const { gather_key, content_key } = operator.config;

  if (!gather_key) {
    throw new Error('Gather operator requires gather_key');
  }

  const grouped: Record<string, any> = {};

  for (const item of data) {
    const key = item[gather_key];
    if (!grouped[key]) {
      grouped[key] = {
        [gather_key]: key,
        items: []
      };
    }

    if (content_key) {
      grouped[key].items.push(item[content_key]);
    } else {
      grouped[key].items.push(item);
    }
  }

  return Object.values(grouped);
}

async function executeUnnestOperator(
  operator: PipelineOperator,
  data: any[],
  logger: EdgeLogger
): Promise<any[]> {
  const { unnest_key } = operator.config;

  if (!unnest_key) {
    throw new Error('Unnest operator requires unnest_key');
  }

  const results: any[] = [];

  for (const item of data) {
    const arrayToUnnest = item[unnest_key];

    if (Array.isArray(arrayToUnnest)) {
      for (const nested of arrayToUnnest) {
        results.push({
          ...item,
          [unnest_key]: nested
        });
      }
    } else {
      results.push(item);
    }
  }

  return results;
}

async function executeSplitOperator(
  operator: PipelineOperator,
  data: any[],
  logger: EdgeLogger
): Promise<any[]> {
  const { content_key = 'content' } = operator.config;
  const results: any[] = [];

  for (const item of data) {
    const content = item[content_key];

    if (typeof content === 'string') {
      const chunks = content.split('\n\n').filter(chunk => chunk.trim().length > 0);

      chunks.forEach((chunk, index) => {
        results.push({
          ...item,
          [content_key]: chunk,
          _chunk_index: index,
          _total_chunks: chunks.length
        });
      });
    } else {
      results.push(item);
    }
  }

  return results;
}

async function executeJoinOperator(
  operator: PipelineOperator,
  data: any[],
  logger: EdgeLogger
): Promise<any[]> {
  logger.warning('system', 'Join operator not fully implemented, returning data unchanged');
  return data;
}

async function callLLM(params: {
  prompt: string;
  data: any;
  model: string;
  output_schema?: Record<string, any>;
  supabase: any;
  logger: EdgeLogger;
}): Promise<any> {
  const { prompt, data, model, output_schema, supabase, logger } = params;

  const systemPrompt = output_schema
    ? `${prompt}\n\nYou must respond with valid JSON matching this schema: ${JSON.stringify(output_schema)}`
    : prompt;

  const userMessage = typeof data === 'string'
    ? data
    : JSON.stringify(data, null, 2);

  try {
    const { data: llmResponse } = await supabase.functions.invoke('generate-structured-output', {
      body: {
        extractedText: userMessage,
        template: {
          name: 'DocETL Operator',
          description: systemPrompt,
          fields: output_schema || {},
        },
        llmProvider: 'openai',
        model: model
      }
    });

    if (llmResponse?.error) {
      throw new Error(llmResponse.error);
    }

    return llmResponse?.structuredOutput || llmResponse;
  } catch (error) {
    logger.error('system', 'LLM call failed in DocETL operator', error);
    throw error;
  }
}
