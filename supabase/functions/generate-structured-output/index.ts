import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { EdgeLogger, generateRequestId, updateProviderHealth } from "../_shared/logger.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type LLMProvider = 'openai' | 'anthropic' | 'mistral-large';

interface GenerateStructuredOutputRequest {
  jobId: string;
  extractedText: string;
  structureTemplate: any;
  llmProvider?: LLMProvider;
  llmModel?: string;
}

interface LLMResult {
  structuredOutput: any;
  metadata: {
    provider: string;
    tokensUsed?: number;
    model?: string;
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

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const logger = new EdgeLogger(supabaseClient, requestId);

    const {
      jobId,
      extractedText,
      structureTemplate,
      llmProvider = 'openai',
      llmModel,
    }: GenerateStructuredOutputRequest = await req.json();

    logger.info('llm', `Starting LLM processing for job ${jobId} using ${llmProvider}`, {
      jobId,
      llmProvider,
      textLength: extractedText?.length || 0,
      hasTemplate: !!structureTemplate,
      requestId
    });

    const isTestMode = jobId === 'test-job-id';

    const startTime = Date.now();
    const perfStartTime = new Date();

    if (!isTestMode) {
      await supabaseClient
        .from('processing_jobs')
        .update({
          status: 'llm_processing',
          request_id: requestId
        })
        .eq('id', jobId);

      logger.debug('database', 'Updated job status to llm_processing', { jobId });
    }

    try {
      let llmResult: LLMResult;

      const providers: LLMProvider[] = [llmProvider, 'openai', 'anthropic', 'mistral-large'];
      const uniqueProviders = Array.from(new Set(providers));

      let lastError: Error | null = null;

      // Check if text is too large and needs chunking
      const estimatedTokens = estimateTokens(extractedText);
      const needsChunking = estimatedTokens > 8000; // ~32,000 characters
      
      if (needsChunking) {
        logger.info('llm', 'Large document detected, using chunked processing', {
          estimatedTokens,
          textLength: extractedText.length,
          jobId
        });
      }

      for (const provider of uniqueProviders) {
        const providerStartTime = Date.now();
        try {
          logger.info('llm', `Attempting LLM generation with provider: ${provider}`, { provider, jobId, needsChunking });

          if (needsChunking) {
            // Process in chunks
            const chunks = splitIntoChunks(extractedText, 8000);
            logger.info('llm', `Processing ${chunks.length} chunks with ${provider}`, {
              provider,
              chunkCount: chunks.length,
              jobId
            });

            const chunkResults: any[] = [];
            
            for (let i = 0; i < chunks.length; i++) {
              logger.debug('llm', `Processing chunk ${i + 1}/${chunks.length}`, {
                provider,
                chunkIndex: i,
                chunkSize: chunks[i].length
              });

              let chunkResult: LLMResult;
              switch (provider) {
                case 'openai':
                  chunkResult = await generateWithOpenAI(chunks[i], structureTemplate, llmModel);
                  break;
                case 'anthropic':
                  chunkResult = await generateWithAnthropic(chunks[i], structureTemplate, llmModel);
                  break;
                case 'mistral-large':
                  chunkResult = await generateWithMistralLarge(chunks[i], structureTemplate, llmModel);
                  break;
                default:
                  continue;
              }

              if (!chunkResult.structuredOutput._demo_note) {
                chunkResults.push(chunkResult.structuredOutput);
              }
            }

            if (chunkResults.length > 0) {
              const mergedOutput = mergeStructuredOutputs(chunkResults, structureTemplate);
              llmResult = {
                structuredOutput: mergedOutput,
                metadata: {
                  provider: provider,
                  chunked: true,
                  chunkCount: chunks.length,
                },
              };
            } else {
              throw new Error('All chunks returned demo data');
            }
          } else {
            // Process normally (no chunking)
            switch (provider) {
              case 'openai':
                llmResult = await generateWithOpenAI(extractedText, structureTemplate, llmModel);
                break;
              case 'anthropic':
                llmResult = await generateWithAnthropic(extractedText, structureTemplate, llmModel);
                break;
              case 'mistral-large':
                llmResult = await generateWithMistralLarge(extractedText, structureTemplate, llmModel);
                break;
              default:
                continue;
            }
          }

          const providerDuration = Date.now() - providerStartTime;

          if (llmResult.structuredOutput && !llmResult.structuredOutput._demo_note) {
            logger.info('llm', `Successfully generated output with ${provider}`, {
              provider,
              duration_ms: providerDuration,
              outputKeys: Object.keys(llmResult.structuredOutput).length,
              tokensUsed: llmResult.metadata.tokensUsed,
              chunked: needsChunking,
              chunkCount: needsChunking ? splitIntoChunks(extractedText).length : 1
            });

            await updateProviderHealth(supabaseClient, provider, 'llm', 'healthy', providerDuration);
            break;
          } else {
            logger.warning('llm', `Provider ${provider} returned demo data (no API key configured)`, { provider });
          }
        } catch (error) {
          const providerDuration = Date.now() - providerStartTime;
          logger.error('llm', `Provider ${provider} failed`, error, {
            provider,
            duration_ms: providerDuration,
            errorMessage: error instanceof Error ? error.message : String(error)
          });

          await updateProviderHealth(
            supabaseClient,
            provider,
            'llm',
            'down',
            providerDuration,
            error instanceof Error ? error.message : String(error)
          );

          lastError = error instanceof Error ? error : new Error(String(error));
          continue;
        }
      }

      if (!llmResult! || llmResult!.structuredOutput._demo_note) {
        logger.warning('llm', 'All providers failed or returned demo data, using demo fallback', {
          attemptedProviders: uniqueProviders,
          lastError: lastError?.message
        });
        llmResult = {
          structuredOutput: generateDemoStructuredOutput(extractedText, structureTemplate),
          metadata: {
            provider: 'demo',
          },
        };
      }

      const processingTime = Date.now() - startTime;
      const perfEndTime = new Date();

      logger.info('llm', 'LLM processing completed successfully', {
        jobId,
        processingTime,
        provider: llmResult.metadata.provider,
        outputKeys: Object.keys(llmResult.structuredOutput).length
      });

      if (!isTestMode) {
        const { data: currentJob } = await supabaseClient
          .from('processing_jobs')
          .select('processing_time_ms')
          .eq('id', jobId)
          .single();

        const totalTime = (currentJob?.processing_time_ms || 0) + processingTime;

        await supabaseClient
          .from('processing_jobs')
          .update({
            structured_output: llmResult.structuredOutput,
            processing_time_ms: totalTime,
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        await logger.recordPerformanceMetric({
          jobId,
          stage: 'llm',
          provider: llmResult.metadata.provider,
          startTime: perfStartTime,
          endTime: perfEndTime,
          status: 'success',
          metadata: {
            outputKeys: Object.keys(llmResult.structuredOutput).length,
            tokensUsed: llmResult.metadata.tokensUsed,
            model: llmResult.metadata.model,
            provider: llmResult.metadata.provider
          }
        });

        logger.debug('database', 'Updated job status to completed', { jobId, totalTime });
      }

      return new Response(
        JSON.stringify({
          success: true,
          structuredOutput: llmResult.structuredOutput,
          processingTime,
          metadata: llmResult.metadata,
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'LLM processing failed';
      logger.critical('llm', 'LLM processing failed with error', error, {
        jobId,
        provider: llmProvider,
        errorMessage
      });

      if (!isTestMode) {
        await supabaseClient
          .from('processing_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            error_details: {
              error: errorMessage,
              provider: llmProvider,
              timestamp: new Date().toISOString(),
              requestId
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        await logger.recordPerformanceMetric({
          jobId,
          stage: 'llm',
          provider: llmProvider,
          startTime: perfStartTime,
          endTime: new Date(),
          status: 'failed',
          metadata: {
            error: errorMessage,
            provider: llmProvider
          }
        });
      }

      // Return error response with proper CORS headers instead of throwing
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CRITICAL] Function error:', errorMessage, error);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function generateWithOpenAI(
  extractedText: string,
  structureTemplate: any,
  model: string = 'gpt-4o-mini'
): Promise<LLMResult> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    return {
      structuredOutput: generateDemoStructuredOutput(extractedText, structureTemplate),
      metadata: {
        provider: 'openai-demo',
      },
    };
  }

  const prompt = buildPrompt(extractedText, structureTemplate);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 second timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a data extraction assistant. Extract information from the provided text and return it in valid JSON format matching the given structure. Only return the JSON object, no additional text or markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const structuredOutput = JSON.parse(content);

    return {
      structuredOutput,
      metadata: {
        provider: 'openai',
        tokensUsed: result.usage?.total_tokens,
        model: result.model,
      },
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('OpenAI API request timed out after 90 seconds');
    }
    throw error;
  }
}

async function generateWithAnthropic(
  extractedText: string,
  structureTemplate: any,
  model: string = 'claude-3-5-sonnet-20241022'
): Promise<LLMResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return {
      structuredOutput: generateDemoStructuredOutput(extractedText, structureTemplate),
      metadata: {
        provider: 'anthropic-demo',
      },
    };
  }

  const prompt = buildPrompt(extractedText, structureTemplate);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `You are a data extraction assistant. Extract information from the provided text and return it in valid JSON format matching the given structure. Only return the JSON object, no additional text or markdown formatting.\n\n${prompt}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.content[0]?.text;

  if (!content) {
    throw new Error('No response from Anthropic');
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Could not extract JSON from response');
  }

  const structuredOutput = JSON.parse(jsonMatch[0]);

  return {
    structuredOutput,
    metadata: {
      provider: 'anthropic',
      tokensUsed: result.usage?.input_tokens + result.usage?.output_tokens,
      model: result.model,
    },
  };
}

async function generateWithMistralLarge(
  extractedText: string,
  structureTemplate: any,
  model: string = 'mistral-large-latest'
): Promise<LLMResult> {
  const apiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!apiKey) {
    return {
      structuredOutput: generateDemoStructuredOutput(extractedText, structureTemplate),
      metadata: {
        provider: 'mistral-large-demo',
      },
    };
  }

  const prompt = buildPrompt(extractedText, structureTemplate);

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'mistral-large-latest',
      messages: [
        {
          role: 'system',
          content:
            'You are a data extraction assistant. Extract information from the provided text and return it in valid JSON format matching the given structure. Only return the JSON object, no additional text.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral API error: ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No response from Mistral');
  }

  const structuredOutput = JSON.parse(content);

  return {
    structuredOutput,
    metadata: {
      provider: 'mistral-large',
      tokensUsed: result.usage?.total_tokens,
      model: result.model,
    },
  };
}

function buildPrompt(extractedText: string, structureTemplate: any): string {
  const schemaDescription = JSON.stringify(structureTemplate, null, 2);

  return `Extract information from the following text and structure it according to the provided JSON schema.\n\nJSON Schema:\n${schemaDescription}\n\nExtracted Text:\n${extractedText}\n\nReturn the extracted information as a valid JSON object matching the schema above. If a field cannot be found in the text, use null for strings/objects or an empty array for array types. Ensure all field names match the schema exactly.`;
}

// Helper function to estimate tokens (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Split text into chunks for large documents
function splitIntoChunks(text: string, maxTokens: number = 8000): string[] {
  // Check if text has page breaks
  const pageBreakMarker = '--- Page Break ---';
  
  if (text.includes(pageBreakMarker)) {
    // Split by pages
    const pages = text.split(pageBreakMarker).map(p => p.trim()).filter(p => p);
    
    // If individual pages are too large, return them as-is
    // The LLM will handle them, or we'll chunk further
    return pages;
  }
  
  // No page breaks - split by paragraphs
  const maxChars = maxTokens * 4; // ~4 chars per token
  const chunks: string[] = [];
  
  if (text.length <= maxChars) {
    return [text];
  }
  
  // Split by double newlines (paragraphs)
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
  for (const para of paragraphs) {
    if ((currentChunk + para).length > maxChars && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.length > 0 ? chunks : [text];
}

// Merge multiple structured outputs into one
function mergeStructuredOutputs(outputs: any[], template: any): any {
  if (outputs.length === 0) return {};
  if (outputs.length === 1) return outputs[0];
  
  const merged: any = {};
  
  // Handle templates with array properties (like exam questions, items, etc.)
  if (template.properties) {
    for (const [key, schema] of Object.entries(template.properties)) {
      const prop = schema as any;
      
      if (prop.type === 'array') {
        // Merge arrays from all outputs
        merged[key] = outputs
          .flatMap(output => output[key] || [])
          .filter(item => item); // Remove nulls/undefined
      } else if (prop.type === 'number') {
        // For numbers, try to sum if it makes sense (like total_questions)
        if (key.includes('total') || key.includes('count')) {
          merged[key] = outputs.reduce((sum, output) => sum + (output[key] || 0), 0);
        } else {
          // Otherwise take first non-null value
          merged[key] = outputs.find(output => output[key] != null)?.[key] || null;
        }
      } else {
        // For strings, objects, etc., take first non-null/non-empty value
        merged[key] = outputs.find(output => output[key] != null && output[key] !== '')?.[key] || null;
      }
    }
  } else {
    // Fallback: simple merge
    return Object.assign({}, ...outputs);
  }
  
  return merged;
}

function generateDemoStructuredOutput(
  extractedText: string,
  structureTemplate: any
): any {
  console.log('Using demo mode - no API key configured');

  const demoOutput: any = {};

  if (structureTemplate.properties) {
    for (const [key, value] of Object.entries(structureTemplate.properties)) {
      const prop = value as any;

      if (prop.type === 'string') {
        demoOutput[key] = `[Demo: ${key.replace(/_/g, ' ')} from document]`;
      } else if (prop.type === 'number') {
        demoOutput[key] = 99.99;
      } else if (prop.type === 'boolean') {
        demoOutput[key] = true;
      } else if (prop.type === 'array') {
        if (prop.items?.type === 'string') {
          demoOutput[key] = ['[Demo item 1]', '[Demo item 2]'];
        } else if (prop.items?.type === 'object') {
          demoOutput[key] = [
            Object.keys(prop.items.properties || {}).reduce((acc, k) => {
              acc[k] = `[Demo ${k}]`;
              return acc;
            }, {} as any),
          ];
        } else {
          demoOutput[key] = [];
        }
      } else if (prop.type === 'object') {
        demoOutput[key] = {};
      }
    }
  }

  demoOutput._demo_note =
    'This is demo data. Configure OPENAI_API_KEY, ANTHROPIC_API_KEY, or MISTRAL_API_KEY for real AI-powered extraction.';
  demoOutput._extracted_text_preview = extractedText.substring(0, 200) + '...';

  return demoOutput;
}
