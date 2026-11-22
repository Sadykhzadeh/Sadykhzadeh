import { expect, test } from 'bun:test';
import { mdLink, fill, keepSection, clip, hasText } from './render';

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

test('keepSection carries a section that starts the previous README', () => {
  expect(keepSection(section('\n'), '<!--START_SECTION:waka-->stats<!--END_SECTION:waka-->', 'waka')).toBe(section('stats'));
});

test('keepSection leaves the template alone without a previous section', () => {
  expect(keepSection(section('\n'), 'no markers here', 'waka')).toBe(section('\n'));
  expect(keepSection('no markers', section('x'), 'waka')).toBe('no markers');
});

test('keepSection leaves the template alone when the previous section has only one marker', () => {
  expect(keepSection(section('\n'), 'x<!--START_SECTION:waka-->stats', 'waka')).toBe(section('\n'));
  expect(keepSection(section('\n'), 'x<!--END_SECTION:waka-->stats', 'waka')).toBe(section('\n'));
  expect(keepSection(section('\n'), 'x'.repeat(30) + '<!--END_SECTION:waka-->stats', 'waka')).toBe(section('\n'));
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
  expect(mdLink('Edges', 'https://x/a\x1fb\x7fc')).toBe('[Edges](https://x/a%1Fb%7Fc)');
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

test('angle brackets around text with a space are not a placeholder', () => {
  expect(fill('a <$blog posts$> b', {})).toBe('a <$blog posts$> b');
});

test('a backslash in a url cannot escape the closing parenthesis of the link', () => {
  expect(mdLink('Trailing', 'https://azer.one/posts/a\\')).toBe('[Trailing](https://azer.one/posts/a%5C)');
});

test('a long title is cut between emoji, not inside a flag or a joined sequence', () => {
  expect(clip('a'.repeat(118) + '🇦🇿xyz')).toBe('a'.repeat(118) + '🇦🇿…');
  expect(clip('a'.repeat(117) + '👨‍👩‍👧 tail tail')).toBe('a'.repeat(117) + '👨‍👩‍👧…');
});

test('a long title is cut at a space only when that keeps most of it', () => {
  expect(clip('Read ' + 'x'.repeat(200))).toBe('Read ' + 'x'.repeat(114) + '…');
  expect(clip('y'.repeat(70) + ' ' + 'z'.repeat(100))).toBe('y'.repeat(70) + '…');
});

test('a space at or before the halfway point does not end a long title', () => {
  expect(clip('y'.repeat(50) + ' ' + 'z'.repeat(100))).toBe('y'.repeat(50) + ' ' + 'z'.repeat(68) + '…');
  expect(clip('y'.repeat(60) + ' ' + 'z'.repeat(100))).toBe('y'.repeat(60) + ' ' + 'z'.repeat(58) + '…');
});

test('the halfway point for a space counts characters as they look, not code units', () => {
  expect(clip('😀'.repeat(45) + ' ' + 'z'.repeat(100))).toBe('😀'.repeat(45) + ' ' + 'z'.repeat(73) + '…');
});

test('a title of exactly the limit is kept whole', () => {
  expect(clip('b'.repeat(120))).toBe('b'.repeat(120));
  expect(clip('b'.repeat(121))).toBe('b'.repeat(119) + '…');
});

test('a title far over the limit is cut once to the limit, not scanned in full', () => {
  expect(clip('x'.repeat(200_000))).toBe('x'.repeat(119) + '…');
  expect(clip('word '.repeat(50_000)).length).toBeLessThanOrEqual(120);
});

test('hasText is false for a string of only zero-width characters', () => {
  expect(hasText('​‌ ﻿')).toBe(false);
  expect(hasText('​ x')).toBe(true);
});

test('hasText is false for blank spacers that render as nothing', () => {
  expect(hasText('⠀')).toBe(false);
  expect(hasText('ㅤ ﾠ')).toBe(false);
  expect(hasText('‎‏')).toBe(false);
  expect(hasText('­️')).toBe(false);
  expect(hasText('⠀ x')).toBe(true);
});

test('hasText is false for bidi controls and invisible operators on their own', () => {
  expect(hasText('\u202a\u202c')).toBe(false);
  expect(hasText('\u2066\u2069')).toBe(false);
  expect(hasText('\u2061\u2062\u2063\u2064')).toBe(false);
  expect(hasText('\u202e x')).toBe(true);
  expect(hasText('\u2062 x')).toBe(true);
});

test('hasText is false for Hangul fillers on their own', () => {
  expect(hasText('ᅟ')).toBe(false);
  expect(hasText('ᅠᅠ')).toBe(false);
  expect(hasText('ᅠ x')).toBe(true);
});
