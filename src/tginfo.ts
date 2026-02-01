import * as cheerio from 'cheerio';

export const getLatestPost = async (url: string): Promise<{ title: string; url: string } | null> => {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const mainClass = "div.tgme_widget_message_bubble";
    const linkClass = "div.tgme_widget_message";
    
    // Get the last (latest) message
    const messages = $(mainClass).toArray();
    if (messages.length === 0) return null;
    
    const lastMessage = messages[messages.length - 1];
    const $$ = cheerio.load(lastMessage);
    
    // Extract title (first line of text)
    const titleHtml = $$("div.tgme_widget_message_text").last().html();
    const title = titleHtml
      ?.split("<br>")[0]
      .replace(/<\/?[^>]+(>|$)/g, "")
      .trim();
    
    // Extract link
    const postLinks = $(linkClass).toArray();
    const lastLink = postLinks[postLinks.length - 1];
    const postId = $(lastLink).attr("data-post");
    const postUrl = `https://t.me/${postId}`;
    
    return {
      title: title || "Latest post",
      url: postUrl
    };
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}