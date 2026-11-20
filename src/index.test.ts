import { expect, spyOn, test } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { main, projectRoot } from './index';

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

test('an empty template fails the run and keeps the old README', async () => {
  const root = project('  \n', 'old readme');
  expect(await main(root, sources)).toBe(1);
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe('old readme');
});

test('a template placeholder without data fails the run and keeps the old README', async () => {
  const root = project('<$tgfo$>', 'old readme');
  expect(await main(root, sources)).toBe(1);
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe('old readme');
});

test('a dry run prints the new README to stdout and leaves the file alone', async () => {
  const template = 'blog <$blog_posts$>';
  const root = project(template, 'old readme');
  const printed: string[] = [];
  const write = spyOn(process.stdout, 'write').mockImplementation((chunk: string | Uint8Array) => {
    printed.push(String(chunk));
    return true;
  });
  try {
    expect(await main(root, sources, true)).toBe(0);
  } finally {
    write.mockRestore();
  }
  expect(printed.join('')).toBe('blog like [Faker.js story](https://azer.one/posts/faker-js)');
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe('old readme');
});

test('titles with table, html and link syntax stay literal in the README', async () => {
  const template = '<$tginfo$>\n<$blog_posts$>';
  const root = project(template, '');
  const telegram = async (url: string) => url.includes('tginfoen')
    ? [{ title: 'a|b `c` <d>', url: 'https://t.me/tginfoen/2' }, { title: 'x] y', url: 'https://t.me/tginfoen/1' }]
    : [{ title: 'ru | <i>', url: 'https://t.me/tginfo/2' }, { title: 'ru ]', url: 'https://t.me/tginfo/1' }];
  const blog = async () => [{ title: 'Fish & `chips`', url: 'https://azer.one/posts/fish' }, { title: '[x]', url: 'https://azer.one/posts/x' }];
  expect(await main(root, { telegram, blog })).toBe(0);
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(
    'we write about [a\\|b \\`c\\` \\<d\\>](https://t.me/tginfoen/2) or [x\\] y](https://t.me/tginfoen/1). (in Russian too! [ru \\| \\<i\\>](https://t.me/tginfo/2) and [ru \\]](https://t.me/tginfo/1))\n'
    + 'like [Fish \\& \\`chips\\`](https://azer.one/posts/fish) or [\\[x\\]](https://azer.one/posts/x)',
  );
});

test('the script writes the README from any working directory', async () => {
  const proc = Bun.spawn([process.execPath, join(projectRoot, 'src', 'index.ts'), '--dry-run'], {
    cwd: mkdtempSync(join(tmpdir(), 'readme-cwd-')),
    env: { ...process.env, HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  expect(code).toBe(0);
  expect(out).toContain('<div align="left">');
  expect(out).not.toContain('<$');
});

test('an unknown argument exits non-zero without touching the README', async () => {
  const before = readFileSync(join(projectRoot, 'README.md'), 'utf8');
  const proc = Bun.spawn([process.execPath, join(projectRoot, 'src', 'index.ts'), '--dryrun'], {
    cwd: mkdtempSync(join(tmpdir(), 'readme-arg-')),
    env: { ...process.env, HTTP_PROXY: 'http://127.0.0.1:9', HTTPS_PROXY: 'http://127.0.0.1:9' },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  expect(code).toBe(2);
  expect(out).toBe('');
  expect(readFileSync(join(projectRoot, 'README.md'), 'utf8')).toBe(before);
});

test('--help prints the usage and exits 0 without touching the README', async () => {
  const before = readFileSync(join(projectRoot, 'README.md'), 'utf8');
  const proc = Bun.spawn([process.execPath, join(projectRoot, 'src', 'index.ts'), '--help'], {
    cwd: mkdtempSync(join(tmpdir(), 'readme-help-')),
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [out, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  expect(code).toBe(0);
  expect(out).toContain('Usage: bun src/index.ts [--dry-run]');
  expect(readFileSync(join(projectRoot, 'README.md'), 'utf8')).toBe(before);
});

test('a run without blog posts reads as "and check it out" in the blog sentence', async () => {
  const root = project('my blog, <$blog_posts$> check it out', '');
  expect(await main(root, { ...sources, blog: async () => [] })).toBe(0);
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe('my blog, and check it out');
});

test('a single telegram post is not enough for the post sentence, so the channel links are used', async () => {
  const root = project('<$tginfo$>', '');
  expect(await main(root, { ...sources, telegram: async () => [posts[0]] })).toBe(0);
  expect(readFileSync(join(root, 'README.md'), 'utf8')).toBe(
    'you can follow our Telegram channels: [@tginfoen](https://t.me/tginfoen) and [@tginfo](https://t.me/tginfo)',
  );
});
