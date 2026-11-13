import type { HealthResponse, ReadyResponse } from './contract';
import { isCompatible } from '@neronu/sport-core';
import { DEFAULT_SPORT, SPORTS } from '../sports';

export type ApiStatus =
  | { kind: 'ok'; apiVersion: string; localVersion: string }
  | { kind: 'mismatch'; sport: string; apiVersion: string; localVersion: string }
  | { kind: 'offline'; message: string }
  /**
   * API no ar, mas banco ou storage fora (ex.: Supabase pausado por inatividade) ou banco sem
   * migrações desta versão da API.
   */
  | {
      kind: 'degraded';
      db: ReadyResponse['db'];
      storage: ReadyResponse['storage'];
      migrations: NonNullable<ReadyResponse['migrations']>;
    };

/**
 * Compara a versão de cada módulo de esporte da API com a que o front usa (mesmo major =
 * compatível). O esporte padrão precisa existir na API; os demais só são conferidos quando a API
 * os publica (API antiga sem um esporte novo continua servindo os outros).
 */
export function compareModule(health: HealthResponse): ApiStatus {
  for (const sport of SPORTS) {
    const localVersion = sport.module.version;
    const apiVersion = health.sportModules[sport.key];
    if (!apiVersion) {
      if (sport === DEFAULT_SPORT)
        return { kind: 'mismatch', sport: sport.name, apiVersion: 'ausente', localVersion };
      continue;
    }
    if (!isCompatible(apiVersion, localVersion))
      return { kind: 'mismatch', sport: sport.name, apiVersion, localVersion };
  }
  return {
    kind: 'ok',
    apiVersion: health.sportModules[DEFAULT_SPORT.key]!,
    localVersion: DEFAULT_SPORT.module.version,
  };
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
      return {
        kind: 'degraded',
        db: body.db,
        storage: body.storage,
        migrations: body.migrations ?? 'ok',
      };
    if (!res.ok || !body) return { kind: 'offline', message: `HTTP ${res.status}` };
    return compareModule(body as HealthResponse);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { kind: 'offline', message: err instanceof Error ? err.message : String(err) };
  }
}
