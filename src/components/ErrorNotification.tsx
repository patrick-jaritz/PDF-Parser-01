import { useEffect, useState } from 'react';
import { AlertCircle, X, Wifi, WifiOff } from 'lucide-react';
import { logSyncService } from '../lib/logSyncService';

interface ErrorNotificationProps {
  message?: string;
  type?: 'error' | 'warning' | 'info' | 'offline';
  autoHide?: boolean;
  duration?: number;
  onClose?: () => void;
}

export function ErrorNotification({
  message,
  type = 'error',
  autoHide = true,
  duration = 5000,
  onClose,
}: ErrorNotificationProps) {
  const [visible, setVisible] = useState(!!message);

  useEffect(() => {
    if (message) {
      setVisible(true);

      if (autoHide && type !== 'offline') {
        const timer = setTimeout(() => {
          setVisible(false);
          onClose?.();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [message, autoHide, duration, type, onClose]);

  if (!visible || !message) return null;

  const colors = {
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    offline: 'bg-gray-50 border-gray-200 text-gray-800',
  };

  const icons = {
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />,
    info: <AlertCircle className="h-5 w-5 text-blue-500" />,
    offline: <WifiOff className="h-5 w-5 text-gray-500" />,
  };

  return (
    <div
      className={`fixed top-4 right-4 max-w-md w-full border rounded-lg shadow-lg p-4 ${colors[type]} z-50 animate-slide-in`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">{icons[type]}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            onClose?.();
          }}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    const updateSyncStatus = async () => {
      const stats = await logSyncService.getStorageStats();
      setUnsyncedCount(stats.unsynced);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    const interval = setInterval(updateSyncStatus, 5000);
    updateSyncStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, []);

  if (isOnline && unsyncedCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOnline ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-white rounded-lg shadow-lg">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline</span>
          {unsyncedCount > 0 && (
            <span className="px-2 py-0.5 bg-yellow-500 text-yellow-900 text-xs font-semibold rounded">
              {unsyncedCount} unsynced
            </span>
          )}
        </div>
      ) : (
        unsyncedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-800 text-white rounded-lg shadow-lg">
            <Wifi className="h-4 w-4 animate-pulse" />
            <span className="text-sm font-medium">Syncing {unsyncedCount} logs...</span>
          </div>
        )
      )}
    </div>
  );
}
