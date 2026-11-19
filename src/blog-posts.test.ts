import { afterEach, expect, spyOn, test } from 'bun:test';
import { getLatestBlogPosts, parseBlogPosts } from './blog-posts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

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

test('entities are decoded and very long titles are cut', () => {
  const long = 'word '.repeat(60);
  const page = `<a href="/posts/a"><div>Vec&lt;T&gt; &amp; you</div></a><a href="/posts/b"><div>${long}</div></a>`;
  const [entities, clipped] = parseBlogPosts(page, 2);
  expect(entities.title).toBe('Vec<T> & you');
  expect(clipped.title.length).toBeLessThanOrEqual(120);
  expect(clipped.title.endsWith('…')).toBe(true);
});

test('the posts index and repeated links to one post are not listed', () => {
  const page = `<nav><a href="/posts/">posts</a></nav>
<a href="/posts/old-posts/faker-js"><div class="title">Faker.js story</div><p>desc</p></a>
<a href="/posts/">posts</a>
<a href="/posts/old-posts/faker-js/"><div class="title">Faker.js story again</div></a>
<a href="/posts/old-posts/gcd"><div class="title">GCD</div></a>`;
  expect(parseBlogPosts(page, 5)).toEqual([
    { title: 'Faker.js story', url: 'https://azer.one/posts/old-posts/faker-js' },
    { title: 'GCD', url: 'https://azer.one/posts/old-posts/gcd' },
  ]);
});

test('a page without post links yields no posts', () => {
  expect(parseBlogPosts('<html><body>changed layout</body></html>', 2)).toEqual([]);
});

test('a link with a query string or fragment is the same post', () => {
  const page = `<a href="/posts/old-posts/faker-js#comments"><div>Faker.js story</div></a>
<a href="/posts/old-posts/faker-js?ref=nav"><div>Faker.js story</div></a>
<a href="/posts/old-posts/faker-js/"><div>Faker.js story</div></a>
<a href="/posts/old-posts/gcd?ref=home"><div>GCD</div></a>`;
  expect(parseBlogPosts(page, 5)).toEqual([
    { title: 'Faker.js story', url: 'https://azer.one/posts/old-posts/faker-js' },
    { title: 'GCD', url: 'https://azer.one/posts/old-posts/gcd' },
  ]);
});

test('a heading that is not a div is taken alone, without the description', () => {
  const page = `<a href="/posts/old-posts/gcd"><h2>GCD</h2><p>Long description</p></a>`;
  expect(parseBlogPosts(page, 1)).toEqual([{ title: 'GCD', url: 'https://azer.one/posts/old-posts/gcd' }]);
});

test('a cover image before the heading does not pull the description into the title', () => {
  const page = `<a href="/posts/old-posts/gcd"><img src="/cover.webp" alt=""><div class="title">GCD</div><p>Long description</p></a>`;
  expect(parseBlogPosts(page, 1)).toEqual([{ title: 'GCD', url: 'https://azer.one/posts/old-posts/gcd' }]);
});

test('a post with no heading text gets the fallback title, not its description', () => {
  const page = `<a href="/posts/old-posts/gcd"><div class="cover"></div><p>Long description</p></a>`;
  expect(parseBlogPosts(page, 1)).toEqual([{ title: 'latest post', url: 'https://azer.one/posts/old-posts/gcd' }]);
});

test('a home page with no post links returns nothing and is reported', async () => {
  globalThis.fetch = (async () => new Response('<html>changed layout</html>')) as unknown as typeof fetch;
  const errors = spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await getLatestBlogPosts(2)).toEqual([]);
    expect(errors).toHaveBeenCalledWith('No posts found at https://azer.one');
  } finally {
    errors.mockRestore();
  }
});

test('a line break in a heading separates the words of the title', () => {
  const page = `<a href="/posts/old-posts/gcd"><div class="title">Greatest<br>common divisor</div><p>desc</p></a>`;
  expect(parseBlogPosts(page, 1)).toEqual([
    { title: 'Greatest common divisor', url: 'https://azer.one/posts/old-posts/gcd' },
  ]);
});

test('a heading that holds only zero-width characters is not the title', () => {
  const spacer = `<a href="/posts/old-posts/gcd"><div>​</div><div class="title">GCD</div><p>desc</p></a>`;
  expect(parseBlogPosts(spacer, 1)).toEqual([{ title: 'GCD', url: 'https://azer.one/posts/old-posts/gcd' }]);
  const empty = `<a href="/posts/old-posts/gcd"><div class="title">​‌</div></a>`;
  expect(parseBlogPosts(empty, 1)).toEqual([{ title: 'latest post', url: 'https://azer.one/posts/old-posts/gcd' }]);
});

test('a cover image linking to a post does not hide its title link', () => {
  const page = `<div class="card"><a href="/posts/old-posts/gcd/"><img src="/gcd.webp" alt=""></a>`
    + `<a href="/posts/old-posts/gcd"><div class="title">GCD</div><p>desc</p></a></div>`;
  expect(parseBlogPosts(page, 2)).toEqual([{ title: 'GCD', url: 'https://azer.one/posts/old-posts/gcd' }]);
});

test('the home page is fetched and its newest posts are returned', async () => {
  let requested = '';
  globalThis.fetch = (async (url: string) => {
    requested = url;
    return new Response(html);
  }) as unknown as typeof fetch;
  expect(await getLatestBlogPosts(1)).toEqual([
    { title: 'Faker.js story', url: 'https://azer.one/posts/old-posts/faker-js' },
  ]);
  expect(requested).toBe('https://azer.one');
});
