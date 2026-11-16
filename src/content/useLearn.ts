import { useEffect, useState } from 'react';
import type { LearnIndex, LearnTerm } from './learn';
import { loadLearnIndex } from './loadDay';

/** The Learn index once loaded (null while loading or if it's unavailable). */
export function useLearnIndex(): LearnIndex | null {
  const [index, setIndex] = useState<LearnIndex | null>(null);
  useEffect(() => {
    let alive = true;
    loadLearnIndex().then(
      (i) => alive && setIndex(i),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, []);
  return index;
}

let allTerms: LearnTerm[] | null = null;
/** Every Learn term with its link (stable array per index load, for memoised Markdown plugins). */
export function useLearnTerms(): LearnTerm[] | undefined {
  const index = useLearnIndex();
  if (!index) return undefined;
  allTerms ??= index.pages.flatMap((p) => p.terms);
  return allTerms;
}
