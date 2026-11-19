import * as cheerio from 'cheerio';
import { fetchHtml } from './fetch-html.js';
import { clip, hasText } from './render.js';

type Post = { title: string; url: string };

export const parseTelegramPosts = (html: string, count: number): Post[] => {
  const $ = cheerio.load(html);

  // The newest messages are last on the page; walk them newest first and keep the ones with text,
  // so a photo-only post is not linked under a generic title
  return $("div.tgme_widget_message").toArray().reverse().flatMap(message => {
    // A reply also carries a text div for the quoted message, which is not the post's own text
    const text = $(message).find("div.tgme_widget_message_text").not(".tgme_widget_message_reply div").last();
    text.find("br").replaceWith("\n");
    // Zero-width characters are invisible, so a line that holds only them does not count as text.
    // The title keeps them, since joined emoji and Persian words depend on them
    const lines = text.text().split("\n").map(line => line.replace(/\s+/g, " ").trim());
    const title = clip(lines.find(hasText) ?? "");

    return title ? [{
      title,
      url: `https://t.me/${$(message).attr("data-post")}`
    }] : [];
  }).slice(0, count);
}

export const getLatestPosts = async (url: string, count: number = 2): Promise<Post[]> => {
  try {
    const posts = parseTelegramPosts(await fetchHtml(url), count);
    // An empty result usually means the page layout changed, and the README then shows the fallback text
    if (posts.length === 0) console.error(`No posts found at ${url}`);
    return posts;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return [];
  }
}
