import { Injectable } from '@angular/core';

export interface StoredReceiptBlob {
  id: string;
  dataUrl: string;
  fileName: string;
  mimeType: string;
  savedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReceiptFileStoreService {
  private readonly dbName = 'udsm-receipt-files-db';
  private readonly storeName = 'receipts';
  private readonly memoryCache = new Map<string, StoredReceiptBlob>();
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private openDb(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('IndexedDB unavailable for receipt storage:', req.error);
          resolve(null);
        };
      } catch (err) {
        console.warn('IndexedDB open error:', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  detectMimeType(dataUrl?: string, fileName?: string): string {
    if (dataUrl && dataUrl.startsWith('data:')) {
      const semi = dataUrl.indexOf(';');
      const comma = dataUrl.indexOf(',');
      const end = semi !== -1 && (comma === -1 || semi < comma) ? semi : comma;
      if (end > 5) {
        const headerMime = dataUrl.substring(5, end).trim().toLowerCase();
        if (headerMime && headerMime !== 'application/octet-stream' && headerMime !== 'binary/octet-stream') {
          return headerMime;
        }
      }
    }

    // Inspect base64 magic bytes if present
    if (dataUrl) {
      const payload = dataUrl.includes(',') ? dataUrl.substring(dataUrl.indexOf(',') + 1, dataUrl.indexOf(',') + 32).trim() : dataUrl.substring(0, 32).trim();
      if (payload.startsWith('JVBERi0')) return 'application/pdf';
      if (payload.startsWith('iVBORw0KGgo')) return 'image/png';
      if (payload.startsWith('/9j/')) return 'image/jpeg';
      if (payload.startsWith('UklGR')) return 'image/webp';
      if (payload.startsWith('R0lGOD')) return 'image/gif';
    }

    const lower = (fileName || '').toLowerCase();
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    return 'application/octet-stream';
  }

  isPdf(dataUrl?: string, fileName?: string, mimeType?: string): boolean {
    const mime = (mimeType || this.detectMimeType(dataUrl, fileName)).toLowerCase();
    return mime === 'application/pdf' || (fileName || '').toLowerCase().endsWith('.pdf');
  }

  isImage(dataUrl?: string, fileName?: string, mimeType?: string): boolean {
    if (this.isPdf(dataUrl, fileName, mimeType)) return false;
    const mime = (mimeType || this.detectMimeType(dataUrl, fileName)).toLowerCase();
    if (mime.startsWith('image/')) return true;
    const lower = (fileName || '').toLowerCase();
    return /\.(png|jpe?g|webp|gif|bmp)$/i.test(lower);
  }

  async saveReceipt(id: string, dataUrl: string, fileName = 'Receipt'): Promise<void> {
    if (!id || !dataUrl || dataUrl === 'IMAGE_TOO_LARGE_PLACEHOLDER' || dataUrl.startsWith('IDB:')) {
      return;
    }

    const record: StoredReceiptBlob = {
      id,
      dataUrl,
      fileName,
      mimeType: this.detectMimeType(dataUrl, fileName),
      savedAt: new Date().toISOString()
    };

    this.memoryCache.set(id, record);

    const db = await this.openDb();
    if (!db) return;

    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        store.put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  getCachedDataUrl(id: string): string | null {
    return this.memoryCache.get(id)?.dataUrl ?? null;
  }

  async resolveDataUrl(rawData?: string, explicitStorageId?: string): Promise<string | null> {
    if (!rawData && !explicitStorageId) return null;

    if (rawData && rawData !== 'IMAGE_TOO_LARGE_PLACEHOLDER' && !rawData.startsWith('IDB:')) {
      if (rawData.startsWith('data:') || rawData.startsWith('http') || rawData.startsWith('/') || rawData.startsWith('blob:')) {
        return rawData;
      }
      const detectedMime = this.detectMimeType(rawData);
      const safeMime = detectedMime === 'application/octet-stream' ? 'image/jpeg' : detectedMime;
      return `data:${safeMime};base64,${rawData}`;
    }

    const id = explicitStorageId || (rawData?.startsWith('IDB:') ? rawData.substring(4) : '');
    if (!id) return null;

    const cached = this.memoryCache.get(id);
    if (cached?.dataUrl) {
      return cached.dataUrl;
    }

    const db = await this.openDb();
    if (!db) return null;

    return new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const rec = getReq.result as StoredReceiptBlob | undefined;
          if (rec?.dataUrl) {
            this.memoryCache.set(id, rec);
            resolve(rec.dataUrl);
          } else {
            resolve(null);
          }
        };
        getReq.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  dataUrlToBlobUrl(dataUrl: string, fileName?: string): string | null {
    if (!dataUrl || dataUrl === 'IMAGE_TOO_LARGE_PLACEHOLDER') return null;
    if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http') || dataUrl.startsWith('/')) {
      return dataUrl;
    }

    try {
      const mime = this.detectMimeType(dataUrl, fileName);
      let base64 = dataUrl;
      if (dataUrl.startsWith('data:')) {
        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx === -1) return null;
        base64 = dataUrl.substring(commaIdx + 1);
      }

      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: mime });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.error('Error converting receipt dataUrl to Blob URL:', err);
      return dataUrl.startsWith('data:') ? dataUrl : null;
    }
  }
}
