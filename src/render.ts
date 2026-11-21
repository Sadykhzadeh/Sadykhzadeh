// A space, parenthesis, angle bracket, backslash or control character would end or change the link destination
const destination = (url: string) =>
  url.replace(/[ ()<>\\\x00-\x1f\x7f]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

// Escape everything markdown or inline HTML could act on, so a title is always shown literally
export const mdLink = (title: string, url: string) => `[${title.replace(/[\\[\]*_`|<>&~]/g, "\\$&")}](${destination(url)})`;

// Invisible characters (zero-width, direction marks, soft hyphen, variation selector, and the braille and Hangul
// blanks that some channels post as spacers) are not text, so a line or heading that holds only them is skipped
export const hasText = (text: string) => text.replace(/[\u00ad\u115f\u1160\u200b-\u200f\u2060\u2800\u3164\ufe0f\ufeff\uffa0]/g, "").trim() !== "";

// Keep one-line titles readable: cut long ones on a word boundary, unless the last space is in the first half,
// which would leave a stub such as "Read…" in front of a long link.
// Graphemes are only read up to the limit, so a title of several megabytes is not held as one array
export const clip = (title: string, max = 120) => {
  const segments: string[] = [];
  let count = 0;
  for (const { segment } of new Intl.Segmenter().segment(title)) {
    if (count < max) segments.push(segment);
    count++;
    if (count > max) break;
  }
  if (count <= max) return title;
  const cut = segments.slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${space > max / 2 ? cut.slice(0, space) : cut}…`;
};

// A problem with the template itself, reported on one line instead of with a stack
export class TemplateError extends Error {}

// Function replacers: a plain string would expand $&, $' and friends found in titles.
// A placeholder with no value is a template typo, so it fails the run instead of reaching the README.
export const fill = (template: string, values: Record<string, string>) =>
  template.replace(/<\$([^<>$\s]+)\$>/g, (match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) throw new TemplateError(`template placeholder ${match} has no value`);
    return values[key];
  });

// The stats block is written by a separate step after the README is generated, so carry the
// previous one over instead of publishing an empty block until that step catches up (or fails)
export const keepSection = (template: string, previous: string, name: string) => {
  const start = `<!--START_SECTION:${name}-->`;
  const end = `<!--END_SECTION:${name}-->`;
  const bounds = (text: string) => {
    const from = text.indexOf(start) + start.length;
    const to = text.indexOf(end, from);
    return from >= start.length && to >= 0 ? [from, to] : null;
  };
  const old = bounds(previous);
  const next = bounds(template);
  if (!old || !next) return template;
  return template.slice(0, next[0]) + previous.slice(old[0], old[1]) + template.slice(next[1]);
};
