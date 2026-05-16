const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function apiFetch(method: string, path: string, body?: object, headers?: Record<string, string>) {
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    // Backend not reachable (starting up or offline)
    return { ok: false, status: 0, data: { detail: 'Backend unavailable' } };
  }
}
