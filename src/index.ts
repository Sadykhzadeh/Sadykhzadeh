import fs from "fs";
import { nowUTC } from './nowUTC.js';
import { getLatestPost } from './tginfo.js';
import { getLatestBlogPost } from './blog-posts.js';

(async () => {
  console.log("Fetching latest posts...");
  
  // Fetch Telegram posts
  const postEn = await getLatestPost("https://t.me/s/tginfoen/");
  const postRu = await getLatestPost("https://t.me/s/tginfo/");
  
  // Fetch blog post
  const blogPost = await getLatestBlogPost();
  
  // Generate text content for Telegram posts
  const tginfoText = postEn && postRu
    ? `We post cool Telegram updates in [@tginfoen](https://t.me/tginfoen), like [${postEn.title}](${postEn.url}). Also in Russian at [@tginfo](https://t.me/tginfo) — [${postRu.title}](${postRu.url})!`
    : `Follow our Telegram channels: [@tginfoen](https://t.me/tginfoen) and [@tginfo](https://t.me/tginfo)`;
  
  // Generate blog post line
  const blogText = blogPost
    ? `[${blogPost.title}](${blogPost.url})`
    : `[azer.one](https://azer.one)`;
  
  // Read and update template
  fs.readFile("./assets/template.md", 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading template:", err);
      return;
    }
    
    const result = data
      .replace("<$tginfo$>", tginfoText)
      .replace("<$blog_post$>", blogText)
      .replace("<$time$>", `${nowUTC()}`);
    
    fs.writeFile("README.md", result, 'utf8', (err) => {
      if (err) {
        console.error("Error writing README:", err);
        return;
      }
      console.log("✅ README.md updated successfully!");
    });
  });
})();

