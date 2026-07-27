"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { apiPost } from "@/lib/client";
import { countGraphemes } from "@/lib/graphemes";
import { BackupSchema } from "@/lib/schemas";
import { exportProjects, fallbackCopy, loadProjects, saveProjects } from "@/lib/storage";
import type { ContentMode, Language, Project, ProofreadResult, RevisionProposal, Translation } from "@/lib/types";

const LANGUAGES: Language[] = ["en", "ja", "zh", "th"];
const LANGUAGE_NAME: Record<Language, string> = { en: "영어", ja: "일본어", zh: "중국어", th: "태국어" };
const LANGUAGE_FLAG: Record<Language, string> = { en: "🇺🇸", ja: "🇯🇵", zh: "🇨🇳", th: "🇹🇭" };
const MODE_NAME: Record<ContentMode, string> = { inspired_buddha: "부처님 말씀 느낌", inspired_jesus: "예수님 말씀 느낌", general: "일반 위로글" };

function emptyTranslation(language: Language): Translation {
  return { language, text: "", status: "idle", qaStatus: "idle", title: "", hashtags: [] };
}
function newProject(contentMode: ContentMode = "inspired_buddha"): Project {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), createdAt: now, updatedAt: now, title: "새 작업", topic: "", contentMode,
    targetLength: 1100, stage: "story", sourceText: "", transcript: "", proofread: null,
    translations: { en: emptyTranslation("en"), ja: emptyTranslation("ja"), zh: emptyTranslation("zh"), th: emptyTranslation("th") },
    chatHistory: [], recentEdits: [],
  };
}

type ApiError = Error;

