/**
 * Glossary key for an identifier used as a call, member or type: `.name` (the member version, e.g. set.lower_bound)
 * when it follows a dot and the glossary has one, else `name`. Undefined when there is no entry or no call/member use.
 */
export function glossKey(glossary: Record<string, unknown>, ident: string, before: string | undefined, after: string | undefined): string | undefined {
  if (!(after === '(' || after === '<' || before === '.' || before === '@' || before === ':')) return undefined;
  const has = (k: string) => Object.prototype.hasOwnProperty.call(glossary, k);
  if (before === '.' && has(`.${ident}`)) return `.${ident}`;
  return has(ident) ? ident : undefined;
}
