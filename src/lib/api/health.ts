import type { HealthResponse, ReadyResponse } from './contract';
import { isCompatible } from '@neronu/sport-core';
import { basketball } from '@neronu/sport-basketball';

export type ApiStatus =
  | { kind: 'ok'; apiVersion: string; localVersion: string }
  | { kind: 'mismatch'; apiVersion: string; localVersion: string }
  | { kind: 'offline'; message: string }
  /** API no ar, mas banco ou storage fora (ex.: Supabase pausado por inatividade). */
  | { kind: 'degraded'; db: ReadyResponse['db']; storage: ReadyResponse['storage'] };

/** Compara a versão do módulo de basquete da API com a que o front usa (mesmo major = compatível). */
export function compareModule(health: HealthResponse): ApiStatus {
  const localVersion = basketball.version;
  const apiVersion = health.sportModules[basketball.key];
  if (!apiVersion) return { kind: 'mismatch', apiVersion: 'ausente', localVersion };
  return isCompatible(apiVersion, localVersion)
    ? { kind: 'ok', apiVersion, localVersion }
    : { kind: 'mismatch', apiVersion, localVersion };
}

/**
 * Usa `/health/ready` (E12), que confere banco e storage além do módulo; 503 = degradado.
 * API antiga sem essa rota (404) cai para `/health`.
 */
export async function fetchApiStatus(baseUrl: string, signal?: AbortSignal): Promise<ApiStatus> {
  try {
    let res = await fetch(`${baseUrl}/health/ready`, { signal });
    if (res.status === 404) res = await fetch(`${baseUrl}/health`, { signal });
    const body = (await res.json().catch(() => null)) as Partial<ReadyResponse> | null;
    if (res.status === 503 && body?.db && body.storage)
      return { kind: 'degraded', db: body.db, storage: body.storage };
    if (!res.ok || !body) return { kind: 'offline', message: `HTTP ${res.status}` };
    return compareModule(body as HealthResponse);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { kind: 'offline', message: err instanceof Error ? err.message : String(err) };
  }
}
