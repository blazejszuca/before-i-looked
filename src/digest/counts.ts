import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './reader.js';

export type Counts = { ok: number; retry: number; fail: number };

// Per-line status counts for one night's text. Malformed lines are skipped.
export function countLines(text: string): Counts {
  const c: Counts = { ok: 0, retry: 0, fail: 0 };
  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue;
    const l = parseLine(raw);
    if (l) c[l.status]++;
  }
  return c;
}

// null when the night's file can't be read.
export function countNight(runsDir: string, night: string): Counts | null {
  try {
    return countLines(readFileSync(join(runsDir, `${night}.jsonl`), 'utf8'));
  } catch {
    return null;
  }
}
