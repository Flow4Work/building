import { ok, fail, bodyJson } from "@/lib/api";
import { mockMetadata } from "@/lib/ai/mock";
import { parseJsonLoose } from "@/lib/ai/json";
import { textRequest } from "@/lib/ai/router";
import { MetadataSchema } from "@/lib/schemas";
import type { Language } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await bodyJson<{ text: string; topic: string; language: Language }>(request);
    if (process.env.AI_MOCK_MODE === "true") return ok(mockMetadata(body.topic, body.language));
    const raw = await textRequest([{ role: "system", content: "본문을 바꾸지 말고 별도 메타데이터만 만든다. 과도한 클릭베이트 금지. 해당 언어의 자연스러운 제목 1개와 관련 해시태그 10~15개를 JSON {title:string,hashtags:string[]}로 반환." }, { role: "user", content: `language=${body.language}\ntopic=${body.topic}\ntext=${body.text}` }]);
    return ok(parseJsonLoose(raw, MetadataSchema));
  } catch (error) { console.error("metadata", error); return fail("METADATA_FAILED", "제목과 해시태그를 만들지 못했어요. 다시 시도해주세요."); }
}
