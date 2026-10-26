// Escape brackets so a title can't terminate the link text early
export const mdLink = (title: string, url: string) => `[${title.replace(/[[\]]/g, "\\$&")}](${url})`;

// Function replacers: a plain string would expand $&, $' and friends found in titles
export const fill = (template: string, values: Record<string, string>) =>
  template.replace(/<\$(\w+)\$>/g, (match, key: string) => values[key] ?? match);

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
