import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Info, AlertTriangle, Bug, XCircle, RefreshCw } from 'lucide-react';

interface Log {
  id: string;
  timestamp: string;
  severity: string;
  category: string;
  message: string;
  context?: any;
  error_details?: any;
  user_id?: string;
  job_id?: string;
  document_id?: string;
  request_id?: string;
}

interface LiveLogViewerProps {
  maxLogs?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  severityFilter?: string[];
  categoryFilter?: string[];
}

export function LiveLogViewer({
  maxLogs = 50,
  autoRefresh = true,
  refreshInterval = 2000,
  severityFilter,
  categoryFilter,
}: LiveLogViewerProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(maxLogs);

      if (severityFilter && severityFilter.length > 0) {
        query = query.in('severity', severityFilter);
      }

      if (categoryFilter && categoryFilter.length > 0) {
        query = query.in('category', categoryFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLogs(data || []);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [severityFilter, categoryFilter]);

  useEffect(() => {
    if (!autoRefresh || isPaused) return;

    const interval = setInterval(fetchLogs, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isPaused, severityFilter, categoryFilter]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'debug':
        return <Bug className="h-4 w-4 text-gray-400" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-700" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'debug':
        return 'bg-gray-50 border-gray-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'critical':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading logs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-800">Failed to load logs: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Live Logs</h3>
          {autoRefresh && !isPaused && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={fetchLogs}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No logs found
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`p-3 border rounded ${getSeverityColor(log.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">{getSeverityIcon(log.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {log.category}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 break-words">{log.message}</p>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        Context
                      </summary>
                      <pre className="mt-1 text-xs text-gray-700 bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    </details>
                  )}
                  {log.error_details && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                        Error Details
                      </summary>
                      <pre className="mt-1 text-xs text-red-700 bg-white p-2 rounded border border-red-200 overflow-x-auto">
                        {JSON.stringify(log.error_details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
