import { expect, test } from 'bun:test';
import { mdLink, fill } from './render';

test('brackets in a title do not break the link', () => {
  expect(mdLink('[Update] v2', 'https://t.me/x/1')).toBe('[\\[Update\\] v2](https://t.me/x/1)');
});

test('fill keeps $ sequences from the values as they are', () => {
  const out = fill('a <$x$> b', { x: "costs $& and $' and $1" });
  expect(out).toBe("a costs $& and $' and $1 b");
});
