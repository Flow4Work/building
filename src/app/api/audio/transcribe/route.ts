import { ok, fail } from "@/lib/api";
import { groqTranscribe } from "@/lib/ai/providers/groq";

const allowed = new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/x-m4a", "audio/flac", "audio/x-flac", "audio/ogg", "audio/webm", "video/mp4"]);
const MAX = 25 * 1024 * 1024;
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const language = String(form.get("language") || "ko");
    if (!(file instanceof File)) return fail("FILE_REQUIRED", "녹음 파일을 선택해주세요.", 400);
    if (file.size > MAX) return fail("FILE_TOO_LARGE", "파일이 너무 큽니다. 25MB 이하의 파일을 올려주세요.", 413);
    if (file.type && !allowed.has(file.type)) return fail("FILE_TYPE", "MP3, WAV, M4A, FLAC, OGG, WEBM, MP4 파일을 올려주세요.", 415);
    if (process.env.AI_MOCK_MODE === "true") return ok({ text: String(form.get("mockTranscript") || "") });
    let text: string;
    try { text = await groqTranscribe(file, language, false); }
    catch (primaryError) {
      console.warn("primary transcription failed, retrying fast model", primaryError);
      text = await groqTranscribe(file, language, true);
    }
    return ok({ text });
  } catch (error) { console.error("transcribe", error); return fail("TRANSCRIBE_FAILED", "녹음을 글로 옮기지 못했어요. 다시 시도해주세요."); }
}
