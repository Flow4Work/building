import { groqText } from "./providers/groq";
import { getZenModels, ZenProviderError, zenText } from "./providers/zen";

type Message = { role: "system" | "user" | "assistant"; content: string };

export async function textRequest(messages: Message[], options: { timeoutMs?: number; allowFallback?: boolean } = {}): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 45000;
  const attempt = async (fn: (m: Message[], s?: AbortSignal) => Promise<string>) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try { return await fn(messages, controller.signal); } finally { clearTimeout(timer); }
  };

  let lastError: unknown;
  const models = getZenModels();

  for (let modelIndex = 0; modelIndex < models.length; modelIndex++) {
    const model = models[modelIndex];
    const maxAttempts = modelIndex === 0 ? 2 : 1;
    for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex++) {
      try {
        return await attempt((m, signal) => zenText(m, signal, model));
      } catch (error) {
        lastError = error;
        if (error instanceof ZenProviderError && [401, 402, 403].includes(error.status)) throw error;
        if (attemptIndex + 1 < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
  }

  if (options.allowFallback !== false && process.env.GROQ_TEXT_MODEL) {
    try { return await attempt(groqText); } catch (error) { lastError = error; }
  }

  throw lastError instanceof Error ? lastError : new Error("ai_failed");
}
