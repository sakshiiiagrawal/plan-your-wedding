// Two distinct search matchers, both consistently (query, text) — previously
// each was redefined locally as "fuzzyMatch" with opposite argument order,
// which reads like accidental duplication but is actually two different
// algorithms serving two different UIs. Named apart here so that's obvious.

/** True if every whitespace-separated word in `query` is a substring of `text`. */
export function matchesAllWords(query: string, text: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return q
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => t.includes(word));
}

/** True if `query` is a substring of `text`, or matches it as an in-order character subsequence. */
export function fuzzySubsequenceMatch(query: string, text: string): boolean {
  if (!query) return true;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length;
}
