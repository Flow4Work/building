import { ok, fail, bodyJson } from "@/lib/api";
import { textRequest } from "@/lib/ai/router";
import { parseJsonLoose } from "@/lib/ai/json";
import { ChatSchema } from "@/lib/schemas";
import type { Language, Stage } from "@/lib/types";

function inferIntent(message: string) {
  if (/줄여|짧게|자\s*로/u.test(message)) return "shorten";
  if (/늘려|길게/u.test(message)) return "expand";
  if (/번역/u.test(message)) return "translate";
  if (/오타|다른 것|비교/u.test(message)) return "proofread";
  if (/제목|해시태그/u.test(message)) return "metadata";
  if (/바꿔|고쳐|수정|다르게/u.test(message)) return "revise";
  return "question";
}

export async function POST(request: Request) {
  try {
    const body = await bodyJson<{ message: string; stage: Stage; sourceText: string; currentLanguage?: Language; currentTranslation?: string; targetLength: number; topic: string; contentMode: string; recentEdits?: string[] }>(request);
    const intent = inferIntent(body.message);
    const target: "source" | Language = body.currentLanguage || "source";
    const current = body.currentLanguage ? (body.currentTranslation || "") : body.sourceText;
    const mutating = ["shorten", "expand", "translate", "revise"].includes(intent);
    if (process.env.AI_MOCK_MODE === "true") return ok({ intent, message: mutating ? "수정안을 만들었어요. 확인 후 적용해주세요." : "현재 작업을 기준으로 도와드릴게요.", ...(mutating ? { proposal: `${current}\n\n[AI 제안: ${body.message}]`, proposalTarget: target } : {}) });
    const raw = await textRequest([
      { role: "system", content: `현재 프로젝트 맥락을 아는 AI 도우미다. 사용자의 요청에 답한다. 원고/번역 수정이 필요한 요청이면 현재 텍스트를 수정한 'proposal'을 제공하되 자동 적용하지 않는다. JSON만 반환: {"intent":"generate|revise|shorten|expand|translate|proofread|metadata|question","message":"짧은 답변","proposal":"선택","proposalTarget":"source|en|ja|zh|th 선택"}` },
      { role: "user", content: `project=${body.topic}\nmode=${body.contentMode}\nstage=${body.stage}\ntarget=${body.targetLength}\ncurrentLanguage=${body.currentLanguage ?? "ko"}\nrecentEdits=${JSON.stringify(body.recentEdits ?? [])}\nCURRENT:\n${current}\n\nUSER:${body.message}` }
    ]);
    return ok(parseJsonLoose(raw, ChatSchema));
  } catch (error) { console.error("chat", error); return fail("CHAT_FAILED", "AI 도우미가 답하지 못했어요. 다시 시도해주세요."); }
}
