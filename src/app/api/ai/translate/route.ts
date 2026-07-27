import { ok, fail, bodyJson } from "@/lib/api";
import { mockTranslate } from "@/lib/ai/mock";
import { textRequest } from "@/lib/ai/router";
import { TRANSLATION_SYSTEM } from "@/lib/ai/prompts";
import type { Language } from "@/lib/types";

const names: Record<Language, string> = { en: "영어", ja: "일본어", zh: "중국어", th: "태국어" };
export async function POST(request: Request) {
  try {
    const { source, language } = await bodyJson<{ source: string; language: Language }>(request);
    if (!source || !names[language]) return fail("INVALID_REQUEST", "번역할 원문과 언어를 확인해주세요.", 400);
    if (process.env.AI_MOCK_MODE === "true") return ok({ text: mockTranslate(source, language) });
    const text = await textRequest([{ role: "system", content: TRANSLATION_SYSTEM }, { role: "user", content: `SOURCE_LANGUAGE=ko\nTARGET_LANGUAGE=${names[language]}\n\nSOURCE:\n${source}` }]);
    return ok({ text });
  } catch (error) { console.error("translate", error); return fail("TRANSLATE_FAILED", "번역 결과를 제대로 받지 못했어요. 이 언어만 다시 만들어주세요."); }
}
