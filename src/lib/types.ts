export type ContentMode = "inspired_buddha" | "inspired_jesus" | "general";
export type Stage = "story" | "proofread" | "localize" | "completed";
export type Language = "en" | "ja" | "zh" | "th";
export type TranslationStatus = "idle" | "loading" | "done" | "error";
export type QaStatus = "idle" | "pass" | "fail";

export type Difference = {
  type: "missing" | "added" | "changed";
  expected: string;
  actual: string;
  context: string;
};

export type ProofreadResult = {
  hasDifferences: boolean;
  differences: Difference[];
};

export type Translation = {
  language: Language;
  text: string;
  status: TranslationStatus;
  qaStatus: QaStatus;
  title: string;
  hashtags: string[];
  error?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type RevisionProposal = {
  text: string;
  target: "source" | Language;
  reason: string;
};

export type Project = {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  topic: string;
  contentMode: ContentMode;
  targetLength: number;
  stage: Stage;
  sourceText: string;
  transcript: string;
  proofread: ProofreadResult | null;
  translations: Record<Language, Translation>;
  chatHistory: ChatMessage[];
  recentEdits: string[];
};
