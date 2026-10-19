import type { PhotoEntry } from '../types';

const DB_NAME = 'evolve_fitness_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'media_entries';

/**
 * Opens or initializes the IndexedDB store for progress photos and videos.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Loads all photo and video entries stored in IndexedDB, sorted by date descending.
 */
export async function loadAllMediaEntries(): Promise<PhotoEntry[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result || []) as PhotoEntry[];
        // Sort newest first
        results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Fallback: unable to load from IndexedDB, checking localStorage', error);
    try {
      const fallback = localStorage.getItem('evolve_media_entries_fallback');
      if (fallback) return JSON.parse(fallback);
    } catch {}
    return [];
  }
}

/**
 * Saves a single photo or video entry to IndexedDB.
 */
export async function saveMediaEntry(entry: PhotoEntry): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Fallback: unable to save to IndexedDB', error);
  }
}

/**
 * Deletes a media entry by ID from IndexedDB.
 */
export async function deleteMediaEntry(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('Fallback: unable to delete from IndexedDB', error);
  }
}

/**
 * Extracts a representative frame as image thumbnail and calculates the video duration.
 */
export function generateVideoThumbnailAndDuration(
  file: File
): Promise<{ thumbnailUrl: string; durationSec: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const cleanUp = () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      const durationSec = Math.round(video.duration || 0);
      // Seek to 0.5s or 25% of duration to avoid black initial frame
      const targetTime = Math.min(Math.max(0.5, video.duration * 0.25), Math.max(0.1, video.duration - 0.1));
      video.currentTime = targetTime;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 640;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
          const durationSec = Math.round(video.duration || 0);
          cleanUp();
          resolve({ thumbnailUrl, durationSec });
          return;
        }
      } catch (e) {
        console.warn('Error extracting video thumbnail:', e);
      }
      cleanUp();
      resolve({ thumbnailUrl: '', durationSec: Math.round(video.duration || 0) });
    };

    video.onerror = () => {
      cleanUp();
      resolve({ thumbnailUrl: '', durationSec: 0 });
    };
  });
}

/**
 * Formats seconds into MM:SS format (e.g. 15 -> '0:15', 72 -> '1:12')
 */
export function formatDuration(sec?: number): string {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
