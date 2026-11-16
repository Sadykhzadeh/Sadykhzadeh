import { expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('a run that cannot read its template exits non-zero', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'readme-run-'));
  const run = Bun.spawn([process.execPath, join(import.meta.dir, 'index.ts')], {
    cwd: empty,
    stdout: 'ignore',
    stderr: 'ignore',
  });
  expect(await run.exited).not.toBe(0);
});
