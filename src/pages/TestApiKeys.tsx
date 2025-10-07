import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Provider {
  name: string;
  key: string;
  test: string;
}

interface TestResult {
  status: 'pending' | 'success' | 'warning' | 'error';
  message: string;
}

const providers: Provider[] = [
  { name: 'OpenAI (GPT-4o-mini)', key: 'OPENAI_API_KEY', test: 'openai' },
  { name: 'Anthropic (Claude 3.5 Sonnet)', key: 'ANTHROPIC_API_KEY', test: 'anthropic' },
  { name: 'Mistral (Large)', key: 'MISTRAL_API_KEY', test: 'mistral-large' },
  { name: 'Google Vision OCR', key: 'GOOGLE_VISION_API_KEY', test: 'google-vision' },
  { name: 'OCR.space', key: 'OCR_SPACE_API_KEY', test: 'ocr-space' },
  { name: 'Mistral Pixtral OCR', key: 'MISTRAL_API_KEY', test: 'mistral' },
  { name: 'AWS Textract', key: 'AWS_ACCESS_KEY_ID', test: 'aws-textract' },
  { name: 'Azure Document Intelligence', key: 'AZURE_DOCUMENT_INTELLIGENCE_KEY', test: 'azure-document-intelligence' },
];

export function TestApiKeys() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());

  const updateResult = (providerName: string, status: TestResult['status'], message: string) => {
    setResults((prev) => new Map(prev).set(providerName, { status, message }));
  };

  const testProvider = async (provider: Provider) => {
    updateResult(provider.name, 'pending', 'Testing...');

    try {
      const ocrProviders = ['google-vision', 'ocr-space', 'mistral', 'aws-textract', 'azure-document-intelligence'];
      const isOCR = ocrProviders.includes(provider.test);

      if (isOCR) {
        const { data, error } = await supabase.functions.invoke('process-pdf-ocr', {
          body: {
            documentId: 'test-doc-id',
            jobId: 'test-job-id',
            fileUrl: 'https://example.com/test.pdf',
            ocrProvider: provider.test,
          },
        });

        if (error) {
          updateResult(provider.name, 'error', `Error: ${error.message || 'Connection failed'}`);
        } else if (data?.extractedText && data.extractedText.includes('[') && data.extractedText.includes('demo')) {
          updateResult(provider.name, 'warning', `${provider.key} not configured - using demo mode`);
        } else {
          updateResult(provider.name, 'success', `${provider.key} is configured and working!`);
        }
      } else {
        const { data, error } = await supabase.functions.invoke('generate-structured-output', {
          body: {
            jobId: 'test-job-id',
            extractedText: 'Test text',
            structureTemplate: { type: 'object', properties: { test: { type: 'string' } } },
            llmProvider: provider.test,
          },
        });

        if (error) {
          updateResult(provider.name, 'error', `Error: ${error.message || 'Connection failed'}`);
        } else if (data?.structuredOutput?._demo_note) {
          updateResult(provider.name, 'warning', `${provider.key} not configured - using demo mode`);
        } else {
          updateResult(provider.name, 'success', `${provider.key} is configured and working!`);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      updateResult(provider.name, 'error', `Test failed: ${errorMessage}`);
    }
  };

  const runTests = async () => {
    setTesting(true);
    setResults(new Map());

    for (const provider of providers) {
      await testProvider(provider);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setTesting(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-600 animate-pulse" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getStatusBadgeClass = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'success':
        return 'bg-green-50 text-green-800 border-green-200';
      case 'warning':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'error':
        return 'bg-red-50 text-red-800 border-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">API Keys Configuration Test</h1>
            <p className="text-gray-600">
              Verify that your API keys are properly configured in Supabase Edge Functions
            </p>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>Note:</strong> The Edge Functions will return demo data if API keys are missing. This test
              helps you identify which keys need to be configured.
            </div>
          </div>

          <button
            onClick={runTests}
            disabled={testing}
            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed mb-6"
          >
            {testing ? 'Testing...' : results.size > 0 ? 'Run Tests Again' : 'Run API Key Tests'}
          </button>

          {results.size > 0 && (
            <div className="space-y-4">
              {providers.map((provider) => {
                const result = results.get(provider.name);
                if (!result) return null;

                return (
                  <div
                    key={provider.name}
                    className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{provider.name}</h3>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                      </div>
                    </div>
                    <div
                      className={`inline-block px-3 py-1 rounded-md text-sm font-medium border ${getStatusBadgeClass(
                        result.status
                      )}`}
                    >
                      {result.status.toUpperCase()}
                    </div>
                    <p className="mt-3 text-sm text-gray-600">{result.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {results.size === 0 && !testing && (
            <div className="text-center py-12 text-gray-500">
              <p>Click the button above to run the API key tests</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
