import { describe, expect, it } from 'vitest';
import { countLines } from '../src/digest/counts.js';

const l = (job: string, status: string) => JSON.stringify({ at: '2026-10-28T01:00:00+01:00', job, status });

describe('countLines', () => {
  it('counts per line, not per job, and skips bad lines', () => {
    const text = [l('a', 'retry'), l('a', 'ok'), l('b', 'fail'), 'junk', ''].join('\n');
    expect(countLines(text)).toEqual({ ok: 1, retry: 1, fail: 1 });
  });
});
