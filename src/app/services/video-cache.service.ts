import { Injectable } from '@angular/core';

/**
 * Caché persistente de videos en IndexedDB.
 *
 * Por qué IndexedDB y no localStorage:
 *  - localStorage tiene tope ~5 MB y guarda solo strings (forzaría a base64
 *    inflando el tamaño 33% y siendo lentísimo de leer).
 *  - IndexedDB guarda Blobs nativos, sin límite estricto (browser permite GB)
 *    y devuelve referencias que se convierten en URLs blob: directamente.
 *
 * Funcionamiento:
 *  1. `resolve(url)` devuelve un blob: URL local si el video ya está en caché,
 *     o la URL remota original si todavía no lo descargamos.
 *  2. `cacheVideo(url)` descarga el video en background, lo guarda y deja
 *     listo el blob: URL para el siguiente acceso.
 *  3. `pruneStale(activeUrls)` borra videos que ya no están en la playlist
 *     activa (evita llenar disco indefinidamente).
 */

interface CachedVideo {
  url: string;       // URL remota original — clave primaria
  blob: Blob;        // contenido
  size: number;      // bytes (para logs)
  cachedAt: number;  // timestamp ms
}

const DB_NAME = 'totem-video-cache';
const STORE = 'videos';
const DB_VERSION = 1;

@Injectable({ providedIn: 'root' })
export class VideoCacheService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  /** blob: URLs creadas en esta sesión — para revocarlas al limpiar. */
  private liveBlobUrls = new Map<string, string>();

  /** Abre (y crea si hace falta) la base IndexedDB. */
  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'url' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  /**
   * Resuelve una URL remota a una URL local (blob:) si ya está cacheada,
   * o devuelve la URL original si todavía no.
   * Nunca lanza: ante cualquier error retorna la URL original.
   */
  async resolve(remoteUrl: string): Promise<string> {
    if (!remoteUrl) return remoteUrl;
    if (this.liveBlobUrls.has(remoteUrl)) {
      return this.liveBlobUrls.get(remoteUrl)!;
    }
    try {
      const cached = await this.read(remoteUrl);
      if (cached) {
        const blobUrl = URL.createObjectURL(cached.blob);
        this.liveBlobUrls.set(remoteUrl, blobUrl);
        return blobUrl;
      }
    } catch (err) {
      console.warn('[VideoCache] resolve falló para', remoteUrl, err);
    }
    return remoteUrl;
  }

  /** Descarga y guarda un video. Idempotente — si ya existe, retorna su blob. */
  async cacheVideo(remoteUrl: string): Promise<Blob | null> {
    if (!remoteUrl) return null;
    try {
      const existing = await this.read(remoteUrl);
      if (existing) return existing.blob;

      console.log('[VideoCache] descargando', remoteUrl);
      const res = await fetch(remoteUrl);
      if (!res.ok) {
        console.warn('[VideoCache] descarga falló', res.status, remoteUrl);
        return null;
      }
      const blob = await res.blob();
      await this.write({
        url: remoteUrl,
        blob,
        size: blob.size,
        cachedAt: Date.now(),
      });
      console.log(`[VideoCache] guardado ${(blob.size / 1024 / 1024).toFixed(2)} MB`);
      return blob;
    } catch (err) {
      console.warn('[VideoCache] cacheVideo error', remoteUrl, err);
      return null;
    }
  }

  /**
   * Descarga en background todos los videos que falten. No bloquea.
   * Retorna una promesa que se resuelve cuando todos terminen (útil para tests).
   */
  cacheAll(urls: string[]): Promise<void> {
    const unique = Array.from(new Set(urls.filter(Boolean)));
    return Promise.all(unique.map((u) => this.cacheVideo(u))).then(() => undefined);
  }

  /**
   * Elimina del caché los videos cuya URL no esté en `activeUrls`.
   * También revoca blob: URLs vivas asociadas.
   */
  async pruneStale(activeUrls: string[]): Promise<void> {
    const keep = new Set(activeUrls.filter(Boolean));
    try {
      const all = await this.readAll();
      const toRemove = all.filter((v) => !keep.has(v.url));
      if (toRemove.length === 0) return;

      const db = await this.openDB();
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const v of toRemove) {
        store.delete(v.url);
        const blobUrl = this.liveBlobUrls.get(v.url);
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
          this.liveBlobUrls.delete(v.url);
        }
      }
      await txDone(tx);
      console.log(`[VideoCache] prune: ${toRemove.length} video(s) eliminado(s)`);
    } catch (err) {
      console.warn('[VideoCache] prune error', err);
    }
  }

  /** Tamaño total del caché en MB (para diagnóstico). */
  async totalSizeMB(): Promise<number> {
    try {
      const all = await this.readAll();
      const bytes = all.reduce((acc, v) => acc + (v.size || 0), 0);
      return +(bytes / 1024 / 1024).toFixed(2);
    } catch {
      return 0;
    }
  }

  // ============================ helpers IDB ============================

  private async read(url: string): Promise<CachedVideo | null> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  private async write(entry: CachedVideo): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async readAll(): Promise<CachedVideo[]> {
    const db = await this.openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
