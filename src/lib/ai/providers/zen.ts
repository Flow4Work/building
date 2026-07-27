type Message = { role: "system" | "user" | "assistant"; content: string };

export class ZenProviderError extends Error {
  constructor(
    public readonly status: number,
    public readonly model: string,
    public readonly detail: string,
  ) {
    super(`zen_${status}`);
    this.name = "ZenProviderError";
  }
}

export function getZenModels(): string[] {
  const primary = process.env.ZEN_PRIMARY_MODEL || "deepseek-v4-flash-free";
  const fallbacks = (process.env.ZEN_FALLBACK_MODELS || "mimo-v2.5-free,north-mini-code-free")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([primary, ...fallbacks])];
}

export async function zenText(messages: Message[], signal?: AbortSignal, modelOverride?: string): Promise<string> {
  const key = process.env.OPENCODE_ZEN_API_KEY;
  if (!key) throw new Error("missing_zen_key");

  const base = (process.env.OPENCODE_ZEN_BASE_URL || "https://opencode.ai/zen/v1").replace(/\/$/, "");
  const model = modelOverride || process.env.ZEN_PRIMARY_MODEL || "deepseek-v4-flash-free";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    console.error("zen provider error", { status: response.status, model, detail });
    throw new ZenProviderError(response.status, model, detail);
  }

  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty_output");
  return text;
}
