export function countGraphemes(input: string): number {
  const SegmenterCtor = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: "grapheme" }) => { segment(value: string): Iterable<unknown> } }).Segmenter;
  if (SegmenterCtor) {
    return Array.from(new SegmenterCtor(undefined, { granularity: "grapheme" }).segment(input)).length;
  }
  return Array.from(input.normalize("NFC")).length;
}

export function withinTarget(input: string, target: number, tolerance = 30): boolean {
  const length = countGraphemes(input);
  return length >= target - tolerance && length <= target + tolerance;
}
