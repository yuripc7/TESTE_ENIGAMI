/**
 * Robust, lightweight, native IndexedDB helper utilities.
 * Used to store large JSON databases, Base64 files, and images without browser storage limits (replaces localStorage).
 */

const DB_NAME = 'EnigamiOfflineDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'system_state';

export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

export async function getIndexedDBItem<T>(key: string): Promise<T | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error || new Error('IndexedDB get item failed'));
      };
    });
  } catch (err) {
    console.error('Error reading from IndexedDB:', err);
    return null;
  }
}

export async function setIndexedDBItem<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error || new Error('IndexedDB set item failed'));
      };
    });
  } catch (err) {
    console.error('Error writing to IndexedDB:', err);
  }
}

export async function removeIndexedDBItem(key: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error || new Error('IndexedDB delete item failed'));
      };
    });
  } catch (err) {
    console.error('Error deleting from IndexedDB:', err);
  }
}
