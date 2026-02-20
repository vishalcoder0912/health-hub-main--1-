const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

type ApiRequestInit = RequestInit & { auth?: boolean };

export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const token = localStorage.getItem("accessToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message || `Request failed: ${response.status}`);
  }

  return payload.data as T;
}

export { API_BASE_URL };
