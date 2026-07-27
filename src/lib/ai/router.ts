import { groqText } from "./providers/groq";
import { zenText } from "./providers/zen";

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function textRequest(messages: Message[], options: { timeoutMs?: number; allowFallback?: boolean } = {}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 30000;
  const attempt = async (fn: (m: Message[], s?: AbortSignal) => Promise<string>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fn(messages, controller.signal); } finally { clearTimeout(timer); }
  };

  let lastError: unknown;
  for (let i = 0; i < 2; i++) {
    try { return await attempt(zenText); } catch (error) { lastError = error; if (i === 0) await new Promise((r) => setTimeout(r, 250)); }
  }
  if (options.allowFallback !== false && process.env.GROQ_TEXT_MODEL) {
    try { return await attempt(groqText); } catch (error) { lastError = error; }
  }
  throw lastError instanceof Error ? lastError : new Error("ai_failed");
}
