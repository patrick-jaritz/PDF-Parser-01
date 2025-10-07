import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { offlineLogStorage } from '../lib/offlineLogStorage';
import { logSyncService } from '../lib/logSyncService';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Wifi, HardDrive, Activity } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'checking';
  message: string;
  details?: any;
}

export function DiagnosticDashboard() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageStats, setStorageStats] = useState({ total: 0, unsynced: 0 });
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);

  const runHealthChecks = async () => {
    setLoading(true);
    const results: HealthCheck[] = [];

    results.push({
      name: 'Database Connection',
      status: 'checking',
      message: 'Checking connection...',
    });

    setChecks([...results]);

    try {
      const { error: dbError } = await supabase.from('logs').select('count').limit(1);

      if (dbError) {
        results[0] = {
          name: 'Database Connection',
          status: 'down',
          message: `Failed to connect: ${dbError.message}`,
          details: dbError,
        };
      } else {
        results[0] = {
          name: 'Database Connection',
          status: 'healthy',
          message: 'Connected successfully',
        };
      }
    } catch (error) {
      results[0] = {
        name: 'Database Connection',
        status: 'down',
        message: 'Connection failed',
        details: error,
      };
    }

    results.push({
      name: 'Logs Table',
      status: 'checking',
      message: 'Checking logs table...',
    });
    setChecks([...results]);

    try {
      const { error: logsError } = await supabase
        .from('logs')
        .select('count')
        .limit(1);

      if (logsError) {
        results[1] = {
          name: 'Logs Table',
          status: 'down',
          message: `Error accessing logs: ${logsError.message}`,
          details: logsError,
        };
      } else {
        results[1] = {
          name: 'Logs Table',
          status: 'healthy',
          message: 'Logs table accessible',
        };
      }
    } catch (error) {
      results[1] = {
        name: 'Logs Table',
        status: 'down',
        message: 'Failed to query logs',
        details: error,
      };
    }

    results.push({
      name: 'Processing Jobs Table',
      status: 'checking',
      message: 'Checking jobs table...',
    });
    setChecks([...results]);

    try {
      const { error: jobsError } = await supabase
        .from('processing_jobs')
        .select('count')
        .limit(1);

      if (jobsError) {
        results[2] = {
          name: 'Processing Jobs Table',
          status: 'down',
          message: `Error accessing jobs: ${jobsError.message}`,
          details: jobsError,
        };
      } else {
        results[2] = {
          name: 'Processing Jobs Table',
          status: 'healthy',
          message: 'Jobs table accessible',
        };
      }
    } catch (error) {
      results[2] = {
        name: 'Processing Jobs Table',
        status: 'down',
        message: 'Failed to query jobs',
        details: error,
      };
    }

    results.push({
      name: 'IndexedDB Storage',
      status: 'checking',
      message: 'Checking offline storage...',
    });
    setChecks([...results]);

    try {
      await offlineLogStorage.initialize();
      const stats = await offlineLogStorage.getLogCount();
      setStorageStats(stats);

      results[3] = {
        name: 'IndexedDB Storage',
        status: 'healthy',
        message: `${stats.total} logs stored (${stats.unsynced} unsynced)`,
        details: stats,
      };
    } catch (error) {
      results[3] = {
        name: 'IndexedDB Storage',
        status: 'down',
        message: 'Offline storage unavailable',
        details: error,
      };
    }

    results.push({
      name: 'Authentication',
      status: 'checking',
      message: 'Checking auth status...',
    });
    setChecks([...results]);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        results[4] = {
          name: 'Authentication',
          status: 'down',
          message: `Auth error: ${authError.message}`,
          details: authError,
        };
      } else if (user) {
        results[4] = {
          name: 'Authentication',
          status: 'healthy',
          message: `Authenticated as ${user.email}`,
          details: { userId: user.id, email: user.email },
        };
      } else {
        results[4] = {
          name: 'Authentication',
          status: 'degraded',
          message: 'Not authenticated',
        };
      }
    } catch (error) {
      results[4] = {
        name: 'Authentication',
        status: 'down',
        message: 'Failed to check auth',
        details: error,
      };
    }

    setChecks(results);
    setLoading(false);
  };

  const syncOfflineLogs = async () => {
    const result = await logSyncService.syncLogs();
    alert(
      `Sync completed!\n\nSynced: ${result.synced}\nFailed: ${result.failed}\nSuccess: ${result.success}`
    );
    await runHealthChecks();
  };

  useEffect(() => {
    runHealthChecks();

    const handleOnline = () => setNetworkStatus(true);
    const handleOffline = () => setNetworkStatus(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusIcon = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200';
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200';
      case 'down':
        return 'bg-red-50 border-red-200';
      case 'checking':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const overallStatus = checks.every((c) => c.status === 'healthy')
    ? 'healthy'
    : checks.some((c) => c.status === 'down')
    ? 'down'
    : 'degraded';

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={runHealthChecks}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Run Checks
            </button>
          </div>

          <div className={`p-4 rounded-lg border-2 mb-6 ${getStatusColor(overallStatus)}`}>
            <div className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              <div>
                <h3 className="font-semibold text-gray-900">
                  Overall Status:{' '}
                  {overallStatus === 'healthy'
                    ? 'All Systems Operational'
                    : overallStatus === 'down'
                    ? 'Critical Issues Detected'
                    : 'Some Issues Detected'}
                </h3>
                <p className="text-sm text-gray-600">
                  {checks.filter((c) => c.status === 'healthy').length} of {checks.length} checks passing
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                {networkStatus ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <Wifi className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium text-gray-900">Network</span>
              </div>
              <p className="text-sm text-gray-600">
                {networkStatus ? 'Online' : 'Offline'}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-5 w-5 text-blue-500" />
                <span className="font-medium text-gray-900">Offline Logs</span>
              </div>
              <p className="text-sm text-gray-600">
                {storageStats.total} total ({storageStats.unsynced} unsynced)
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-5 w-5 text-purple-500" />
                <span className="font-medium text-gray-900">Database</span>
              </div>
              <p className="text-sm text-gray-600">
                {checks.find((c) => c.name === 'Database Connection')?.status === 'healthy'
                  ? 'Connected'
                  : 'Disconnected'}
              </p>
            </div>
          </div>

          {storageStats.unsynced > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-900">
                      {storageStats.unsynced} unsynced logs
                    </p>
                    <p className="text-sm text-yellow-700">
                      Click sync to upload offline logs to the database
                    </p>
                  </div>
                </div>
                <button
                  onClick={syncOfflineLogs}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Sync Now
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            <Activity className="inline h-5 w-5 mr-2" />
            Health Checks
          </h2>
          {checks.map((check, index) => (
            <div
              key={index}
              className={`bg-white rounded-lg border p-4 ${getStatusColor(check.status)}`}
            >
              <div className="flex items-start gap-3">
                {getStatusIcon(check.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{check.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                  {check.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        View Details
                      </summary>
                      <pre className="mt-2 text-xs bg-white p-2 rounded border border-gray-200 overflow-x-auto">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
