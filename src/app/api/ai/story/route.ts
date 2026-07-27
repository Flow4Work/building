import { ok, fail, bodyJson } from "@/lib/api";
import { mockStory } from "@/lib/ai/mock";
import { textRequest } from "@/lib/ai/router";
import { STORY_SYSTEM, REVISION_SYSTEM } from "@/lib/ai/prompts";
import { countGraphemes, withinTarget } from "@/lib/graphemes";
import type { ContentMode } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await bodyJson<{ topic: string; contentMode: ContentMode; targetLength: number; recentMetaphors?: string[] }>(request);
    if (!body.topic?.trim()) return fail("TOPIC_REQUIRED", "주제를 먼저 골라주세요.", 400);
    const target = Math.max(300, Math.min(3000, Number(body.targetLength) || 1100));
    if (process.env.AI_MOCK_MODE === "true") { const text = mockStory(body.contentMode, body.topic, target); return ok({ text, characterCount: countGraphemes(text) }); }
    let text = await textRequest([{ role: "system", content: STORY_SYSTEM }, { role: "user", content: `주제: ${body.topic}\n모드: ${body.contentMode}\n목표: ${target}자\n최근 비유: ${(body.recentMetaphors ?? []).join(", ")}\n원고만 작성.` }]);
    for (let attempt = 0; attempt < 3 && !withinTarget(text, target); attempt++) {
      const current = countGraphemes(text);
      text = await textRequest([{ role: "system", content: REVISION_SYSTEM }, { role: "user", content: `현재 ${current}자, 목표 ${target}자(허용 ${target - 30}~${target + 30}). 기존 의미/인물/전개/결말을 유지하고 길이만 조정.\n\n기존 원문:\n${text}` }]);
    }
    return ok({ text, characterCount: countGraphemes(text) });
  } catch (error) { console.error("story", error); return fail("STORY_FAILED", "이야기를 만들지 못했어요. 다시 시도해주세요."); }
}
