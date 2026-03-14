type CacheEntry = {
  key: string;
  data: unknown;
  timestamp: number;
};

type QueueEntry = {
  id?: number;
  method: string;
  url: string;
  data?: unknown;
  params?: Record<string, unknown>;
  createdAt: number;
};

const DB_NAME = "albc-offline";
const DB_VERSION = 1;
const CACHE_STORE = "cache";
const QUEUE_STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    fn(store);
    tx.oncomplete = () => resolve(undefined as T);
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheSet(key: string, data: unknown) {
  const entry: CacheEntry = { key, data, timestamp: Date.now() };
  await withStore(CACHE_STORE, "readwrite", (store) => {
    store.put(entry);
  });
}

export async function cacheGet<T = unknown>(key: string): Promise<T | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, "readonly");
    const store = tx.objectStore(CACHE_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result?.data ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function queueRequest(entry: QueueEntry) {
  await withStore(QUEUE_STORE, "readwrite", (store) => {
    store.add(entry);
  });
}

export async function readQueue(): Promise<QueueEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const store = tx.objectStore(QUEUE_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as QueueEntry[]);
    request.onerror = () => reject(request.error);
  });
}

export async function removeQueueItem(id: number) {
  await withStore(QUEUE_STORE, "readwrite", (store) => {
    store.delete(id);
  });
}

export function buildCacheKey(url?: string, params?: Record<string, unknown>) {
  const base = url || "";
  if (!params || Object.keys(params).length === 0) {
    return base;
  }
  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .sort()
    .join("&");
  return `${base}?${query}`;
}

export async function processQueue(baseURL: string): Promise<number> {
  const queue = await readQueue();
  if (queue.length === 0) return 0;

  let processed = 0;
  for (const entry of queue) {
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const url = `${baseURL}${entry.url}`;
      const response = await fetch(url, {
        method: entry.method.toUpperCase(),
        headers,
        body: entry.data ? JSON.stringify(entry.data) : undefined,
      });

      if (!response.ok) {
        continue;
      }

      if (entry.id) {
        await removeQueueItem(entry.id);
      }
      processed += 1;
    } catch {
      // keep queued for next attempt
    }
  }

  return processed;
}
