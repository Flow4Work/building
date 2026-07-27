import type { ZodType } from "zod";

export function parseJsonLoose<T>(raw: string, schema: ZodType<T>): T {
  const candidates = [raw.trim()];
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  if (fenced) candidates.push(fenced.trim());
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first >= 0 && last > first) candidates.push(raw.slice(first, last + 1));
  for (const candidate of candidates) {
    try { return schema.parse(JSON.parse(candidate)); } catch { /* next */ }
  }
  throw new Error("invalid_json");
}
