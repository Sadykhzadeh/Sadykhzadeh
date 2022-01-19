import fs from "fs";
import { getContent } from './tginfo.js';

(async () =>{
  const content: Array<Array<string>> = await getContent("https://t.me/s/tginfo/");
  const contentEn: Array<Array<string>> = await getContent("https://t.me/s/tginfoen/");
  
  let htmlContent: string = "";
  for(let q = 0; q < content.length; q++)
    htmlContent += 
    `<tr>
      <td>
        <a href="${contentEn[q][1]}">
          ${contentEn[q][0]}
        </a>
      </td>
      <td>
        <a href="${content[q][1]}">
          ${content[q][0]}
        </a>
      </td>
    </tr>`

  fs.readFile("./assets/template.md", 'utf8', (err, data) => {
    if (err) return console.log(err);
    const result = data.replace("<$tginfo$>", htmlContent);
    fs.writeFile("README.md", result, 'utf8', (err) => {
      if (err) return console.log(err);
    });
  });
})()
