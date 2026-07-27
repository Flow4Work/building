import type { Difference } from "./types";

type Token = { value: string; comparable: string; kind: "word" | "space" | "punct" };

function classify(value: string): Token["kind"] {
  if (/^\s+$/u.test(value)) return "space";
  if (/^[\p{L}\p{N}'’]+$/u.test(value)) return "word";
  return "punct";
}

function tokenize(input: string): Token[] {
  const normalized = input.normalize("NFC");
  const values = normalized.match(/[\p{L}\p{N}'’]+|\s+|[^\p{L}\p{N}\s]/gu) ?? [];
  return values.map((value) => ({ value, comparable: value.replace(/’/g, "'").toLocaleLowerCase(), kind: classify(value) }));
}

export function comparableSpeechTokens(input: string): string[] {
  return tokenize(input).filter((t) => t.kind === "word").map((t) => t.comparable);
}

export function strictSpeechDiff(source: string, transcript: string): Difference[] {
  const a = tokenize(source).filter((t) => t.kind === "word");
  const b = tokenize(transcript).filter((t) => t.kind === "word");
  if (a.map((x) => x.comparable).join("\u0000") === b.map((x) => x.comparable).join("\u0000")) return [];

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) dp[i][0] = i;
  for (let j = 0; j < cols; j++) dp[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1].comparable === b[j - 1].comparable ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  const diffs: Difference[] = [];
  let i = a.length, j = b.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1].comparable === b[j - 1].comparable) { i--; j--; continue; }
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      diffs.push({ type: "changed", expected: a[i - 1].value, actual: b[j - 1].value, context: contextFor(a, i - 1) }); i--; j--; continue;
    }
    if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      diffs.push({ type: "missing", expected: a[i - 1].value, actual: "", context: contextFor(a, i - 1) }); i--; continue;
    }
    if (j > 0) {
      diffs.push({ type: "added", expected: "", actual: b[j - 1].value, context: contextFor(a, Math.max(0, i - 1)) }); j--; continue;
    }
  }
  return diffs.reverse();
}

function contextFor(tokens: Token[], index: number): string {
  return tokens.slice(Math.max(0, index - 5), Math.min(tokens.length, index + 6)).map((t) => t.value).join(" ");
}
