import { expect, test } from 'bun:test';
import { parseBlogPosts } from './blog-posts';

const html = `
<div><a href="/posts/old-posts/faker-js" class="block">
  <div class="title"> Faker.js story </div>
  <p class="desc">Long description that must not end up in the title.</p>
</a>
<a href="/tags/opensource">opensource</a>
<a href="/posts/old-posts/gcd" class="block"><div class="title">GCD</div><p>desc</p></a></div>`;

test('title is the heading only, not the description', () => {
  const [first] = parseBlogPosts(html, 2);
  expect(first).toEqual({ title: 'Faker.js story', url: 'https://azer.one/posts/old-posts/faker-js' });
});

test('respects count and ignores non-post links', () => {
  expect(parseBlogPosts(html, 1)).toHaveLength(1);
  expect(parseBlogPosts(html, 5)).toHaveLength(2);
});
