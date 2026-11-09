import Constants from 'expo-constants';
import { Platform } from 'react-native';

const fallbackApiUrl = 'http://localhost:4000';
const fallbackAiUrl = 'http://localhost:4100';
const fallbackWebUrl = 'http://localhost:3000';
const requestTimeoutMs = Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS || 12000);

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

function getExpoHost(): string | null {
  const hostCandidates = [
    (Constants.expoConfig as any)?.hostUri,
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri,
    (Constants as any)?.manifest?.debuggerHost
  ].filter(Boolean) as string[];

  for (const candidate of hostCandidates) {
    const host = String(candidate).split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return host;
    }
  }

  return null;
}

function normalizeBaseUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const isIosSimulator = Platform.OS === 'ios' && !Constants.isDevice;

    if (isIosSimulator && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      parsed.hostname = 'localhost';
      return parsed.toString().replace(/\/$/, '');
    }

    if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
      return rawUrl;
    }

    const expoHost = getExpoHost();
    if (!expoHost) {
      return rawUrl;
    }

    parsed.hostname = expoHost;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl;
  }
}

function isLocalHostUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function withHostAndPort(rawUrl: string, host: string, port: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hostname = host;
    parsed.port = port;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return rawUrl;
  }
}

export function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  const extraUrl = Constants.expoConfig?.extra?.apiUrl;
  return normalizeBaseUrl(envUrl || extraUrl || fallbackApiUrl);
}

export function getWebBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_WEB_URL;
  const extraUrl = Constants.expoConfig?.extra?.webUrl;
  let resolved = normalizeBaseUrl(envUrl || extraUrl || fallbackWebUrl);

  if (isLocalHostUrl(resolved)) {
    const apiResolved = normalizeBaseUrl(getApiBaseUrl());
    if (!isLocalHostUrl(apiResolved)) {
      const apiHost = new URL(apiResolved).hostname;
      resolved = withHostAndPort(resolved, apiHost, '3000');
    }
  }

  return resolved;
}

export function getAiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_AI_URL;
  const extraUrl = Constants.expoConfig?.extra?.aiUrl;
  return normalizeBaseUrl(envUrl || extraUrl || fallbackAiUrl);
}

function buildHeaders(options: RequestInit): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined)
  };

  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

function buildAuthHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    ...(extra as Record<string, string> | undefined)
  };

  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
}

async function requestJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: buildHeaders(options),
      signal: controller.signal
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Timeout after ${requestTimeoutMs}ms on ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  return requestJson<T>(`${baseUrl}${path}`, options);
}

export async function webRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getWebBaseUrl();
  return requestJson<T>(`${baseUrl}${path}`, options);
}

export async function aiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getAiBaseUrl();
  return requestJson<T>(`${baseUrl}${path}`, options);
}

export async function apiUpload<T>(path: string, body: FormData): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: buildAuthHeaders(),
      body,
      signal: controller.signal
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error(`Timeout after ${requestTimeoutMs}ms on ${baseUrl}${path}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}
