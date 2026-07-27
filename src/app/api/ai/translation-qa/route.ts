import { ok, fail, bodyJson } from "@/lib/api";
import { parseJsonLoose } from "@/lib/ai/json";
import { textRequest } from "@/lib/ai/router";
import { TRANSLATION_QA_SYSTEM } from "@/lib/ai/prompts";
import { TranslationQaSchema } from "@/lib/schemas";
import type { Language } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await bodyJson<{ source: string; translation: string; language: Language }>(request);
    if (process.env.AI_MOCK_MODE === "true") return ok({ status: "PASS", issues: [] });
    const raw = await textRequest([{ role: "system", content: `${TRANSLATION_QA_SYSTEM}\nJSON: {"status":"PASS|FAIL","issues":[{"type":"...","detail":"..."}]}` }, { role: "user", content: `LANGUAGE=${body.language}\nSOURCE:\n${body.source}\n\nTRANSLATION:\n${body.translation}` }]);
    return ok(parseJsonLoose(raw, TranslationQaSchema));
  } catch (error) { console.error("translation-qa", error); return fail("QA_FAILED", "번역 검수를 완료하지 못했어요. 다시 시도해주세요."); }
}
