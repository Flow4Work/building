import { ok, fail, bodyJson } from "@/lib/api";
import { mockStory } from "@/lib/ai/mock";
import { textRequest } from "@/lib/ai/router";
import { REVISION_SYSTEM } from "@/lib/ai/prompts";
import type { ContentMode } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await bodyJson<{ text: string; instruction: string; targetLength?: number; contentMode?: ContentMode; topic?: string }>(request);
    if (!body.text || !body.instruction) return fail("INVALID_REQUEST", "수정할 원고와 요청을 확인해주세요.", 400);
    if (process.env.AI_MOCK_MODE === "true") {
      const target = body.targetLength || 1100;
      const mock = /\d+\s*자/u.test(body.instruction) ? mockStory(body.contentMode || "general", body.topic || "마음을 쉬게 하는 법", target) : `${body.text}\n\n[수정 요청 반영: ${body.instruction}]`;
      return ok({ text: mock });
    }
    const text = await textRequest([{ role: "system", content: REVISION_SYSTEM }, { role: "user", content: `요청: ${body.instruction}\n목표 글자 수: ${body.targetLength ?? "유지"}\n기존 원고:\n${body.text}` }]);
    return ok({ text });
  } catch (error) { console.error("revise", error); return fail("REVISE_FAILED", "수정안을 만들지 못했어요. 다시 시도해주세요."); }
}
