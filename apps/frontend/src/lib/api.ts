const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error("Missing VITE_API_URL environment variable");
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

type ApiErrorBody = {
  message: string;
  code?: string;
};

type ApiEnvelope<T> = {
  data: T | null;
  error: ApiErrorBody | null;
};

type ApiRequestInit = RequestInit & {
  auth?: boolean;
  skipRefresh?: boolean;
};

export class ApiRequestError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "API_ERROR", status = 500) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAuthTokens(tokens: { accessToken: string; refreshToken?: string | null }): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function clearAuthTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function executeRequest<T>(
  path: string,
  init: ApiRequestInit,
  accessToken: string | null
): Promise<T> {
  const { auth = true, headers, ...rest } = init;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers || {})
    }
  });

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  const hasError = payload?.error?.message;

  if (!response.ok || hasError) {
    const message = payload?.error?.message || `Request failed with status ${response.status}`;
    const code = payload?.error?.code || "API_ERROR";
    throw new ApiRequestError(message, code, response.status);
  }

  return payload?.data as T;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  try {
    const data = await executeRequest<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
        auth: false,
        skipRefresh: true
      },
      null
    );

    setAuthTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken
    });
    return true;
  } catch {
    clearAuthTokens();
    return false;
  }
}

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { auth = true, skipRefresh = false } = init;
  const accessToken = getAccessToken();

  try {
    return await executeRequest<T>(path, init, accessToken);
  } catch (error) {
    const apiError = error instanceof ApiRequestError ? error : null;
    if (
      auth &&
      !skipRefresh &&
      apiError &&
      apiError.status === 401 &&
      (await refreshAccessToken())
    ) {
      return executeRequest<T>(path, { ...init, skipRefresh: true }, getAccessToken());
    }
    throw error;
  }
}

export { API_BASE_URL };
