import { supabase } from './supabase';
import { updateProviderHealth } from './logger';

interface HealthCheckResult {
  provider: string;
  type: 'ocr' | 'llm';
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
}

export async function checkOCRProviderHealth(
  provider: 'google-vision' | 'mistral' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space' | 'tesseract'
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-pdf-ocr`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          documentId: 'test-doc-id',
          jobId: 'test-job-id',
          fileUrl: '',
          ocrProvider: provider,
        }),
      }
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        provider,
        type: 'ocr',
        status: 'down',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();

    const isConfigured = !result.extractedText?.includes('not configured') &&
                         !result.extractedText?.includes('demo mode');

    await updateProviderHealth(
      provider,
      'ocr',
      isConfigured ? 'healthy' : 'degraded',
      responseTime,
      isConfigured ? undefined : 'API key not configured'
    );

    return {
      provider,
      type: 'ocr',
      status: isConfigured ? 'healthy' : 'degraded',
      responseTime,
      error: isConfigured ? undefined : 'API key not configured (demo mode)',
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateProviderHealth(provider, 'ocr', 'down', responseTime, errorMessage);

    return {
      provider,
      type: 'ocr',
      status: 'down',
      responseTime,
      error: errorMessage,
    };
  }
}

export async function checkLLMProviderHealth(
  provider: 'openai' | 'anthropic' | 'mistral-large'
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-structured-output`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          jobId: 'test-job-id',
          extractedText: 'Test health check',
          structureTemplate: { type: 'object', properties: { test: { type: 'string' } } },
          llmProvider: provider,
        }),
      }
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        provider,
        type: 'llm',
        status: 'down',
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();

    const isConfigured = !result.structuredOutput?._demo_note;

    await updateProviderHealth(
      provider,
      'llm',
      isConfigured ? 'healthy' : 'degraded',
      responseTime,
      isConfigured ? undefined : 'API key not configured'
    );

    return {
      provider,
      type: 'llm',
      status: isConfigured ? 'healthy' : 'degraded',
      responseTime,
      error: isConfigured ? undefined : 'API key not configured (demo mode)',
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await updateProviderHealth(provider, 'llm', 'down', responseTime, errorMessage);

    return {
      provider,
      type: 'llm',
      status: 'down',
      responseTime,
      error: errorMessage,
    };
  }
}

export async function checkAllProviders(): Promise<HealthCheckResult[]> {
  const ocrProviders: Array<'google-vision' | 'mistral' | 'aws-textract' | 'azure-document-intelligence' | 'ocr-space' | 'tesseract'> = [
    'google-vision',
    'mistral',
    'aws-textract',
    'azure-document-intelligence',
    'ocr-space',
    'tesseract',
  ];

  const llmProviders: Array<'openai' | 'anthropic' | 'mistral-large'> = [
    'openai',
    'anthropic',
    'mistral-large',
  ];

  const ocrResults = await Promise.all(
    ocrProviders.map((provider) => checkOCRProviderHealth(provider))
  );

  const llmResults = await Promise.all(
    llmProviders.map((provider) => checkLLMProviderHealth(provider))
  );

  return [...ocrResults, ...llmResults];
}

export async function getProviderStatus(
  provider: string,
  type: 'ocr' | 'llm'
): Promise<{
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheck: string | null;
  responseTime: number | null;
  consecutiveFailures: number;
  errorMessage: string | null;
} | null> {
  const { data } = await supabase
    .from('provider_health')
    .select('*')
    .eq('provider_name', provider)
    .eq('provider_type', type)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    status: data.status as 'healthy' | 'degraded' | 'down' | 'unknown',
    lastCheck: data.last_check,
    responseTime: data.response_time_ms,
    consecutiveFailures: data.consecutive_failures,
    errorMessage: data.error_message,
  };
}
