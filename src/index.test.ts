import { expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main } from './index';

const posts = [
  { title: 'first', url: 'https://t.me/chan/1' },
  { title: 'second', url: 'https://t.me/chan/2' },
];

const sources = {
  telegram: async () => posts,
  blog: async () => [{ title: 'Faker.js story', url: 'https://azer.one/posts/faker-js' }],
};

const project = (template: string | null, readme: string) => {
  const root = mkdtempSync(join(tmpdir(), 'readme-run-'));
  if (template !== null) {
    mkdirSync(join(root, 'assets'));
    writeFileSync(join(root, 'assets', 'template.md'), template);
  }
  writeFileSync(join(root, 'README.md'), readme);
  return root;
};

test('a run that cannot read its template exits non-zero and leaves the README alone', async () => {
  const root = project(null, 'old readme');
  expect(await main(root, sources)).toBe(1);
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe('old readme');
});

test('a run fills the template and keeps the stats block from the previous README', async () => {
  const template = [
    'intro',
    '<!--START_SECTION:waka-->',
    '<!--END_SECTION:waka-->',
    'blog <$blog_posts$>, telegram <$tginfo$>, <$time$>',
  ].join('\n');
  const readme = 'x<!--START_SECTION:waka-->stats 12h<!--END_SECTION:waka-->y';
  const root = project(template, readme);

  expect(await main(root, sources)).toBe(0);

  const out = readFileSync(join(root, 'README.md'), 'utf8');
  expect(out).toContain('<!--START_SECTION:waka-->stats 12h<!--END_SECTION:waka-->');
  expect(out).toContain('blog like [Faker.js story](https://azer.one/posts/faker-js)');
  expect(out).toContain('telegram we write about [first](https://t.me/chan/1) or [second](https://t.me/chan/2)');
  expect(out).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \(UTC time\)/);
  expect(out).not.toContain('<$');
});

test('a run without telegram posts falls back to the channel links', async () => {
  const root = project('<$tginfo$>', '');
  expect(await main(root, { ...sources, telegram: async () => [] })).toBe(0);
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toContain(
    'you can follow our Telegram channels: [@tginfoen](https://t.me/tginfoen) and [@tginfo](https://t.me/tginfo)',
  );
});
