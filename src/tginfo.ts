import * as cheerio from 'cheerio';

export const getLatestPosts = async (url: string, count: number = 2): Promise<Array<{ title: string; url: string }>> => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const mainClass = "div.tgme_widget_message_bubble";
    const linkClass = "div.tgme_widget_message";
    
    // Get all messages
    const messages = $(mainClass).toArray();
    if (messages.length === 0) return [];
    
    const postLinks = $(linkClass).toArray();
    
    // Get the last N messages
    const latestMessages = messages.slice(-count);
    const latestLinks = postLinks.slice(-count);
    
    const posts = latestMessages.map((message, index) => {
      const $$ = cheerio.load(message);
      
      // Extract title (first line of text)
      const titleHtml = $$("div.tgme_widget_message_text").last().html();
      const title = titleHtml
        ?.split("<br>")[0]
        .replace(/<\/?[^>]+(>|$)/g, "")
        .trim();
      
      // Extract link
      const postId = $(latestLinks[index]).attr("data-post");
      const postUrl = `https://t.me/${postId}`;
      
      return {
        title: title || "post",
        url: postUrl
      };
    });
    
    return posts.reverse(); // Return in chronological order (newest first)
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return [];
  }
}