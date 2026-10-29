import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

type Api = { night: string; rows: { job: string }[]; badLines: number };

const line = (at: string, job: string, status: string, extra: object = {}) =>
  JSON.stringify({ at, job, status, ...extra });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  const good = [
    line('2026-01-01T01:00:00+01:00', 'zeta-job', 'ok', { owner: 'ann' }),
    line('2026-01-01T02:00:00+01:00', 'alpha-job', 'ok'),
    line('2026-01-01T03:00:00+01:00', 'mid-job', 'fail', { error: 'boom' }),
  ];
  fs.writeFileSync(path.join(dir, '2026-01-01.jsonl'), good.join('\n') + '\n');
  fs.writeFileSync(path.join(dir, '2026-01-02.jsonl'), '');
  fs.writeFileSync(
    path.join(dir, '2026-01-03.jsonl'),
    [good[0], 'not json at all', good[1]].join('\n') + '\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-01-01T00:00:00+01:00',
    beatEverySeconds: 60,
    runsDir: dir,
  });
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('digest routes', () => {
  it('serves a night with data as HTML and JSON, same order', async () => {
    const page = await app.request('/digest/2026-01-01');
    const html = await page.text();
    expect(page.status).toBe(200);
    const api = await app.request('/api/digest/2026-01-01');
    expect(api.status).toBe(200);
    const body = (await api.json()) as Api;
    expect(body.night).toBe('2026-01-01');
    expect(body.badLines).toBe(0);
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toHaveLength(3);
    const pos = jobs.map((j) => html.indexOf(j));
    expect(pos.every((p) => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it('404s for a night with no file', async () => {
    const page = await app.request('/digest/2026-02-02');
    expect(page.status).toBe(404);
    expect(await page.text()).toContain('no run log');
    const api = await app.request('/api/digest/2026-02-02');
    expect(api.status).toBe(404);
  });

  it('handles the empty night', async () => {
    const page = await app.request('/digest/2026-01-02');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const api = await app.request('/api/digest/2026-01-02');
    expect(api.status).toBe(200);
    expect(((await api.json()) as Api).rows).toEqual([]);
  });

  it('counts a bad line, still 200, and notes it on the page', async () => {
    const page = await app.request('/digest/2026-01-03');
    expect(page.status).toBe(200);
    expect(await page.text()).toMatch(/1 line didn(&#39;|')t parse/);
    const api = await app.request('/api/digest/2026-01-03');
    expect(api.status).toBe(200);
    const body = (await api.json()) as Api;
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(2);
  });
});
