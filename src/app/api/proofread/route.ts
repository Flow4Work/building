import { ok, fail, bodyJson } from "@/lib/api";
import { strictSpeechDiff } from "@/lib/diff";
import { parseJsonLoose } from "@/lib/ai/json";
import { textRequest } from "@/lib/ai/router";
import { PROOFREAD_SYSTEM } from "@/lib/ai/prompts";
import { ProofreadSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const { source, transcript } = await bodyJson<{ source: string; transcript: string }>(request);
    if (!source || transcript == null) return fail("INVALID_REQUEST", "원문과 전사문을 확인해주세요.", 400);
    const candidates = strictSpeechDiff(source, transcript);
    if (candidates.length === 0) return ok({ hasDifferences: false, differences: [] });
    if (process.env.AI_MOCK_MODE === "true") return ok({ hasDifferences: true, differences: candidates });
    const raw = await textRequest([{ role: "system", content: `${PROOFREAD_SYSTEM}\nJSON schema: {"hasDifferences":boolean,"differences":[{"type":"missing|added|changed","expected":"","actual":"","context":""}]}` }, { role: "user", content: `DIFF_CANDIDATES:\n${JSON.stringify(candidates)}` }], { allowFallback: true });
    const result = parseJsonLoose(raw, ProofreadSchema);
    const allowed = new Set(candidates.map((d) => `${d.type}|${d.expected}|${d.actual}`));
    const filtered = result.differences.filter((d) => allowed.has(`${d.type}|${d.expected}|${d.actual}`));
    return ok({ hasDifferences: filtered.length > 0, differences: filtered });
  } catch (error) { console.error("proofread", error); return fail("PROOFREAD_FAILED", "원문과 녹음을 비교하지 못했어요. 다시 시도해주세요."); }
}
