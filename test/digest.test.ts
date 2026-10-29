import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('run log reader', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28')!;
    expect(n.badLines).toBe(1);
    expect(n.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    const refresh = n.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(refresh).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null });
    expect(n.rows.find((r) => r.job === 'notes/backup')).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
    expect(n.rows.find((r) => r.job === 'digest/render')!.owner).toBeNull();
    const sync = n.rows.find((r) => r.job === 'lane/sync')!;
    expect(sync.firstAt).toBe('2026-10-28T23:00:06+01:00');
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });

  it('an empty file is a night with no rows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
  });
});
