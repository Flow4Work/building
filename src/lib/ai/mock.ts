import type { ContentMode, Language } from "../types";
import { countGraphemes } from "../graphemes";

const topicPool = [
  "너무 애쓰지 않아도 된다", "지나간 인연을 붙잡지 말라", "오늘만큼은 자신을 용서하라", "늦었다고 생각하지 마라",
  "마음이 힘들 때 내려놓아야 할 것", "아무도 알아주지 않아도 괜찮다", "쉬어가는 것도 앞으로 가는 일이다", "혼자 버틴 시간을 다독이는 법",
  "비교를 멈추면 보이는 것", "기다림이 길어질 때 마음을 지키는 법"
];

export function mockTopics(recent: string[]): string[] {
  const used = new Set(recent.map((x) => x.trim()));
  return [...topicPool.filter((x) => !used.has(x)), ...topicPool].slice(0, 6);
}

function seed(mode: ContentMode, topic: string): string {
  if (mode === "inspired_buddha") return `한 제자가 지친 얼굴로 물었습니다. “${topic}라는 말을 이해하고 싶습니다.” 스승은 잠시 곁의 등불을 바라보다가 말했습니다. 오래 밝히려면 심지도 쉬어야 한다고, 계속 타오르는 것만이 성실함은 아니라고 했습니다. 사람의 마음도 마찬가지입니다. 무거운 짐을 잠시 내려놓는다고 길을 포기한 것이 아닙니다. 숨을 고르고 발밑을 살피는 동안 다시 걸을 힘이 돌아옵니다. 오늘 할 수 있는 만큼만 해도 충분합니다. 스스로를 몰아세우기보다 지금까지 견딘 마음을 먼저 알아주세요. 내려놓음은 패배가 아니라 다음 걸음을 위한 자리를 만드는 일입니다. 당신의 속도가 늦어 보여도 괜찮습니다. 평온은 멀리 있는 보상이 아니라 지금 자신에게 허락하는 작은 쉼에서 시작됩니다.`;
  if (mode === "inspired_jesus") return `한 사람이 지친 마음으로 물었습니다. “${topic}라는 말을 어떻게 받아들여야 할까요?” 예수님은 잠시 창문으로 들어오는 아침빛을 바라보며 말했습니다. 빛은 서두르지 않아도 방 안을 천천히 채운다고, 사람의 마음도 억지로 밝아질 필요는 없다고 했습니다. 오래 당겨진 활은 잠시 풀어야 다시 힘을 냅니다. 당신이 쉬는 시간은 사랑에서 멀어진 시간이 아닙니다. 오늘은 모든 것을 해결하려 하지 말고 한숨 돌려도 됩니다. 자신에게도 친절을 허락하세요. 지친 마음을 숨기지 않아도 되고, 도움을 받아도 됩니다. 평안은 완벽하게 버틴 뒤에 오는 상이 아니라, 힘든 순간에도 당신 곁에 머무는 작은 희망입니다. 오늘 한 걸음만 내딛어도 충분합니다.`;
  return `어느 날 문득 ${topic}라는 생각이 마음에 걸릴 때가 있습니다. 우리는 쉬면 뒤처질 것 같고, 멈추면 모든 것이 무너질 것처럼 스스로를 몰아붙입니다. 하지만 오래 달린 사람에게 필요한 것은 더 큰 채찍이 아니라 숨을 돌릴 자리입니다. 무거운 가방을 잠시 바닥에 내려놓는다고 여행이 끝나는 것은 아닙니다. 오히려 어깨의 감각을 되찾고 다음 길을 더 오래 걸을 수 있습니다. 오늘 해야 할 일이 남아 있어도 괜찮습니다. 다 끝내지 못한 하루가 실패한 하루는 아닙니다. 지금까지 버틴 자신을 먼저 인정해 주세요. 누구에게 설명하지 않아도 되는 쉼, 아무것도 증명하지 않아도 되는 시간이 필요할 때가 있습니다. 다시 시작할 힘은 몰아세움보다 회복에서 생깁니다. 오늘은 자신에게 조금 느린 속도를 허락해도 됩니다.`;
}

export function mockStory(mode: ContentMode, topic: string, target: number): string {
  const base = seed(mode, topic);
  let text = base;
  const extra = " 마음이 조용해질 때까지 잠시 머물러도 됩니다. 작은 쉼은 내일의 힘을 빼앗는 것이 아니라 되돌려주는 시간입니다.";
  while (countGraphemes(text) < target - 20) text += extra;
  if (countGraphemes(text) > target + 30) text = Array.from(text).slice(0, target - 2).join("").replace(/[,. ]+$/u, "") + ".";
  return text;
}

export function mockTranslate(source: string, language: Language): string {
  const label = { en: "English", ja: "日本語", zh: "中文", th: "ภาษาไทย" }[language];
  return `[${label} mock translation]\n${source}`;
}

export function mockMetadata(topic: string, language: Language) {
  const tags: Record<Language, string[]> = {
    en: ["#comfort", "#healing", "#mindfulness", "#rest", "#hope", "#peace", "#selfcare", "#life", "#heart", "#story"],
    ja: ["#癒し", "#心", "#休息", "#希望", "#平安", "#自分を大切に", "#人生", "#言葉", "#物語", "#今日"],
    zh: ["#治愈", "#心灵", "#休息", "#希望", "#平静", "#关爱自己", "#生活", "#文字", "#故事", "#今天"],
    th: ["#กำลังใจ", "#เยียวยา", "#พักผ่อน", "#ความหวัง", "#สงบใจ", "#ดูแลตัวเอง", "#ชีวิต", "#เรื่องราว", "#วันนี้", "#ใจ"],
  };
  return { title: topic || "오늘 마음에게 건네는 한마디", hashtags: tags[language] };
}
