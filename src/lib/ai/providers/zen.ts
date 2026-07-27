type Message = { role: "system" | "user" | "assistant"; content: string };

export async function zenText(messages: Message[], signal?: AbortSignal): Promise<string> {
  const key = process.env.OPENCODE_ZEN_API_KEY;
  if (!key) throw new Error("missing_zen_key");
  const base = (process.env.OPENCODE_ZEN_BASE_URL || "https://opencode.ai/zen/v1").replace(/\/$/, "");
  const model = process.env.ZEN_PRIMARY_MODEL || "deepseek-v4-flash-free";
  const response = await fetch(`${base}/chat/completions`, {
    method: "POST", signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.6 }),
  });
  if (!response.ok) throw new Error(`zen_${response.status}`);
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty_output");
  return text;
}
