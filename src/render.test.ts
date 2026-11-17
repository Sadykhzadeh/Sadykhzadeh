import { expect, test } from 'bun:test';
import { mdLink, fill, keepSection } from './render';

test('brackets in a title do not break the link', () => {
  expect(mdLink('[Update] v2', 'https://t.me/x/1')).toBe('[\\[Update\\] v2](https://t.me/x/1)');
});

test('fill keeps $ sequences from the values as they are', () => {
  const out = fill('a <$x$> b', { x: "costs $& and $' and $1" });
  expect(out).toBe("a costs $& and $' and $1 b");
});

const section = (body: string) => `a\n<!--START_SECTION:waka-->${body}<!--END_SECTION:waka-->\nb`;

test('keepSection carries the previous section body into the template', () => {
  expect(keepSection(section('\n'), section('\nstats $&\n'), 'waka')).toBe(section('\nstats $&\n'));
});

test('keepSection leaves the template alone without a previous section', () => {
  expect(keepSection(section('\n'), 'no markers here', 'waka')).toBe(section('\n'));
  expect(keepSection('no markers', section('x'), 'waka')).toBe('no markers');
});

test('tildes in a title do not turn the link text into strikethrough', () => {
  expect(mdLink('~~old~~ news', 'https://x/y')).toBe('[\\~\\~old\\~\\~ news](https://x/y)');
});

test('markdown and html metacharacters in a title stay literal', () => {
  expect(mdLink('a|b *c* _d_ `e` <T> & f\\g', 'https://x/y')).toBe(
    '[a\\|b \\*c\\* \\_d\\_ \\`e\\` \\<T\\> \\& f\\\\g](https://x/y)',
  );
});

test('a url with parentheses, spaces or angle brackets stays one link destination', () => {
  expect(mdLink('Parens', 'https://azer.one/posts/a(b)c')).toBe('[Parens](https://azer.one/posts/a%28b%29c)');
  expect(mdLink('Spaces', 'https://x/a b<c>')).toBe('[Spaces](https://x/a%20b%3Cc%3E)');
  expect(mdLink('Control', 'https://x/a\tb\n')).toBe('[Control](https://x/a%09b%0A)');
});

test('an already encoded url is not encoded twice', () => {
  expect(mdLink('Done', 'https://x/a%28b%29%20c')).toBe('[Done](https://x/a%28b%29%20c)');
});

test('query string and fragment are kept as they are', () => {
  expect(mdLink('Query', 'https://x/p?q=a+b&r=1%202#top-(1)')).toBe(
    '[Query](https://x/p?q=a+b&r=1%202#top-%281%29)',
  );
});

test('a placeholder without a value stops the run instead of reaching the README', () => {
  expect(() => fill('a <$tginfo$> b <$tgfo$>', { tginfo: 'x' })).toThrow('<$tgfo$>');
});

test('a placeholder name with a hyphen is still checked against the values', () => {
  expect(() => fill('a <$blog-posts$> b', { blog_posts: 'x' })).toThrow('<$blog-posts$>');
});
