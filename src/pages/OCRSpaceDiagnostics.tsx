import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, FileText, Activity, Clock } from 'lucide-react';

interface OCRSpaceLog {
  id: string;
  created_at: string;
  severity: string;
  message: string;
  context: any;
  error_details: any;
  job_id: string | null;
  document_id: string | null;
}

interface ProcessingJob {
  id: string;
  created_at: string;
  status: string;
  ocr_provider: string;
  error_message: string | null;
  error_details: any;
  processing_time_ms: number | null;
  document_id: string;
}

export function OCRSpaceDiagnostics() {
  const [logs, setLogs] = useState<OCRSpaceLog[]>([]);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyConfigured, setApiKeyConfigured] = useState<boolean | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('logs')
        .select('*')
        .or('category.eq.ocr,message.ilike.%OCR.space%')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) {
        console.error('Error loading logs:', logsError);
        setLastError(`Failed to load logs: ${logsError.message}`);
      } else {
        setLogs(logsData || []);
      }

      const { data: jobsData, error: jobsError } = await supabase
        .from('processing_jobs')
        .select('*')
        .eq('ocr_provider', 'ocr-space')
        .order('created_at', { ascending: false })
        .limit(20);

      if (jobsError) {
        console.error('Error loading jobs:', jobsError);
        setLastError(`Failed to load jobs: ${jobsError.message}`);
      } else {
        setJobs(jobsData || []);
      }

      await testApiKey();
    } catch (error) {
      console.error('Error loading diagnostics:', error);
      setLastError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testApiKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-pdf-ocr', {
        body: {
          documentId: 'test-doc-id',
          jobId: 'test-job-id',
          fileUrl: 'https://example.com/test.pdf',
          ocrProvider: 'ocr-space',
        },
      });

      if (error) {
        setApiKeyConfigured(false);
      } else if (data?.extractedText) {
        if (data.extractedText.includes('[OCR.space API key not configured')) {
          setApiKeyConfigured(false);
        } else if (data.extractedText.includes('OCR.space API test successful')) {
          setApiKeyConfigured(true);
        } else {
          setApiKeyConfigured(true);
        }
      }
    } catch (error) {
      console.error('Error testing API key:', error);
      setApiKeyConfigured(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const failedJobs = jobs.filter(j => j.status === 'failed');
  const successfulJobs = jobs.filter(j => j.status === 'completed');
  const errorLogs = logs.filter(l => l.severity === 'error' || l.severity === 'critical');

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">OCR.space Diagnostics</h1>
            <p className="text-gray-600">Debug and monitor OCR.space processing issues</p>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {lastError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error Loading Data</h3>
              <p className="text-sm text-red-700">{lastError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">API Key Status</span>
              {apiKeyConfigured === null ? (
                <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
              ) : apiKeyConfigured ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {apiKeyConfigured === null ? 'Testing...' : apiKeyConfigured ? 'Configured' : 'Missing'}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Jobs</span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Failed Jobs</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{failedJobs.length}</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Error Logs</span>
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{errorLogs.length}</p>
          </div>
        </div>

        {!apiKeyConfigured && apiKeyConfigured !== null && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2">API Key Not Configured</h3>
            <p className="text-sm text-yellow-800">
              The OCR.space API key is not configured in Supabase Edge Functions.
              To configure it, add the <code className="bg-yellow-100 px-1 rounded">OCR_SPACE_API_KEY</code> environment
              variable to your Supabase project settings.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Recent Processing Jobs
            </h2>
            <div className="space-y-3">
              {jobs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No OCR.space jobs found</p>
              ) : (
                jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium text-gray-900">{job.status}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(job.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600">
                        <span className="font-medium">Job ID:</span> {job.id.substring(0, 8)}...
                      </p>
                      {job.processing_time_ms && (
                        <p className="text-gray-600">
                          <span className="font-medium">Processing Time:</span> {job.processing_time_ms}ms
                        </p>
                      )}
                      {job.error_message && (
                        <p className="text-red-600">
                          <span className="font-medium">Error:</span> {job.error_message}
                        </p>
                      )}
                      {job.error_details && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-blue-600 hover:text-blue-700">
                            View Error Details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(job.error_details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Logs
            </h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No OCR.space logs found</p>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 border rounded-lg ${getSeverityColor(log.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-sm uppercase">{log.severity}</span>
                      <span className="text-xs opacity-75">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{log.message}</p>
                    {log.context && Object.keys(log.context).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                          View Context
                        </summary>
                        <pre className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </details>
                    )}
                    {log.error_details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs opacity-75 hover:opacity-100">
                          View Error Details
                        </summary>
                        <pre className="mt-2 p-2 bg-white bg-opacity-50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.error_details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {failedJobs.length > 0 && (
          <div className="mt-6 bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Common Errors
            </h2>
            <div className="space-y-3">
              {Array.from(new Set(failedJobs.map(j => j.error_message).filter(Boolean))).map((error, idx) => (
                <div key={idx} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-900">
                    <span className="font-medium">Error:</span> {error}
                  </p>
                  <p className="text-xs text-red-700 mt-2">
                    Occurred {failedJobs.filter(j => j.error_message === error).length} time(s)
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
