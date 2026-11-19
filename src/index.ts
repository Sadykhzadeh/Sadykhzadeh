import { join } from 'node:path';
import { nowUTC } from './nowUTC.js';
import { getLatestPosts } from './tginfo.js';
import { getLatestBlogPosts } from './blog-posts.js';
import { mdLink, fill, keepSection } from './render.js';

type Post = { title: string; url: string };

// Where the posts come from; tests pass stubs so no request leaves the process
type Sources = {
  telegram: (url: string, count: number) => Promise<Post[]>;
  blog: (count: number) => Promise<Post[]>;
};

const liveSources: Sources = { telegram: getLatestPosts, blog: getLatestBlogPosts };

// The template and README live at the project root, one level above this file, so the run does not depend on the working directory
export const projectRoot = join(import.meta.dir, "..");

// With dryRun the README goes to stdout and the file is left alone, and progress lines go to stderr
export const main = async (root: string, sources: Sources = liveSources, dryRun = false): Promise<number> => {
  const log = dryRun ? console.error : console.log;
  try {
    log("Fetching latest posts...");

    // Telegram posts (2 latest from each) and blog posts (2 latest), fetched in parallel
    const [postsEn, postsRu, blogPosts] = await Promise.all([
      sources.telegram("https://t.me/s/tginfoen/", 2),
      sources.telegram("https://t.me/s/tginfo/", 2),
      sources.blog(2),
    ]);

    // Generate text content for Telegram posts
    let tginfoText = "";

    if (postsEn.length >= 2 && postsRu.length >= 2) {
      const [en1, en2] = postsEn;
      const [ru1, ru2] = postsRu;

      tginfoText = `we write about ${mdLink(en1.title, en1.url)} or ${mdLink(en2.title, en2.url)}. (in Russian too! ${mdLink(ru1.title, ru1.url)} and ${mdLink(ru2.title, ru2.url)})`;
    } else {
      tginfoText = `you can follow our Telegram channels: [@tginfoen](https://t.me/tginfoen) and [@tginfo](https://t.me/tginfo)`;
    }

    // Generate blog posts text
    let blogText = "";

    if (blogPosts.length >= 2) {
      const [blog1, blog2] = blogPosts;
      blogText = `like ${mdLink(blog1.title, blog1.url)} or ${mdLink(blog2.title, blog2.url)}`;
    } else if (blogPosts.length === 1) {
      blogText = `like ${mdLink(blogPosts[0].title, blogPosts[0].url)}`;
    } else {
      // the template puts a comma before this piece, so the sentence still reads "my blog, and check it out"
      blogText = "and";
    }

    // Read template using Bun.file
    const templateFile = Bun.file(join(root, "assets", "template.md"));
    const template = keepSection(await templateFile.text(), await Bun.file(join(root, "README.md")).text(), "waka");

    // Replace placeholders
    const result = fill(template, {
      tginfo: tginfoText,
      blog_posts: blogText,
      time: nowUTC(),
    });

    if (dryRun) {
      process.stdout.write(result);
    } else {
      // Write README using Bun.write
      await Bun.write(join(root, "README.md"), result);
      log("✅ README.md updated successfully!");
    }
    return 0;
  } catch (error) {
    console.error("Error:", error);
    // a silent exit 0 would let the workflow report success over a stale README
    return 1;
  }
};

if (import.meta.main) {
  // A misspelled flag must not fall through to a run that rewrites the README
  const args = process.argv.slice(2);
  const unknown = args.find(arg => arg !== "--dry-run");
  if (unknown) {
    console.error(`Unknown argument ${unknown}, the only option is --dry-run`);
    process.exitCode = 2;
  } else {
    main(projectRoot, liveSources, args.includes("--dry-run")).then(code => {
      process.exitCode = code;
    });
  }
}
