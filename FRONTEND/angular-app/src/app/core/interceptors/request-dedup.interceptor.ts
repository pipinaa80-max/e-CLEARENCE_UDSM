import { HttpEvent, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';

interface CachedResponseEntry {
  response: HttpResponse<unknown>;
  expiresAt: number;
  url: string;
}

const inFlightGetRequests = new Map<string, Observable<HttpEvent<unknown>>>();
const inFlightMutationRequests = new Map<string, Observable<HttpEvent<unknown>>>();
const responseCache = new Map<string, CachedResponseEntry>();

const SKIP_CACHE_HEADER = 'X-Skip-Dedup-Cache';

function computeBodyFingerprint(body: unknown): string {
  if (body === null || body === undefined) return '';
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const parts: string[] = [];
    body.forEach((value, key) => {
      if (typeof File !== 'undefined' && value instanceof File) {
        parts.push(`${key}=file:${value.name}:${value.size}:${value.lastModified}`);
      } else {
        parts.push(`${key}=${String(value).slice(0, 64)}`);
      }
    });
    return `fd:${parts.sort().join('|')}`;
  }
  if (typeof body === 'string') return body.slice(0, 512);
  try {
    return JSON.stringify(body).slice(0, 512);
  } catch {
    return String(body).slice(0, 128);
  }
}

/**
 * Clear cached GET responses (e.g. on logout, login, or account switch).
 * Optionally scope invalidation to URLs matching a substring prefix.
 */
export function clearRequestDedupCache(urlFragment?: string): void {
  if (!urlFragment) {
    responseCache.clear();
    return;
  }
  const needle = urlFragment.toLowerCase();
  for (const [key, entry] of responseCache.entries()) {
    if (entry.url.toLowerCase().includes(needle)) {
      responseCache.delete(key);
    }
  }
}

function getAuthFingerprint(authHeader: string | null): string {
  if (!authHeader) return 'anon';
  // Use last 16 chars of token signature as compact per-session key
  return authHeader.length > 16 ? authHeader.slice(-16) : authHeader;
}

function isBinaryOrDownloadUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('/download') ||
    lower.includes('/certificate/') ||
    lower.includes('/my-certificate') ||
    lower.includes('/export/') ||
    lower.includes('/qr/generate')
  );
}

/**
 * Endpoint-tuned short TTL (ms) to eliminate duplicate burst fetches across
 * route guards, shared headers, and parallel component mounts while keeping
 * live operational queues fresh.
 */
function resolveTtlMs(url: string): number {
  const lower = url.toLowerCase();

  // Static / slow-changing reference catalogs (60s)
  if (
    lower.includes('/colleges') ||
    lower.includes('/sponsors') ||
    lower.includes('/collection-stations') ||
    lower.includes('/control-plane/public/branding') ||
    lower.includes('/control-plane/branding/current') ||
    lower.includes('/admin/roles')
  ) {
    return 60_000;
  }

  // Auth profile — eliminates roleGuard + component ngOnInit double fetch (15s)
  if (lower.includes('/auth/profile')) {
    return 15_000;
  }

  // Notifications & unread badge — eliminates header + dashboard + focus duplicates (10s)
  if (lower.includes('/notifications')) {
    return 10_000;
  }

  // All other API GET endpoints — 3s burst-deduplication window
  return 3_000;
}

/**
 * Extract the API resource prefix (e.g. "/api/v1/clearance") so any mutation
 * automatically invalidates related cached GET entries immediately.
 */
