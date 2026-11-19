import * as cheerio from 'cheerio';
import { fetchHtml } from './fetch-html.js';
import { clip } from './render.js';

type Post = { title: string; url: string };

export const parseTelegramPosts = (html: string, count: number): Post[] => {
  const $ = cheerio.load(html);

  // The newest messages are last on the page; walk them newest first and keep the ones with text,
  // so a photo-only post is not linked under a generic title
  return $("div.tgme_widget_message").toArray().reverse().flatMap(message => {
    // A reply also carries a text div for the quoted message, which is not the post's own text
    const text = $(message).find("div.tgme_widget_message_text").not(".tgme_widget_message_reply div").last();
    text.find("br").replaceWith("\n");
    const firstLine = text.text().split("\n").find(line => line.trim() !== "") ?? "";
    const title = clip(firstLine.replace(/\s+/g, " ").trim());

    return title ? [{
      title,
      url: `https://t.me/${$(message).attr("data-post")}`
    }] : [];
  }).slice(0, count);
}

export const getLatestPosts = async (url: string, count: number = 2): Promise<Post[]> => {
  try {
    return parseTelegramPosts(await fetchHtml(url), count);
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return [];
  }
}
