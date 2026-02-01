import { nowUTC } from './nowUTC.js';
import { getLatestPosts } from './tginfo.js';
import { getLatestBlogPosts } from './blog-posts.js';

(async () => {
  console.log("Fetching latest posts...");
  
  // Fetch Telegram posts (2 latest from each)
  const postsEn = await getLatestPosts("https://t.me/s/tginfoen/", 2);
  const postsRu = await getLatestPosts("https://t.me/s/tginfo/", 2);
  
  // Fetch blog posts (2 latest)
  const blogPosts = await getLatestBlogPosts(2);
  
  // Generate text content for Telegram posts
  let tginfoText = "";
  
  if (postsEn.length >= 2 && postsRu.length >= 2) {
    const [en1, en2] = postsEn;
    const [ru1, ru2] = postsRu;
    
    tginfoText = `we write about [${en1.title}](${en1.url}) or [${en2.title}](${en2.url}). (in Russian too! [${ru1.title}](${ru1.url}) and [${ru2.title}](${ru2.url}))`;
  } else {
    tginfoText = `follow our Telegram channels: [@tginfoen](https://t.me/tginfoen) and [@tginfo](https://t.me/tginfo)`;
  }
  
  // Generate blog posts text
  let blogText = "";
  
  if (blogPosts.length >= 2) {
    const [blog1, blog2] = blogPosts;
    blogText = `like [${blog1.title}](${blog1.url}) or [${blog2.title}](${blog2.url})`;
  } else if (blogPosts.length === 1) {
    blogText = `like [${blogPosts[0].title}](${blogPosts[0].url})`;
  } else {
    blogText = "";
  }
  
  try {
    // Read template using Bun.file
    const templateFile = Bun.file("./assets/template.md");
    const template = await templateFile.text();
    
    // Replace placeholders
    const result = template
      .replace("<$tginfo$>", tginfoText)
      .replace("<$blog_posts$>", blogText)
      .replace("<$time$>", `${nowUTC()}`);
    
    // Write README using Bun.write
    await Bun.write("README.md", result);
    
    console.log("✅ README.md updated successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
})();




