// Escape brackets so a title can't terminate the link text early
export const mdLink = (title: string, url: string) => `[${title.replace(/[[\]]/g, "\\$&")}](${url})`;

// Function replacers: a plain string would expand $&, $' and friends found in titles
export const fill = (template: string, values: Record<string, string>) =>
  template.replace(/<\$(\w+)\$>/g, (match, key: string) => values[key] ?? match);
