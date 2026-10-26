import * as cheerio from 'cheerio';
import { fetchHtml } from './fetch-html.js';
import { clip } from './render.js';

type Post = { title: string; url: string };

export const parseTelegramPosts = (html: string, count: number): Post[] => {
  const $ = cheerio.load(html);

  // The newest messages are last on the page; return them newest first
  return $("div.tgme_widget_message").toArray().slice(-count).reverse().map(message => {
    // A reply also carries a text div (the quoted message), the post's own text comes after it
    const text = $(message).find("div.tgme_widget_message_text").last();
    text.find("br").replaceWith("\n");
    const title = clip(text.text().split("\n")[0].replace(/\s+/g, " ").trim());

    return {
      title: title || "post",
      url: `https://t.me/${$(message).attr("data-post")}`
    };
  });
}

export const getLatestPosts = async (url: string, count: number = 2): Promise<Post[]> => {
  try {
    return parseTelegramPosts(await fetchHtml(url), count);
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return [];
  }
}
