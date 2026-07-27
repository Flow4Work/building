import { z } from "zod";

export const TopicRecommendationsSchema = z.object({ topics: z.array(z.string().min(2)).min(1).max(6) });
export const StorySchema = z.object({ text: z.string().min(1) });
export const TranslationSchema = z.object({ text: z.string().min(1) });
export const DifferenceSchema = z.object({
  type: z.enum(["missing", "added", "changed"]),
  expected: z.string(),
  actual: z.string(),
  context: z.string(),
});
export const ProofreadSchema = z.object({ hasDifferences: z.boolean(), differences: z.array(DifferenceSchema) });
export const TranslationQaSchema = z.object({
  status: z.enum(["PASS", "FAIL"]),
  issues: z.array(z.object({ type: z.string(), detail: z.string() })).default([]),
});
export const MetadataSchema = z.object({
  title: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(1).max(15),
});
export const ChatSchema = z.object({
  intent: z.enum(["generate", "revise", "shorten", "expand", "translate", "proofread", "metadata", "question"]),
  message: z.string().min(1),
  proposal: z.string().optional(),
  proposalTarget: z.enum(["source", "en", "ja", "zh", "th"]).optional(),
});

const LanguageSchema = z.enum(["en", "ja", "zh", "th"]);
const TranslationProjectSchema = z.object({
  language: LanguageSchema,
  text: z.string(),
  status: z.enum(["idle", "loading", "done", "error"]),
  qaStatus: z.enum(["idle", "pass", "fail"]),
  title: z.string(),
  hashtags: z.array(z.string()),
  error: z.string().optional(),
});
const ChatMessageSchema = z.object({
  id: z.string(), role: z.enum(["user", "assistant"]), content: z.string(), createdAt: z.string(),
});
export const ProjectSchema = z.object({
  id: z.string(), createdAt: z.string(), updatedAt: z.string(), title: z.string(), topic: z.string(),
  contentMode: z.enum(["inspired_buddha", "inspired_jesus", "general"]),
  targetLength: z.number().int().min(300).max(3000),
  stage: z.enum(["story", "proofread", "localize", "completed"]),
  sourceText: z.string(), transcript: z.string(), proofread: ProofreadSchema.nullable(),
  translations: z.object({ en: TranslationProjectSchema, ja: TranslationProjectSchema, zh: TranslationProjectSchema, th: TranslationProjectSchema }),
  chatHistory: z.array(ChatMessageSchema), recentEdits: z.array(z.string()),
});
export const BackupSchema = z.object({ version: z.literal(1), exportedAt: z.string(), projects: z.array(ProjectSchema) });
