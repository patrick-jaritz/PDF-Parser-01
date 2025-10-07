import { useState, useEffect } from 'react';
import { getRecentLogs, logger } from '../lib/logger';
import { Database } from '../lib/database.types';
import { Filter, RefreshCw, Download, AlertCircle, Info, AlertTriangle, XCircle, Bug, Calendar, User, FileText, Eye } from 'lucide-react';
import { LiveLogViewer } from '../components/LiveLogViewer';

type Log = Database['public']['Tables']['logs']['Row'];
type LogSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';
type LogCategory = 'ocr' | 'llm' | 'upload' | 'database' | 'api' | 'system' | 'auth' | 'storage';

export function AdminLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    severity: '' as LogSeverity | '',
    category: '' as LogCategory | '',
    search: '',
    jobId: '',
    documentId: '',
    userId: '',
    startDate: '',
    endDate: '',
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [showLiveView, setShowLiveView] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filterOptions: any = {};
      if (filters.severity) filterOptions.severity = filters.severity;
      if (filters.category) filterOptions.category = filters.category;
      if (filters.jobId) filterOptions.jobId = filters.jobId;
      if (filters.startDate) filterOptions.startDate = new Date(filters.startDate);
      if (filters.endDate) filterOptions.endDate = new Date(filters.endDate);

      const data = await getRecentLogs(200, filterOptions);
      setLogs(data);
    } catch (error) {
      logger.error('system', 'Failed to load logs', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters.severity, filters.category, filters.jobId, filters.startDate, filters.endDate]);

  const filteredLogs = logs.filter(log => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch = (
        log.message.toLowerCase().includes(search) ||
        log.job_id?.toLowerCase().includes(search) ||
        log.document_id?.toLowerCase().includes(search) ||
        log.request_id?.toLowerCase().includes(search)
      );
      if (!matchesSearch) return false;
    }

    if (filters.documentId && log.document_id !== filters.documentId) return false;
    if (filters.userId && log.user_id !== filters.userId) return false;

    return true;
  });

  const getSeverityIcon = (severity: LogSeverity) => {
    switch (severity) {
      case 'debug':
        return <Bug className="w-4 h-4 text-gray-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'critical':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getSeverityColor = (severity: LogSeverity) => {
    switch (severity) {
      case 'debug':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'info':
        return 'bg-blue-50 text-blue-700 border-blue-300';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-300';
      case 'error':
        return 'bg-orange-50 text-orange-700 border-orange-300';
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-300';
    }
  };

  const getCategoryColor = (category: LogCategory) => {
    const colors = {
      ocr: 'bg-purple-100 text-purple-700',
      llm: 'bg-indigo-100 text-indigo-700',
      upload: 'bg-green-100 text-green-700',
      database: 'bg-cyan-100 text-cyan-700',
      api: 'bg-pink-100 text-pink-700',
      system: 'bg-gray-100 text-gray-700',
      auth: 'bg-orange-100 text-orange-700',
      storage: 'bg-teal-100 text-teal-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const exportLogs = () => {
    const csv = [
      ['Timestamp', 'Severity', 'Category', 'Message', 'Job ID', 'Document ID', 'Request ID'].join(','),
      ...filteredLogs.map(log =>
        [
          log.timestamp,
          log.severity,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.job_id || '',
          log.document_id || '',
          log.request_id || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setShowLiveView(!showLiveView)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  showLiveView
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Eye className="w-4 h-4" />
                {showLiveView ? 'Live View' : 'Show Live'}
              </button>
              <button
                onClick={loadLogs}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={exportLogs}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value as LogSeverity | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Severities</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-1" />
                  Category
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value as LogCategory | '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Categories</option>
                  <option value="ocr">OCR</option>
                  <option value="llm">LLM</option>
                  <option value="upload">Upload</option>
                  <option value="database">Database</option>
                  <option value="api">API</option>
                  <option value="system">System</option>
                  <option value="auth">Auth</option>
                  <option value="storage">Storage</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Job ID
                </label>
                <input
                  type="text"
                  value={filters.jobId}
                  onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
                  placeholder="Filter by job ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Document ID
                </label>
                <input
                  type="text"
                  value={filters.documentId}
                  onChange={(e) => setFilters({ ...filters, documentId: e.target.value })}
                  placeholder="Filter by document ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  User ID
                </label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                  placeholder="Filter by user ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Search messages..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFilters({
                  severity: '',
                  category: '',
                  search: '',
                  jobId: '',
                  documentId: '',
                  userId: '',
                  startDate: '',
                  endDate: '',
                })}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredLogs.length} of {logs.length} logs
          </div>
        </div>

        {showLiveView && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <LiveLogViewer
              maxLogs={50}
              autoRefresh={true}
              refreshInterval={2000}
              severityFilter={filters.severity ? [filters.severity] : undefined}
              categoryFilter={filters.category ? [filters.category] : undefined}
            />
          </div>
        )}

        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-4" />
              <p className="text-gray-600">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-600">No logs found matching your filters</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`bg-white rounded-lg shadow-sm border-l-4 hover:shadow-md transition-shadow cursor-pointer ${
                  getSeverityColor(log.severity as LogSeverity)
                }`}
                onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="mt-0.5">
                        {getSeverityIcon(log.severity as LogSeverity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(log.category as LogCategory)}`}>
                            {log.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                          {log.job_id && (
                            <span className="text-xs text-gray-500 font-mono">
                              Job: {log.job_id.substring(0, 8)}
                            </span>
                          )}
                          {log.request_id && (
                            <span className="text-xs text-gray-500 font-mono">
                              Req: {log.request_id.substring(0, 12)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-900 font-medium">{log.message}</p>

                        {expandedLog === log.id && (
                          <div className="mt-4 space-y-3">
                            {log.context && Object.keys(log.context).length > 0 && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 mb-1">Context</h4>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto border border-gray-200">
                                  {JSON.stringify(log.context, null, 2)}
                                </pre>
                              </div>
                            )}

                            {log.error_details && (
                              <div>
                                <h4 className="text-xs font-semibold text-red-700 mb-1">Error Details</h4>
                                <pre className="bg-red-50 p-3 rounded text-xs overflow-x-auto border border-red-200 text-red-900">
                                  {JSON.stringify(log.error_details, null, 2)}
                                </pre>
                              </div>
                            )}

                            <div className="flex gap-4 text-xs text-gray-500">
                              {log.user_id && <span>User ID: {log.user_id}</span>}
                              {log.document_id && <span>Document ID: {log.document_id}</span>}
                              <span>Log ID: {log.id}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
