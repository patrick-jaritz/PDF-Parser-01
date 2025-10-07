import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getProviderHealth, logger } from '../lib/logger';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, XCircle, Zap } from 'lucide-react';

interface Stats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  avgProcessingTime: number;
  todayJobs: number;
  errorRate: number;
}

interface ProviderHealthData {
  provider_name: string;
  provider_type: 'ocr' | 'llm';
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  response_time_ms: number | null;
  consecutive_failures: number;
  last_check: string;
  error_message: string | null;
}

interface RecentError {
  id: string;
  message: string;
  timestamp: string;
  category: string;
  job_id: string | null;
  error_details: any;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    avgProcessingTime: 0,
    todayJobs: 0,
    errorRate: 0,
  });
  const [providerHealth, setProviderHealth] = useState<ProviderHealthData[]>([]);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, healthData, errorsData] = await Promise.all([
        loadStats(),
        getProviderHealth(),
        loadRecentErrors(),
      ]);

      setStats(statsData);
      setProviderHealth(healthData as ProviderHealthData[]);
      setRecentErrors(errorsData);
    } catch (error) {
      logger.error('system', 'Failed to load dashboard data', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (): Promise<Stats> => {
    const { data: jobs } = await supabase
      .from('processing_jobs')
      .select('status, processing_time_ms, created_at');

    if (!jobs) {
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        avgProcessingTime: 0,
        todayJobs: 0,
        errorRate: 0,
      };
    }

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter((j) => j.status === 'completed').length;
    const failedJobs = jobs.filter((j) => j.status === 'failed').length;

    const completedWithTime = jobs.filter(
      (j) => j.status === 'completed' && j.processing_time_ms
    );
    const avgProcessingTime =
      completedWithTime.length > 0
        ? completedWithTime.reduce((sum, j) => sum + (j.processing_time_ms || 0), 0) /
          completedWithTime.length
        : 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayJobs = jobs.filter(
      (j) => new Date(j.created_at) >= today
    ).length;

    const errorRate = totalJobs > 0 ? (failedJobs / totalJobs) * 100 : 0;

    return {
      totalJobs,
      completedJobs,
      failedJobs,
      avgProcessingTime: Math.round(avgProcessingTime),
      todayJobs,
      errorRate: Math.round(errorRate * 10) / 10,
    };
  };

  const loadRecentErrors = async (): Promise<RecentError[]> => {
    const { data } = await supabase
      .from('logs')
      .select('id, message, timestamp, category, job_id, error_details')
      .in('severity', ['error', 'critical'])
      .order('timestamp', { ascending: false })
      .limit(10);

    return (data || []) as RecentError[];
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'down':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-pulse mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Jobs</span>
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.totalJobs}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.todayJobs} today</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completed</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.completedJobs}</div>
            <div className="text-sm text-gray-500 mt-1">
              {stats.totalJobs > 0
                ? `${Math.round((stats.completedJobs / stats.totalJobs) * 100)}%`
                : '0%'}{' '}
              success rate
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Failed</span>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.failedJobs}</div>
            <div className="text-sm text-gray-500 mt-1">{stats.errorRate}% error rate</div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg Time</span>
              <Zap className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {(stats.avgProcessingTime / 1000).toFixed(1)}s
            </div>
            <div className="text-sm text-gray-500 mt-1">processing time</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Provider Health</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-3">
              {providerHealth.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No provider health data available</p>
              ) : (
                providerHealth.map((provider) => (
                  <div
                    key={`${provider.provider_name}-${provider.provider_type}`}
                    className={`border rounded-lg p-4 ${getStatusColor(provider.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(provider.status)}
                        <div>
                          <div className="font-medium">{provider.provider_name}</div>
                          <div className="text-xs opacity-75">
                            {provider.provider_type.toUpperCase()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {provider.response_time_ms && (
                          <div className="text-sm font-medium">
                            {provider.response_time_ms}ms
                          </div>
                        )}
                        <div className="text-xs opacity-75">
                          {provider.consecutive_failures > 0 && (
                            <span>{provider.consecutive_failures} failures</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {provider.error_message && (
                      <div className="mt-2 text-xs opacity-75">
                        {provider.error_message.substring(0, 100)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Errors</h2>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>

            <div className="space-y-3">
              {recentErrors.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600">No recent errors</p>
                </div>
              ) : (
                recentErrors.map((error) => (
                  <div
                    key={error.id}
                    className="border border-red-200 rounded-lg p-3 bg-red-50"
                  >
                    <div className="flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-900 line-clamp-2">
                          {error.message}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-red-700">
                          <span>{error.category}</span>
                          <span>{new Date(error.timestamp).toLocaleString()}</span>
                          {error.job_id && (
                            <span className="font-mono">{error.job_id.substring(0, 8)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <Activity className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Monitoring Active</h3>
              <p className="text-sm text-blue-800">
                This dashboard automatically refreshes every 30 seconds. All processing jobs are being
                monitored with comprehensive logging. Check the Logs page for detailed system logs
                and debugging information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
