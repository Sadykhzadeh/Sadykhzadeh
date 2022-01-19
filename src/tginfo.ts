import got from "got";
import cheerio from 'cheerio';

export const getContent = async (url: string): Promise<Array<Array<string>>> => {
  const $ = await cheerio.load((await got(url)).body);
  
  const mainClass = "div .tgme_widget_message_bubble",
  linkClass = "div .tgme_widget_message";
  
  let mainContent = $(mainClass).map((__i, x) => {
    const $$ = cheerio.load(x);
    return $$("div .tgme_widget_message_text").last().html()?.split("<br>")[0].replace(/<\/?[^>]+(>|$)/g, "");
  }).toArray().slice(-3);
  let linkContent = $(linkClass).map((__i, x):string =>
    `https://t.me/${$(x).attr("data-post")}`
  ).toArray().slice(-3);

  return (mainContent.map((x, i) => [x, linkContent[i]])).reverse();
}