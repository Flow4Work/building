import { ok, fail, bodyJson } from "@/lib/api";
import { mockTopics } from "@/lib/ai/mock";
import { parseJsonLoose } from "@/lib/ai/json";
import { textRequest } from "@/lib/ai/router";
import { friendlyAiError } from "@/lib/ai/errors";
import { TopicRecommendationsSchema } from "@/lib/schemas";
import type { ContentMode } from "@/lib/types";

const MODE_GUIDE: Record<ContentMode, string> = {
  inspired_buddha: "부처님의 지혜에서 영감 받은 창작 위로 이야기. 실제 경전의 직접 인용처럼 주장하지 않는다.",
  inspired_jesus: "예수님의 사랑과 평안에서 영감 받은 창작 위로 이야기. 실제 성경 구절의 직접 인용처럼 주장하지 않는다.",
  general: "종교색 없는 일상적인 위로와 회복 이야기.",
};

export async function POST(request: Request) {
  try {
    const body = await bodyJson<{
      recentTitles?: string[];
      avoidTopics?: string[];
      contentMode?: ContentMode;
      request?: string;
    }>(request);
    const recentTitles = body.recentTitles ?? [];
    const avoidTopics = body.avoidTopics ?? [];
    const contentMode = body.contentMode ?? "inspired_buddha";
    const userRequest = body.request?.trim() || "";

    if (process.env.AI_MOCK_MODE === "true") {
      return ok({ topics: mockTopics([...recentTitles, ...avoidTopics]).slice(0, 10) });
    }

    const variation = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const raw = await textRequest([
      {
        role: "system",
        content: [
          "짧은 감동 내레이션용 주제 추천가다.",
          "현재 스타일에 정확히 맞는 한국어 주제 10개를 제안한다.",
          "각 주제는 한 문장형 제목으로 짧고 구체적으로 쓴다.",
          "서로 비슷한 의미를 반복하지 않는다.",
          "최근 제목과 직전 추천 주제는 다시 쓰지 않는다.",
          "사용자의 추가 요청이 있으면 그 요청을 주제의 방향으로 해석하고 10개를 새로 추천한다.",
          "JSON {\"topics\":[\"...\"]}만 반환한다. 설명, 번호, 마크다운은 금지한다.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          `스타일: ${MODE_GUIDE[contentMode]}`,
          `추가 요청: ${userRequest || "없음"}`,
          `최근 제목: ${JSON.stringify(recentTitles.slice(0, 20))}`,
          `피해야 할 직전 추천: ${JSON.stringify(avoidTopics.slice(0, 20))}`,
          `다양성 키: ${variation}`,
        ].join("\n"),
      },
    ], { timeoutMs: 45000 });

    const parsed = parseJsonLoose(raw, TopicRecommendationsSchema);
    const topics = [...new Set(parsed.topics.map((topic) => topic.trim()).filter(Boolean))].slice(0, 10);
    return ok({ topics });
  } catch (error) {
    console.error("topics", error);
    return fail("TOPICS_FAILED", friendlyAiError(error, "추천 주제를 만들지 못했어요. 다시 시도해주세요."));
  }
}