export default function StoryStudio() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeId, setActiveId] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [proposal, setProposal] = useState<RevisionProposal | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<Language | undefined>();
  const [copied, setCopied] = useState("");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const project = useMemo(() => projects.find((p) => p.id === activeId) ?? projects[0], [projects, activeId]);

  useEffect(() => {
    const stored = loadProjects();
    const initial = stored.length ? stored : [newProject()];
    setProjects(initial); setActiveId(initial[0].id); setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) saveProjects(projects); }, [projects, hydrated]);
  useEffect(() => { if (hydrated && topics.length === 0) void refreshTopics(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [hydrated]);

  function updateProject(patch: Partial<Project> | ((current: Project) => Partial<Project>)) {
    if (!project) return;
    setProjects((all) => all.map((p) => {
      if (p.id !== project.id) return p;
      const delta = typeof patch === "function" ? patch(p) : patch;
      return { ...p, ...delta, updatedAt: new Date().toISOString() };
    }));
  }

  async function refreshTopics() {
    try {
      setBusy("topics"); setError("");
      const recentTitles = projects.slice(0, 20).map((p) => p.title).filter((t) => t !== "새 작업");
      const data = await apiPost<{ topics: string[] }>("/api/ai/topics", { recentTitles });
      setTopics(data.topics);
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  }

  async function createStory() {
    if (!project?.topic.trim()) { setError("주제를 먼저 골라주세요."); return; }
    try {
      setBusy("story"); setError("");
      const data = await apiPost<{ text: string; characterCount: number }>("/api/ai/story", {
        topic: project.topic, contentMode: project.contentMode, targetLength: project.targetLength,
        recentMetaphors: projects.slice(0, 8).map((p) => p.sourceText.slice(0, 400)).filter(Boolean),
      });
      updateProject({ sourceText: data.text, title: project.topic, recentEdits: [...project.recentEdits, "초안 생성"].slice(-20) });
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  }

  async function reviseSource(instruction = "다른 비유로 바꿔줘") {
    if (!project?.sourceText) return;
    try {
      setBusy("revise"); setError("");
      const data = await apiPost<{ text: string }>("/api/ai/revise", {
        text: project.sourceText, instruction, targetLength: project.targetLength, contentMode: project.contentMode, topic: project.topic,
      });
      setProposal({ text: data.text, target: "source", reason: instruction });
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  }

  function applyProposal() {
    if (!project || !proposal) return;
    if (proposal.target === "source") updateProject({ sourceText: proposal.text, recentEdits: [...project.recentEdits, proposal.reason].slice(-20) });
    else updateProject({ translations: { ...project.translations, [proposal.target]: { ...project.translations[proposal.target], text: proposal.text, qaStatus: "idle" } }, recentEdits: [...project.recentEdits, `${LANGUAGE_NAME[proposal.target]} 수정`].slice(-20) });
    setProposal(null);
  }

  function finishStory() { if (project?.sourceText.trim()) { updateProject({ stage: "proofread" }); setCurrentLanguage(undefined); } }

  function chooseFile(next: File | null) {
    if (!next) return;
    if (next.size > 25 * 1024 * 1024) { setError("파일이 너무 큽니다. 25MB 이하의 파일을 올려주세요."); return; }
    setFile(next); setError("");
  }

  async function transcribe() {
    if (!file || !project) { setError("녹음 파일을 선택해주세요."); return; }
    try {
      setBusy("transcribe"); setError("");
      const form = new FormData(); form.append("file", file); form.append("language", "ko");
      const response = await fetch("/api/audio/transcribe", { method: "POST", body: form });
      const json = await response.json() as { ok: boolean; data?: { text: string }; error?: { message: string } };
      if (!response.ok || !json.ok || !json.data) throw new Error(json.error?.message || "녹음을 글로 옮기지 못했어요.");
      updateProject({ transcript: json.data.text });
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  }

  async function proofread() {
    if (!project?.sourceText || project.transcript == null) return;
    try {
      setBusy("proofread"); setError("");
      const data = await apiPost<ProofreadResult>("/api/proofread", { source: project.sourceText, transcript: project.transcript });
      updateProject({ proofread: data });
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  }

  async function localizeLanguage(language: Language): Promise<boolean> {
    if (!project) return false;
    updateProject((p) => ({ translations: { ...p.translations, [language]: { ...p.translations[language], status: "loading", error: undefined } } }));
    try {
      let translated = "";
      let qa: "PASS" | "FAIL" = "FAIL";
      for (let attempt = 0; attempt < 3; attempt++) {
        const t = await apiPost<{ text: string }>("/api/ai/translate", { source: project.sourceText, language });
        translated = t.text;
        const q = await apiPost<{ status: "PASS" | "FAIL" }>("/api/ai/translation-qa", { source: project.sourceText, translation: translated, language });
        qa = q.status;
        if (qa === "PASS") break;
      }
      if (qa !== "PASS") throw new Error("번역 검수에서 문제가 반복됐어요. 이 언어만 다시 만들어주세요.");
      const meta = await apiPost<{ title: string; hashtags: string[] }>("/api/ai/metadata", { text: translated, topic: project.topic, language });
      updateProject((p) => ({ translations: { ...p.translations, [language]: { ...p.translations[language], text: translated, status: "done", qaStatus: "pass", title: meta.title, hashtags: meta.hashtags } } }));
      return true;
    } catch (e) {
      updateProject((p) => ({ translations: { ...p.translations, [language]: { ...p.translations[language], status: "error", qaStatus: "fail", error: (e as ApiError).message } } }));
      return false;
    }
  }

  async function startLocalization() {
    if (!project) return;
    updateProject({ stage: "localize" }); setCurrentLanguage("en");
    setBusy("localize"); setError("");
    const results: boolean[] = [];
    for (const language of LANGUAGES) results.push(await localizeLanguage(language));
    setBusy(null); updateProject({ stage: results.every(Boolean) ? "completed" : "localize" });
  }

  async function sendChat() {
    if (!project || !chatInput.trim()) return;
    const text = chatInput.trim(); setChatInput(""); setError("");
    const userMessage = { id: crypto.randomUUID(), role: "user" as const, content: text, createdAt: new Date().toISOString() };
    updateProject({ chatHistory: [...project.chatHistory, userMessage] });
    try {
      setBusy("chat");
      const currentTranslation = currentLanguage ? project.translations[currentLanguage].text : undefined;
      const data = await apiPost<{ intent: string; message: string; proposal?: string; proposalTarget?: "source" | Language }>("/api/ai/chat", {
        message: text, stage: project.stage, sourceText: project.sourceText, currentLanguage, currentTranslation,
        targetLength: project.targetLength, topic: project.topic, contentMode: project.contentMode, recentEdits: project.recentEdits,
      });
      const assistantMessage = { id: crypto.randomUUID(), role: "assistant" as const, content: data.message, createdAt: new Date().toISOString() };
      updateProject((p) => ({ chatHistory: [...p.chatHistory, assistantMessage] }));
      if (data.proposal && data.proposalTarget) setProposal({ text: data.proposal, target: data.proposalTarget, reason: text });
    } catch (e) { setError((e as ApiError).message); }
    finally { setBusy(null); }
  }

  async function copyText(key: string, text: string) {
    try { await fallbackCopy(text); setCopied(key); window.setTimeout(() => setCopied((v) => v === key ? "" : v), 2000); }
    catch { setError("복사하지 못했어요. 다시 눌러주세요."); }
  }

  function createNew() {
    const next = newProject(project?.contentMode); setProjects((all) => [next, ...all]); setActiveId(next.id); setCurrentLanguage(undefined); setProposal(null); setError("");
  }

  function downloadBackup() {
    const blob = exportProjects(projects); const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `ai-story-studio-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(url);
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]; if (!selected) return;
    try {
      const parsed = BackupSchema.parse(JSON.parse(await selected.text()));
      const restored = parsed.projects as unknown as Project[];
      setProjects(restored); setActiveId(restored[0]?.id || ""); setError("");
    } catch { setError("백업 파일을 읽지 못했어요. 기존 작업은 그대로 유지됩니다."); }
    finally { event.target.value = ""; }
  }

  if (!project) return <main className="boot">작업을 불러오고 있어요…</main>;

  const completedTranslations = LANGUAGES.filter((l) => project.translations[l].status === "done").length;
  const allText = [
    `[한국어]\n${project.sourceText}`,
    ...LANGUAGES.filter((l) => project.translations[l].text).map((l) => `[${LANGUAGE_NAME[l]}]\n${project.translations[l].text}\n\n제목: ${project.translations[l].title}\n${project.translations[l].hashtags.join(" ")}`),
  ].join("\n\n---\n\n");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div><div className="brand">AI Story Studio</div><button className="primary full" onClick={createNew}>＋ 새 작업</button></div>
        <nav className="steps" aria-label="작업 단계">
          <Step active={project.stage === "story"} done={project.stage !== "story"} label="① 이야기 만들기" />
          <Step active={project.stage === "proofread"} done={["localize", "completed"].includes(project.stage)} label="② 녹음 확인" />
          <Step active={["localize", "completed"].includes(project.stage)} done={project.stage === "completed"} label="③ 해외용 만들기" />
        </nav>
        <div className="recent-title">최근 작업</div>
        <div className="recent-list">
          {projects.slice(0, 8).map((p) => <button key={p.id} className={`recent-item ${p.id === project.id ? "selected" : ""}`} onClick={() => { setActiveId(p.id); setCurrentLanguage(undefined); setProposal(null); }}><span>{p.title}</span><small>{MODE_NAME[p.contentMode]} · {p.stage === "completed" ? "완료" : "작업 중"}</small></button>)}
        </div>
        <div className="backup-actions"><button className="secondary full" onClick={downloadBackup}>작업 백업</button><button className="text-button full" onClick={() => importRef.current?.click()}>백업 불러오기</button><input ref={importRef} hidden type="file" accept="application/json" onChange={importBackup} /></div>
      </aside>

      <section className="workspace">
        {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError("")} aria-label="오류 닫기">×</button></div>}
        {project.stage === "story" && <StoryStep project={project} topics={topics} busy={busy} copied={copied} onRefreshTopics={refreshTopics} onPatch={updateProject} onCreate={createStory} onRevise={reviseSource} onCopy={copyText} onFinish={finishStory} />}
        {project.stage === "proofread" && <ProofreadStep project={project} file={file} dragging={dragging} busy={busy} onFile={chooseFile} onDrag={setDragging} onPatch={updateProject} onTranscribe={transcribe} onProofread={proofread} onNext={startLocalization} />}
        {(project.stage === "localize" || project.stage === "completed") && <LocalizeStep project={project} busy={busy} copied={copied} currentLanguage={currentLanguage} completed={completedTranslations} onSelect={setCurrentLanguage} onRetry={localizeLanguage} onCopy={copyText} onCopyAll={() => copyText("all", allText)} />}
      </section>

      <aside className="assistant-panel">
        <div className="assistant-head"><div><strong>AI 도우미</strong><small>{currentLanguage ? `${LANGUAGE_NAME[currentLanguage]} 작업 중` : "현재 원고를 알고 있어요"}</small></div></div>
        <div className="chat-log">
          {project.chatHistory.length === 0 && <div className="chat-empty">“1100자로 줄여줘”<br />“다른 비유로 바꿔줘”<br />“일본어를 자연스럽게 고쳐줘”</div>}
          {project.chatHistory.map((m) => <div key={m.id} className={`bubble ${m.role}`}>{m.content}</div>)}
        </div>
        {proposal && <div className="proposal"><strong>AI 수정안</strong><details><summary>기존 글 보기</summary><div className="proposal-old">{proposal.target === "source" ? project.sourceText : project.translations[proposal.target].text}</div></details><textarea value={proposal.text} readOnly /><div className="row"><button className="primary" onClick={applyProposal}>적용</button><button className="secondary" onClick={() => setProposal(null)}>취소</button></div></div>}
        <div className="chat-input"><textarea aria-label="AI에게 요청" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendChat(); } }} placeholder="무엇을 바꿀까요?" /><button className="primary" onClick={() => void sendChat()} disabled={busy === "chat" || !chatInput.trim()}>{busy === "chat" ? "답변 중…" : "보내기"}</button></div>
      </aside>
    </main>
  );
}

function Step({ active, done, label }: { active: boolean; done: boolean; label: string }) { return <div className={`step ${active ? "active" : ""} ${done ? "done" : ""}`}><span>{label}</span>{done && <small>✓</small>}</div>; }

function StoryStep({ project, topics, busy, copied, onRefreshTopics, onPatch, onCreate, onRevise, onCopy, onFinish }: {
  project: Project; topics: string[]; busy: string | null; copied: string; onRefreshTopics: () => Promise<void>; onPatch: (p: Partial<Project>) => void; onCreate: () => Promise<void>; onRevise: (i?: string) => Promise<void>; onCopy: (k: string, t: string) => Promise<void>; onFinish: () => void;
}) {
  return <div className="stage-wrap"><header><span className="eyebrow">STEP 1</span><h1>오늘은 어떤 이야기를 만들어볼까요?</h1><p>주제를 고르고 스타일과 분량만 정하면 됩니다.</p></header>
    <section className="section"><div className="section-title"><h2>주제 선택</h2><button className="text-button" onClick={() => void onRefreshTopics()} disabled={busy === "topics"}>{busy === "topics" ? "추천 중…" : "새 추천 받기"}</button></div><div className="topic-grid">{topics.map((t) => <button key={t} className={`topic ${project.topic === t ? "picked" : ""}`} onClick={() => onPatch({ topic: t })}>{t}</button>)}</div><label className="field"><span>직접 입력</span><input value={project.topic} onChange={(e) => onPatch({ topic: e.target.value })} placeholder="원하는 주제를 직접 적어주세요" /></label></section>
    <section className="section compact-grid"><label className="field"><span>스타일</span><select value={project.contentMode} onChange={(e) => onPatch({ contentMode: e.target.value as ContentMode })}><option value="inspired_buddha">부처님 말씀 느낌</option><option value="inspired_jesus">예수님 말씀 느낌</option><option value="general">일반 위로글</option></select></label><label className="field"><span>분량</span><select value={project.targetLength} onChange={(e) => onPatch({ targetLength: Number(e.target.value) })}><option value={800}>800자</option><option value={1000}>1000자</option><option value={1100}>1100자</option><option value={1500}>1500자</option></select></label></section>
    {!project.sourceText ? <button className="primary hero-action" onClick={() => void onCreate()} disabled={busy === "story" || !project.topic.trim()}>{busy === "story" ? "이야기를 만들고 있어요…" : "이 이야기 만들기"}</button> : <section className="section editor-section"><div className="section-title"><h2>완성 원고</h2><span className="count">{countGraphemes(project.sourceText).toLocaleString("ko-KR")}자 · 목표 {project.targetLength.toLocaleString("ko-KR")}자</span></div><textarea className="story-editor" value={project.sourceText} onChange={(e) => onPatch({ sourceText: e.target.value })} /><div className="action-bar"><div className="row"><button className="secondary" onClick={() => void onCopy("ko", project.sourceText)}>{copied === "ko" ? "복사했어요 ✓" : "복사"}</button><button className="secondary" onClick={() => void onCreate()} disabled={busy === "story"}>다시 만들기</button><button className="secondary" onClick={() => void onRevise("다른 비유로 바꿔줘")} disabled={busy === "revise"}>{busy === "revise" ? "수정안 만드는 중…" : "다른 비유 제안"}</button></div><button className="primary" onClick={onFinish}>✓ 완성하고 다음</button></div></section>}
  </div>;
}

function ProofreadStep({ project, file, dragging, busy, onFile, onDrag, onPatch, onTranscribe, onProofread, onNext }: {
  project: Project; file: File | null; dragging: boolean; busy: string | null; onFile: (f: File | null) => void; onDrag: (v: boolean) => void; onPatch: (p: Partial<Project>) => void; onTranscribe: () => Promise<void>; onProofread: () => Promise<void>; onNext: () => Promise<void>;
}) {
  return <div className="stage-wrap"><header><span className="eyebrow">STEP 2</span><h1>녹음이 원문과 같은지 확인해요</h1><p>문장을 예쁘게 고치지 않고, 실제로 다르게 읽힌 부분만 찾습니다.</p></header>
    <section className="section"><h2>원문</h2><div className="source-preview">{project.sourceText}</div></section>
    <section className="section"><h2>녹음</h2><label className={`dropzone ${dragging ? "dragging" : ""}`} onDragEnter={(e: DragEvent) => { e.preventDefault(); onDrag(true); }} onDragOver={(e: DragEvent) => e.preventDefault()} onDragLeave={() => onDrag(false)} onDrop={(e: DragEvent) => { e.preventDefault(); onDrag(false); onFile(e.dataTransfer.files?.[0] || null); }}><input type="file" accept=".mp3,.wav,.m4a,.flac,.ogg,.webm,.mp4,audio/*,video/mp4" onChange={(e) => onFile(e.target.files?.[0] || null)} /><strong>{file ? file.name : "파일을 끌어놓거나 선택하세요"}</strong><span>MP3 · WAV · M4A · FLAC · OGG · WEBM · MP4 / 25MB 이하</span></label><button className="primary" onClick={() => void onTranscribe()} disabled={!file || busy === "transcribe"}>{busy === "transcribe" ? "녹음을 글로 옮기고 있어요…" : "녹음 확인하기"}</button></section>
    <section className="section"><div className="section-title"><h2>전사문</h2><span className="muted">직접 수정 가능</span></div><textarea className="transcript-editor" value={project.transcript} onChange={(e) => onPatch({ transcript: e.target.value, proofread: null })} placeholder="전사 결과가 여기에 표시됩니다." /><button className="primary" onClick={() => void onProofread()} disabled={!project.transcript || busy === "proofread"}>{busy === "proofread" ? "원문과 녹음을 비교하고 있어요…" : "원문과 비교하기"}</button></section>
    {project.proofread && <section className="section result-box">{project.proofread.hasDifferences ? <><h2>오타 {project.proofread.differences.length}개</h2>{project.proofread.differences.map((d, i) => <div className="diff" key={`${d.type}-${i}`}><div className="bad">❌ 녹음: {d.actual || "(없음)"}</div><div className="good">✅ 원문: {d.expected || "(없음)"}</div><small>{d.context}</small></div>)}</> : <div className="no-diff">오타 없음 ✓</div>}<button className="primary hero-action" onClick={() => void onNext()}>완성하고 해외용 만들기</button></section>}
  </div>;
}

function LocalizeStep({ project, busy, copied, currentLanguage, completed, onSelect, onRetry, onCopy, onCopyAll }: {
  project: Project; busy: string | null; copied: string; currentLanguage?: Language; completed: number; onSelect: (l: Language) => void; onRetry: (l: Language) => Promise<boolean>; onCopy: (k: string, t: string) => Promise<void>; onCopyAll: () => void;
}) {
  const opened = currentLanguage || LANGUAGES.find((l) => project.translations[l].status !== "idle") || "en";
  return <div className="stage-wrap"><header><span className="eyebrow">STEP 3</span><h1>해외용을 만들고 있어요</h1><p>{completed}/4개 언어 완료. 한 언어가 실패해도 나머지 결과는 유지됩니다.</p></header>
    <div className="progress-list">{LANGUAGES.map((l) => { const t = project.translations[l]; const status = t.status === "done" ? "✓ 완료" : t.status === "loading" ? "● 생성 중…" : t.status === "error" ? "! 실패" : "○ 대기"; return <button key={l} className={`progress-item ${opened === l ? "active" : ""}`} onClick={() => onSelect(l)}><span>{LANGUAGE_FLAG[l]} {LANGUAGE_NAME[l]}</span><small>{status}</small></button>; })}</div>
    {LANGUAGES.map((l) => { const t = project.translations[l]; if (opened !== l) return null; return <section className="section language-card" key={l}><div className="section-title"><h2>{LANGUAGE_FLAG[l]} {LANGUAGE_NAME[l]}</h2><span className="count">{t.text ? `${countGraphemes(t.text).toLocaleString("ko-KR")}자` : ""}</span></div>{t.status === "loading" && <div className="loading-panel">{LANGUAGE_NAME[l]} 번역 중…</div>}{t.status === "error" && <div className="error-panel"><p>{t.error || "이 언어만 다시 만들어주세요."}</p><button className="primary" onClick={() => void onRetry(l)}>다시 시도</button></div>}{t.status === "idle" && <div className="loading-panel">순서가 오면 자동으로 시작합니다.</div>}{t.status === "done" && <><div className="translation-text">{t.text}</div><div className="row"><button className="secondary" onClick={() => void onCopy(`body-${l}`, t.text)}>{copied === `body-${l}` ? "복사했어요 ✓" : "번역문 복사"}</button><button className="secondary" onClick={() => void onRetry(l)}>다시 번역</button></div><div className="meta-block"><span>제목</span><strong>{t.title}</strong><button className="text-button" onClick={() => void onCopy(`title-${l}`, t.title)}>{copied === `title-${l}` ? "복사했어요 ✓" : "제목 복사"}</button></div><div className="meta-block"><span>해시태그</span><p>{t.hashtags.join(" ")}</p><button className="text-button" onClick={() => void onCopy(`tags-${l}`, t.hashtags.join(" "))}>{copied === `tags-${l}` ? "복사했어요 ✓" : "해시태그 복사"}</button></div></>}</section>; })}
    <section className="section final-copy"><h2>완성 결과</h2><div className="copy-grid"><button className="secondary" onClick={() => void onCopy("final-ko", project.sourceText)}>한국어 복사</button>{LANGUAGES.map((l) => <button key={l} className="secondary" disabled={!project.translations[l].text} onClick={() => void onCopy(`final-${l}`, project.translations[l].text)}>{LANGUAGE_NAME[l]} 복사</button>)}</div><button className="primary full" onClick={onCopyAll}>{copied === "all" ? "전체 결과 복사했어요 ✓" : "전체 결과 복사"}</button>{busy === "localize" && <p className="muted centered">완료된 언어부터 바로 사용할 수 있어요.</p>}</section>
  </div>;
}
