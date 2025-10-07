const DB_NAME = 'AppLogsDB';
const DB_VERSION = 2; // Incremented to migrate boolean to number
const STORE_NAME = 'offline_logs';

interface OfflineLog {
  id?: number;
  timestamp: string;
  severity: string;
  category: string;
  message: string;
  context?: any;
  error_details?: any;
  user_id?: string | null;
  job_id?: string | null;
  document_id?: string | null;
  request_id?: string | null;
  synced: boolean;
}

class OfflineLogStorage {
  private db: IDBDatabase | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = (event as any).oldVersion;
        const transaction = (event.target as IDBOpenDBRequest).transaction!;

        // Version 1: Initial schema
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('synced', 'synced', { unique: false });
            store.createIndex('severity', 'severity', { unique: false });
          }
        }

        // Version 2: Migrate boolean synced values to numbers
        if (oldVersion < 2 && db.objectStoreNames.contains(STORE_NAME)) {
          const store = transaction.objectStore(STORE_NAME);
          const cursorRequest = store.openCursor();

          cursorRequest.onsuccess = (cursorEvent) => {
            const cursor = (cursorEvent.target as IDBRequest<IDBCursorWithValue>).result;
            if (cursor) {
              const log = cursor.value;
              // Convert boolean to number
              if (typeof log.synced === 'boolean') {
                log.synced = log.synced ? 1 : 0;
                cursor.update(log);
              }
              cursor.continue();
            }
          };
        }
      };
    });

    return this.initPromise;
  }

  async addLog(log: Omit<OfflineLog, 'id' | 'synced'>): Promise<void> {
    await this.initialize();

    if (!this.db) {
      console.error('Database not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const logWithMeta: any = {
        ...log,
        synced: 0, // Use 0 instead of false for IndexedDB compatibility
      };

      const request = store.add(logWithMeta);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to add log to IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  async getUnsyncedLogs(limit: number = 50): Promise<OfflineLog[]> {
    await this.initialize();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('synced');
      // Use 0 instead of false for IDBKeyRange (0 = false, 1 = true)
      const request = index.getAll(IDBKeyRange.only(0), limit);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        console.error('Failed to get unsynced logs:', request.error);
        reject(request.error);
      };
    });
  }

  async markAsSynced(ids: number[]): Promise<void> {
    await this.initialize();

    if (!this.db || ids.length === 0) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      let completed = 0;
      let hasError = false;

      ids.forEach(id => {
        const getRequest = store.get(id);

        getRequest.onsuccess = () => {
          const log = getRequest.result;
          if (log) {
            log.synced = 1; // Use 1 instead of true for IndexedDB compatibility
            const updateRequest = store.put(log);

            updateRequest.onsuccess = () => {
              completed++;
              if (completed === ids.length && !hasError) {
                resolve();
              }
            };

            updateRequest.onerror = () => {
              hasError = true;
              console.error('Failed to update log:', updateRequest.error);
              reject(updateRequest.error);
            };
          }
        };

        getRequest.onerror = () => {
          hasError = true;
          console.error('Failed to get log:', getRequest.error);
          reject(getRequest.error);
        };
      });
    });
  }

  async getAllLogs(limit: number = 100): Promise<OfflineLog[]> {
    await this.initialize();

    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev');

      const logs: OfflineLog[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && count < limit) {
          logs.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(logs);
        }
      };

      request.onerror = () => {
        console.error('Failed to get logs:', request.error);
        reject(request.error);
      };
    });
  }

  async clearOldLogs(daysToKeep: number = 7): Promise<void> {
    await this.initialize();

    if (!this.db) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffTimestamp = cutoffDate.toISOString();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTimestamp));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const log = cursor.value;
          // Check if synced (1 = true, 0 = false)
          if (log.synced === 1) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => {
        console.error('Failed to clear old logs:', request.error);
        reject(request.error);
      };
    });
  }

  async getLogCount(): Promise<{ total: number; unsynced: number }> {
    await this.initialize();

    if (!this.db) return { total: 0, unsynced: 0 };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      const totalRequest = store.count();
      const unsyncedIndex = store.index('synced');
      // Use 0 instead of false for IDBKeyRange (0 = false, 1 = true)
      const unsyncedRequest = unsyncedIndex.count(IDBKeyRange.only(0));

      let total = 0;
      let unsynced = 0;
      let completed = 0;

      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          resolve({ total, unsynced });
        }
      };

      totalRequest.onsuccess = () => {
        total = totalRequest.result;
        checkComplete();
      };

      unsyncedRequest.onsuccess = () => {
        unsynced = unsyncedRequest.result;
        checkComplete();
      };

      totalRequest.onerror = () => {
        console.error('Failed to count logs:', totalRequest.error);
        reject(totalRequest.error);
      };

      unsyncedRequest.onerror = () => {
        console.error('Failed to count unsynced logs:', unsyncedRequest.error);
        reject(unsyncedRequest.error);
      };
    });
  }
}

export const offlineLogStorage = new OfflineLogStorage();
