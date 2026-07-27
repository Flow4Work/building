import type { Project } from "./types";

const KEY = "ai-story-studio.projects.v1";

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

export function saveProjects(projects: Project[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(projects));
}

export function exportProjects(projects: Project[]): Blob {
  return new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), projects }, null, 2)], { type: "application/json" });
}

export async function fallbackCopy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (!ok) throw new Error("copy_failed");
  }
}
