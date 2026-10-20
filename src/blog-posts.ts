import * as cheerio from 'cheerio';
import { fetchHtml } from './fetch-html.js';

type Post = { title: string; url: string };

export const parseBlogPosts = (html: string, count: number): Post[] => {
  const $ = cheerio.load(html);

  // Find blog post links in the format /posts/...
  const postLinks = $('a[href^="/posts/"]').toArray();

  // Get the first N posts (latest)
  return postLinks.slice(0, count).map(post => {
    const href = $(post).attr('href');
    // the link also wraps a description paragraph, so take the heading only
    const title = ($(post).children("div").first().text() || $(post).text()).replace(/\s+/g, " ").trim();

    return {
      title: title || "latest post",
      url: `https://azer.one${href}`
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
