import { supabase } from './supabase';
import { offlineLogStorage } from './offlineLogStorage';

class LogSyncService {
  private isSyncing = false;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = navigator.onLine;

  initialize() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    if (this.isOnline) {
      this.startAutoSync();
    }
  }

  cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.stopAutoSync();
  }

  private handleOnline = () => {
    console.log('Network connection restored - starting log sync');
    this.isOnline = true;
    this.syncLogs();
    this.startAutoSync();
  };

  private handleOffline = () => {
    console.log('Network connection lost - pausing log sync');
    this.isOnline = false;
    this.stopAutoSync();
  };

  private startAutoSync() {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.syncLogs();
    }, 30000);
  }

  private stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncLogs(): Promise<{ success: boolean; synced: number; failed: number }> {
    if (this.isSyncing || !this.isOnline) {
      return { success: false, synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const unsyncedLogs = await offlineLogStorage.getUnsyncedLogs(50);

      if (unsyncedLogs.length === 0) {
        return { success: true, synced: 0, failed: 0 };
      }

      console.log(`Syncing ${unsyncedLogs.length} offline logs to database...`);

      const syncedIds: number[] = [];

      for (const log of unsyncedLogs) {
        try {
          // Validate UUIDs - only include if they're valid UUIDs
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const validJobId = log.job_id && uuidRegex.test(log.job_id) ? log.job_id : null;
          const validDocId = log.document_id && uuidRegex.test(log.document_id) ? log.document_id : null;
          const validUserId = log.user_id && uuidRegex.test(log.user_id) ? log.user_id : null;

          // Validate category - only allow categories defined in database schema
          const validCategories = ['ocr', 'llm', 'upload', 'database', 'api', 'system', 'auth', 'storage'];
          const validCategory = validCategories.includes(log.category) ? log.category : 'system';
          
          // Validate severity
          const validSeverities = ['debug', 'info', 'warning', 'error', 'critical'];
          const validSeverity = validSeverities.includes(log.severity) ? log.severity : 'info';

          const { error } = await supabase.from('logs').insert({
            severity: validSeverity as any,
            category: validCategory as any,
            message: log.message,
            context: log.context || {},
            error_details: log.error_details || null,
            user_id: validUserId,
            job_id: validJobId,
            document_id: validDocId,
            request_id: log.request_id || null,
            timestamp: log.timestamp,
          });

          if (error) {
            // Check if it's a validation error (400) - mark as synced to avoid retry loop
            if (error.code === '23503' || error.code === '22P02' || error.code === '23514') {
              // 23503: Foreign key violation
              // 22P02: Invalid UUID format
              // 23514: Check constraint violation (invalid category/severity)
              // Mark as synced to prevent infinite retry
              syncedIds.push(log.id!);
              console.debug('Skipping log with validation error:', error.message);
            } else {
              console.error('Failed to sync log:', error);
              failedCount++;
            }
          } else {
            syncedIds.push(log.id!);
            syncedCount++;
          }
        } catch (err) {
          // For other errors, still mark as synced if it's a validation issue
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.includes('foreign key') || errorMsg.includes('invalid input syntax')) {
            syncedIds.push(log.id!);
            console.debug('Skipping log with validation error:', errorMsg);
          } else {
            console.error('Error syncing individual log:', err);
            failedCount++;
          }
        }
      }

      if (syncedIds.length > 0) {
        await offlineLogStorage.markAsSynced(syncedIds);
        console.log(`Successfully synced ${syncedCount} logs`);
      }

      await offlineLogStorage.clearOldLogs(7);

      return {
        success: failedCount === 0,
        synced: syncedCount,
        failed: failedCount,
      };
    } catch (error) {
      console.error('Log sync failed:', error);
      return { success: false, synced: syncedCount, failed: failedCount };
    } finally {
      this.isSyncing = false;
    }
  }

  async getStorageStats() {
    return await offlineLogStorage.getLogCount();
  }

  isCurrentlyOnline() {
    return this.isOnline;
  }

  isSyncInProgress() {
    return this.isSyncing;
  }
}

export const logSyncService = new LogSyncService();
