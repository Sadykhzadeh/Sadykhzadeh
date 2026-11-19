import * as cheerio from 'cheerio';
import { fetchHtml } from './fetch-html.js';
import { clip } from './render.js';

type Post = { title: string; url: string };

// A query string or fragment on a link points at the same post, so it is dropped
const postPath = (href: string) => href.split(/[?#]/)[0].replace(/\/+$/, '');

export const parseBlogPosts = (html: string, count: number): Post[] => {
  const $ = cheerio.load(html);

  // Find blog post links in the format /posts/..., skipping the index (the navigation links to it)
  // and repeats of a post that the page links more than once
  const seen = new Set<string>();
  const postLinks = $('a[href^="/posts/"]').toArray().filter(post => {
    const path = postPath($(post).attr('href') ?? '');
    if (path === '/posts' || seen.has(path)) return false;
    seen.add(path);
    return true;
  });

  // Get the first N posts (latest)
  return postLinks.slice(0, count).map(post => {
    const href = $(post).attr('href');
    // the link also wraps a description paragraph, so take the heading only: the first block with text
    // that is not a paragraph (a cover image or spacer before it has none), or, when there is no such
    // block, the link's text with its paragraphs removed
    const heading = $(post).children().not("p").filter((_, el) => $(el).text().trim() !== "").first();
    const title = clip((heading.length ? heading.text() : $(post).clone().children("p").remove().end().text()).replace(/\s+/g, " ").trim());

    return {
      title: title || "latest post",
      url: `https://azer.one${postPath(href ?? '')}`
    };
  });
}

export const getLatestBlogPosts = async (count: number = 2): Promise<Post[]> => {
  try {
    return parseBlogPosts(await fetchHtml("https://azer.one"), count);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}
