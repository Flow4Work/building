export async function apiPost<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: init?.body instanceof FormData ? init.headers : { "content-type": "application/json", ...(init?.headers || {}) },
    body: init?.body ?? JSON.stringify(body),
    signal: init?.signal,
  });
  const json = await response.json() as { ok: boolean; data?: T; error?: { message?: string } };
  if (!response.ok || !json.ok || json.data == null) throw new Error(json.error?.message || "요청에 실패했어요.");
  return json.data;
}
