import { ok, fail, bodyJson } from "@/lib/api";
import { mockTopics } from "@/lib/ai/mock";
import { parseJsonLoose } from "@/lib/ai/json";
import { textRequest } from "@/lib/ai/router";
import { TopicRecommendationsSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const { recentTitles = [] } = await bodyJson<{ recentTitles?: string[] }>(request);
    if (process.env.AI_MOCK_MODE === "true") return ok({ topics: mockTopics(recentTitles) });
    const raw = await textRequest([{ role: "system", content: "짧은 감동 내레이션용 주제를 추천한다. 최근 제목과 겹치지 않게 6개를 한국어로 만든다. JSON {topics:string[]}만 반환한다." }, { role: "user", content: `최근 제목: ${JSON.stringify(recentTitles.slice(0, 20))}` }]);
    return ok(parseJsonLoose(raw, TopicRecommendationsSchema));
  } catch (error) {
    console.error("topics", error); return fail("TOPICS_FAILED", "추천 주제를 만들지 못했어요. 다시 시도해주세요.");
  }
}