function extractResourceGroup(url: string): string | null {
  const match = url.match(/(\/api\/v1\/[^/?#]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function invalidateRelatedCachesForMutation(url: string): void {
  const lower = url.toLowerCase();

  // Auth transitions invalidate everything
  if (
    lower.includes('/auth/login') ||
    lower.includes('/auth/logout') ||
    lower.includes('/auth/refresh') ||
    lower.includes('/superuser/login')
  ) {
    clearRequestDedupCache();
    return;
  }

  const group = extractResourceGroup(url);
  if (group) {
    clearRequestDedupCache(group);
  }

  // Cross-resource invalidations so related dashboards refresh immediately
  if (lower.includes('/clearance') || lower.includes('/convocation') || lower.includes('/student-debts')) {
    clearRequestDedupCache('/clearance');
    clearRequestDedupCache('/analytics');
    clearRequestDedupCache('/notifications');
    clearRequestDedupCache('/student-debts');
    clearRequestDedupCache('/admin/clearance-requests');
  } else if (lower.includes('/transcript-payments') || lower.includes('/dus-secretary') || lower.includes('/documents')) {
    clearRequestDedupCache('/transcript-payments');
    clearRequestDedupCache('/dus-secretary');
    clearRequestDedupCache('/documents');
    clearRequestDedupCache('/notifications');
  } else if (lower.includes('/admin/users') || lower.includes('/auth/activate') || lower.includes('/auth/deactivate')) {
    clearRequestDedupCache('/admin/users');
    clearRequestDedupCache('/analytics');
    clearRequestDedupCache('/clearance/analytics-summary');
  }
}

/**
 * Global HTTP Request Deduplication & Coalescing Interceptor:
 * 1. Coalesces concurrent identical GET requests across ALL backend endpoints
 *    so only a single network call fires.
 * 2. Serves short-TTL cached responses for burst/navigation duplicates
 *    (e.g. roleGuard + component ngOnInit, or header + page init).
 * 3. Immediately invalidates related caches whenever any mutation
 *    (POST/PUT/PATCH/DELETE) is executed.
 */
export const requestDedupInterceptor: HttpInterceptorFn = (req, next) => {
  const skipCache = req.headers.has(SKIP_CACHE_HEADER);
  const cleanReq = skipCache ? req.clone({ headers: req.headers.delete(SKIP_CACHE_HEADER) }) : req;

  // Mutations: coalesce identical concurrent in-flight submits (prevents double-click
  // duplicate POST/PUT/PATCH/DELETE on login, approve, reject, create, etc.) and
  // immediately invalidate related GET caches.
  if (cleanReq.method !== 'GET') {
    const authKey = getAuthFingerprint(cleanReq.headers.get('Authorization'));
    const mutationKey = `${cleanReq.method}::${authKey}::${cleanReq.urlWithParams}::${computeBodyFingerprint(cleanReq.body)}`;

    if (!skipCache) {
      const existingMutation = inFlightMutationRequests.get(mutationKey);
      if (existingMutation) {
        return existingMutation;
      }
    }

    invalidateRelatedCachesForMutation(cleanReq.urlWithParams);

    const sharedMutation$ = next(cleanReq).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          invalidateRelatedCachesForMutation(cleanReq.urlWithParams);
        }
      }),
      finalize(() => {
        inFlightMutationRequests.delete(mutationKey);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    if (!skipCache) {
      inFlightMutationRequests.set(mutationKey, sharedMutation$);
    }

    return sharedMutation$;
  }

  // Never cache binary downloads or non-JSON response types
  if (cleanReq.responseType !== 'json' || isBinaryOrDownloadUrl(cleanReq.urlWithParams)) {
    return next(cleanReq);
  }

  const authKey = getAuthFingerprint(cleanReq.headers.get('Authorization'));
  const cacheKey = `GET::${authKey}::${cleanReq.urlWithParams}`;

  if (!skipCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return of(cached.response.clone());
    }
    if (cached) {
      responseCache.delete(cacheKey);
    }

    const inFlight = inFlightGetRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const ttlMs = resolveTtlMs(cleanReq.urlWithParams);

  const shared$ = next(cleanReq).pipe(
    tap((event) => {
      if (event instanceof HttpResponse && event.status >= 200 && event.status < 300) {
        responseCache.set(cacheKey, {
          response: event.clone(),
          expiresAt: Date.now() + ttlMs,
          url: cleanReq.urlWithParams
        });
      }
    }),
    finalize(() => {
      inFlightGetRequests.delete(cacheKey);
    }),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  if (!skipCache) {
    inFlightGetRequests.set(cacheKey, shared$);
  }

  return shared$;
};
