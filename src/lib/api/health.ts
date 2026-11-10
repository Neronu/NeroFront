import type { HealthResponse } from '@neronu/api-contract';
import { isCompatible } from '@neronu/sport-core';
import { basketball } from '@neronu/sport-basketball';

export type ApiStatus =
  | { kind: 'ok'; apiVersion: string; localVersion: string }
  | { kind: 'mismatch'; apiVersion: string; localVersion: string }
  | { kind: 'offline'; message: string };

/** Compara a versão do módulo de basquete da API com a que o front usa (mesmo major = compatível). */
export function compareModule(health: HealthResponse): ApiStatus {
  const localVersion = basketball.version;
  const apiVersion = health.sportModules[basketball.key];
  if (!apiVersion) return { kind: 'mismatch', apiVersion: 'ausente', localVersion };
  return isCompatible(apiVersion, localVersion)
    ? { kind: 'ok', apiVersion, localVersion }
    : { kind: 'mismatch', apiVersion, localVersion };
}

export async function fetchApiStatus(baseUrl: string, signal?: AbortSignal): Promise<ApiStatus> {
  try {
    const res = await fetch(`${baseUrl}/health`, { signal });
    if (!res.ok) return { kind: 'offline', message: `HTTP ${res.status}` };
    return compareModule((await res.json()) as HealthResponse);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return { kind: 'offline', message: err instanceof Error ? err.message : String(err) };
  }
}
