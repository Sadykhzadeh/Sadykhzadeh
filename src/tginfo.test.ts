import { expect, test } from 'bun:test';
import { parseTelegramPosts } from './tginfo';

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

test('emoji stay in the title', () => {
  const [post] = parseTelegramPosts(message(1, '<i class="emoji" style="background-image:url(//x/y.png)"><b>🎁</b></i> Gift sale'), 1);
  expect(post.title).toBe('🎁 Gift sale');
});

test('the quoted text of a reply does not become the title', () => {
  const reply = '<a class="tgme_widget_message_reply"><div class="tgme_widget_message_text js-message_reply_text">quoted</div></a>';
  const [post] = parseTelegramPosts(message(1, 'actual post', reply), 1);
  expect(post.title).toBe('actual post');
});

test('a post without text falls back to a generic title', () => {
  const html = `<div class="tgme_widget_message" data-post="chan/7"><div class="tgme_widget_message_bubble"></div></div>`;
  expect(parseTelegramPosts(html, 1)).toEqual([{ title: 'post', url: 'https://t.me/chan/7' }]);
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
