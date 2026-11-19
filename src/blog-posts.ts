import * as cheerio from 'cheerio';
import { fetchHtml } from './fetch-html.js';
import { clip, hasText } from './render.js';

type Post = { title: string; url: string };

// A query string or fragment on a link points at the same post, so it is dropped
const postPath = (href: string) => href.split(/[?#]/)[0].replace(/\/+$/, '');

export const parseBlogPosts = (html: string, count: number): Post[] => {
  const $ = cheerio.load(html);

  // Find blog post links in the format /posts/..., skipping the index (the navigation links to it).
  // A post can be linked more than once, for example by a cover image and by its title, so each
  // path keeps the first link whose text is not empty
  const titles = new Map<string, string>();
  for (const post of $('a[href^="/posts/"]').toArray()) {
    const path = postPath($(post).attr('href') ?? '');
    if (path === '/posts') continue;
    // a line break inside a heading would otherwise join the words on either side of it
    $(post).find('br').replaceWith(' ');
    // the link also wraps a description paragraph, so take the heading only: the first block with text
    // that is not a paragraph (a cover image or spacer before it has none), or, when there is no such
    // block, the link's text with its paragraphs removed
    const heading = $(post).children().not("p").filter((_, el) => hasText($(el).text())).first();
    const title = clip((heading.length ? heading.text() : $(post).clone().children("p").remove().end().text()).replace(/\s+/g, " ").trim());

    const known = titles.get(path);
    if (known === undefined || !hasText(known)) titles.set(path, title);
  }

  // Get the first N posts (latest)
  return [...titles].slice(0, count).map(([path, title]) => ({
    title: hasText(title) ? title : "latest post",
    url: `https://azer.one${path}`
  }));
}

export const getLatestBlogPosts = async (count: number = 2): Promise<Post[]> => {
  try {
    const posts = parseBlogPosts(await fetchHtml("https://azer.one"), count);
    // An empty result usually means the page layout changed, and the README then shows the fallback text
    if (posts.length === 0) console.error("No posts found at https://azer.one");
    return posts;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}
