import * as cheerio from 'cheerio';

export const getLatestBlogPosts = async (count: number = 2): Promise<Array<{ title: string; url: string }>> => {
  try {
    const response = await fetch("https://azer.one");
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find blog post links in the format /posts/...
    const postLinks = $('a[href^="/posts/"]').toArray();
    
    if (postLinks.length === 0) return [];
    
    // Get the first N posts (latest)
    const latestPosts = postLinks.slice(0, count);
    
    return latestPosts.map(post => {
      const href = $(post).attr('href');
      const title = $(post).text().trim();
      
      return {
        title: title || "latest post",
        url: `https://azer.one${href}`
      };
    });
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

