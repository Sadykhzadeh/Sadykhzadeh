// A space, parenthesis, angle bracket or control character would end the link destination early
const destination = (url: string) =>
  url.replace(/[ ()<>\x00-\x1f\x7f]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);

// Escape everything markdown or inline HTML could act on, so a title is always shown literally
export const mdLink = (title: string, url: string) => `[${title.replace(/[\\[\]*_`|<>&~]/g, "\\$&")}](${destination(url)})`;

// Keep one-line titles readable: cut long ones on a word boundary
export const clip = (title: string, max = 120) => {
  const chars = Array.from(title);
  if (chars.length <= max) return title;
  const cut = chars.slice(0, max - 1).join("");
  const space = cut.lastIndexOf(" ");
  return `${space > 0 ? cut.slice(0, space) : cut}…`;
};

// Function replacers: a plain string would expand $&, $' and friends found in titles.
// A placeholder with no value is a template typo, so it fails the run instead of reaching the README.
export const fill = (template: string, values: Record<string, string>) =>
  template.replace(/<\$(\w+)\$>/g, (match, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) throw new Error(`template placeholder ${match} has no value`);
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
