import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) { return NextResponse.json({ ok: true, data }, { status }); }
export function fail(code: string, message: string, status = 500) { return NextResponse.json({ ok: false, error: { code, message } }, { status }); }

export async function bodyJson<T>(request: Request): Promise<T> {
  try { return await request.json() as T; } catch { throw new Error("invalid_request"); }
}
