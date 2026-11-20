import { afterEach, expect, spyOn, test } from 'bun:test';
import { getLatestPosts, parseTelegramPosts } from './tginfo';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const message = (id: number, text: string, extra = '') =>
  `<div class="tgme_widget_message_wrap"><div class="tgme_widget_message" data-post="chan/${id}">` +
  `<div class="tgme_widget_message_bubble">${extra}<div class="tgme_widget_message_text js-message_text">${text}</div></div></div></div>`;

test('returns the newest posts first', () => {
  const html = [1, 2, 3].map(id => message(id, `post ${id}`)).join('');
  expect(parseTelegramPosts(html, 2)).toEqual([
    { title: 'post 3', url: 'https://t.me/chan/3' },
    { title: 'post 2', url: 'https://t.me/chan/2' },
  ]);
});

test('title is the first line, with entities decoded and tags dropped', () => {
  const [post] = parseTelegramPosts(message(1, 'Q&amp;A on &lt;T&gt; <b>generics</b><br/>second line'), 1);
  expect(post.title).toBe('Q&A on <T> generics');
});

test('a post that starts with a blank line takes its first non-empty line as the title', () => {
  const [post] = parseTelegramPosts(message(1, '<br/>second line<br/>third'), 1);
  expect(post.title).toBe('second line');
});

test('emoji stay in the title', () => {
  const [post] = parseTelegramPosts(message(1, '<i class="emoji" style="background-image:url(//x/y.png)"><b>🎁</b></i> Gift sale'), 1);
  expect(post.title).toBe('🎁 Gift sale');
});

test('the quoted text of a reply does not become the title', () => {
  const reply = '<a class="tgme_widget_message_reply"><div class="tgme_widget_message_text js-message_reply_text">quoted</div></a>';
  const [post] = parseTelegramPosts(message(1, 'actual post', reply), 1);
  expect(post.title).toBe('actual post');
});

test('a reply without text of its own is skipped instead of titled with the quoted message', () => {
  const reply = '<a class="tgme_widget_message_reply"><div class="tgme_widget_message_text js-message_reply_text">quoted</div></a>';
  const sticker = `<div class="tgme_widget_message" data-post="chan/8"><div class="tgme_widget_message_bubble">${reply}</div></div>`;
  expect(parseTelegramPosts(message(5, 'text post') + sticker, 2)).toEqual([
    { title: 'text post', url: 'https://t.me/chan/5' },
  ]);
});

test('a post without text is skipped in favour of the newest post with text', () => {
  const photo = `<div class="tgme_widget_message" data-post="chan/7"><div class="tgme_widget_message_bubble"></div></div>`;
  expect(parseTelegramPosts(message(5, 'text post') + photo, 2)).toEqual([
    { title: 'text post', url: 'https://t.me/chan/5' },
  ]);
  expect(parseTelegramPosts(photo, 2)).toEqual([]);
});

test('a message without a post id is skipped, since its link would point nowhere', () => {
  const noId = '<div class="tgme_widget_message"><div class="tgme_widget_message_text">no id here</div></div>';
  expect(parseTelegramPosts(message(5, 'text post') + noId, 2)).toEqual([
    { title: 'text post', url: 'https://t.me/chan/5' },
  ]);
});

test('count limits the posts and zero returns none', () => {
  const html = [1, 2].map(id => message(id, `post ${id}`)).join('');
  expect(parseTelegramPosts(html, 0)).toEqual([]);
  expect(parseTelegramPosts(html, 1)).toEqual([{ title: 'post 2', url: 'https://t.me/chan/2' }]);
});

test('very long titles are cut on a word boundary', () => {
  const [post] = parseTelegramPosts(message(1, 'word '.repeat(60)), 1);
  expect(post.title.length).toBeLessThanOrEqual(120);
  expect(post.title.endsWith('…')).toBe(true);
  expect(post.title).not.toContain('wor…');
});

test('a page without messages yields no posts', () => {
  expect(parseTelegramPosts('<html><body>changed layout</body></html>', 2)).toEqual([]);
});

test('zero-width characters are not a title, and the next line with text is', () => {
  expect(parseTelegramPosts(message(1, '​‌<br/>real title'), 1)).toEqual([
    { title: 'real title', url: 'https://t.me/chan/1' },
  ]);
  expect(parseTelegramPosts(message(2, '⁠﻿'), 1)).toEqual([]);
});

test('joiners inside a title are kept, so emoji sequences and Persian words stay intact', () => {
  expect(parseTelegramPosts(message(1, 'family 👨‍👩 day'), 1)).toEqual([
    { title: 'family 👨‍👩 day', url: 'https://t.me/chan/1' },
  ]);
  expect(parseTelegramPosts(message(2, 'می‌خواهم'), 1)).toEqual([
    { title: 'می‌خواهم', url: 'https://t.me/chan/2' },
  ]);
});

test('a page that yields no messages returns nothing and is reported', async () => {
  globalThis.fetch = (async () => new Response('<html>changed layout</html>')) as unknown as typeof fetch;
  const errors = spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await getLatestPosts('https://t.me/s/chan/', 2)).toEqual([]);
    expect(errors).toHaveBeenCalledWith('No posts found at https://t.me/s/chan/');
  } finally {
    errors.mockRestore();
  }
});

test('a page that cannot be fetched returns nothing and is reported', async () => {
  globalThis.fetch = (async () => new Response('gone', { status: 404 })) as unknown as typeof fetch;
  const errors = spyOn(console, 'error').mockImplementation(() => {});
  try {
    expect(await getLatestPosts('https://t.me/s/chan/', 2)).toEqual([]);
    expect(errors).toHaveBeenCalledWith('Error fetching from https://t.me/s/chan/: HTTP 404');
  } finally {
    errors.mockRestore();
  }
});

test('the page is fetched from the given url and its newest posts are returned', async () => {
  let requested = '';
  globalThis.fetch = (async (url: string) => {
    requested = url;
    return new Response([1, 2, 3].map(id => message(id, `post ${id}`)).join(''));
  }) as unknown as typeof fetch;
  expect(await getLatestPosts('https://t.me/s/chan/', 1)).toEqual([
    { title: 'post 3', url: 'https://t.me/chan/3' },
  ]);
  expect(requested).toBe('https://t.me/s/chan/');
});
