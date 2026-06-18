import { config } from '../config.js';

const PICA_BASE = 'https://api.picaos.com/v1/passthrough';

export type PicaRequestOptions = {
  method?: string;
  queryParams?: Record<string, string | string[] | number | boolean | undefined>;
  body?: unknown;
  contentType?: string;
  pathVariables?: Record<string, string | number>;
};

function buildUrl(path: string, queryParams?: PicaRequestOptions['queryParams']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${PICA_BASE}${normalizedPath}`);

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) url.searchParams.append(key, String(v));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function applyPathVariables(path: string, pathVariables?: Record<string, string | number>): string {
  if (!pathVariables) return path;
  let result = path;
  for (const [key, value] of Object.entries(pathVariables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), encodeURIComponent(String(value)));
  }
  return result;
}

export async function picaRequest<T = unknown>(
  platformPath: string,
  actionId: string,
  connectionKey: string,
  options: PicaRequestOptions = {}
): Promise<T> {
  const { method = 'GET', queryParams, body, contentType, pathVariables } = options;

  const path = applyPathVariables(platformPath, pathVariables);
  const url = buildUrl(path, queryParams);

  const headers: Record<string, string> = {
    'content-type': contentType || 'application/json',
    'x-pica-secret': config.picaSecret(),
    'x-pica-connection-key': connectionKey,
    'x-pica-action-id': actionId,
    accept: 'application/json',
  };

  const fetchOptions: RequestInit = { method, headers };

  if (body !== undefined && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);
  const text = await response.text();

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Pica API ${response.status} ${response.statusText}: ${typeof data === 'object' ? JSON.stringify(data) : text}`
    );
  }

  return data as T;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastError;
}
