type Message = { role: "system" | "user" | "assistant"; content: string };

export async function groqText(messages: Message[], signal?: AbortSignal): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_TEXT_MODEL;
  if (!key || !model) throw new Error("missing_groq_text_config");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.1 }),
  });
  if (!response.ok) throw new Error(`groq_${response.status}`);
  const json = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("empty_output");
  return text;
}

export async function groqTranscribe(file: File, language = "ko", fast = false): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("missing_groq_key");
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("model", fast ? (process.env.GROQ_TRANSCRIPTION_FAST_MODEL || "whisper-large-v3-turbo") : (process.env.GROQ_TRANSCRIPTION_MODEL || "whisper-large-v3"));
  form.append("language", language);
  form.append("temperature", "0");
  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
  if (!response.ok) throw new Error(`groq_transcribe_${response.status}`);
  const json = await response.json() as { text?: string };
  if (!json.text) throw new Error("empty_transcription");
  return json.text;
}
