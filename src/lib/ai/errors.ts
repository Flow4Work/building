import { ZenProviderError } from "./providers/zen";

export function friendlyAiError(error: unknown, fallback: string): string {
  if (error instanceof ZenProviderError) {
    if (error.status === 401 || error.status === 403) return "OpenCode Zen API Key 또는 접근 권한을 확인해주세요.";
    if (error.status === 402) return "OpenCode Zen 계정의 결제/크레딧 설정을 확인해주세요.";
    if (error.status === 429) return "AI 사용량이 잠시 제한됐어요. 잠시 후 다시 시도해주세요.";
    if (error.status >= 500) return "AI 서버가 잠시 불안정해요. 잠시 후 다시 시도해주세요.";
  }
  if (error instanceof Error) {
    if (error.message === "missing_zen_key") return "OpenCode Zen API Key가 설정되지 않았어요.";
    if (error.name === "AbortError" || error.message.toLowerCase().includes("abort")) return "AI 응답이 오래 걸렸어요. 다시 시도해주세요.";
  }
  return fallback;
}
