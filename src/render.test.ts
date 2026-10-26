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

test('markdown and html metacharacters in a title stay literal', () => {
  expect(mdLink('a|b *c* _d_ `e` <T> & f\\g', 'https://x/y')).toBe(
    '[a\\|b \\*c\\* \\_d\\_ \\`e\\` \\<T\\> \\& f\\\\g](https://x/y)',
  );
});
