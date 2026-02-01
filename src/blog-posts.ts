import * as cheerio from 'cheerio';

export const getLatestBlogPost = async (): Promise<{ title: string; url: string } | null> => {
  try {
    const response = await fetch("https://azer.one");
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find the first blog post link in the Posts section
    // Looking for links in the format /posts/...
    const postLinks = $('a[href^="/posts/"]').toArray();
    
    if (postLinks.length === 0) return null;
    
    // Get the first post (latest)
    const firstPost = postLinks[0];
    const href = $(firstPost).attr('href');
    const title = $(firstPost).text().trim();
    
    return {
      title: title || "Latest blog post",
      url: `https://azer.one${href}`
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}
