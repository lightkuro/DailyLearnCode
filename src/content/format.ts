/**
 * Put each sentence on its own line (Markdown hard break) so questions are easy to scan.
 * Code (fenced blocks and inline spans) is left untouched; abbreviations like "e.g. foo" and
 * decimals like "3.5" don't break because the next character must be uppercase/digit/markup.
 */
export function breakSentences(md: string): string {
  const stash: string[] = [];
  const hide = (m: string) => `\uE000${stash.push(m) - 1}\uE000`;
  let out = md.replace(/```[\s\S]*?```/g, hide).replace(/`[^`\n]+`/g, hide);
  out = out.replace(/([.!?])[ \t]+(?=[A-Z0-9(*_\uE000])/g, '$1  \n');
  return out.replace(/\uE000(\d+)\uE000/g, (_, i: string) => stash[Number(i)]);
}
