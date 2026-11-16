import type { Lang } from '../runner/harness/types';
import type { QuizQuestion, QuizVariant } from './schema';

/** The version of a question to show for a language (falls back to the base/Python version). */
export function resolveQuestion(q: QuizQuestion, lang: Lang | null | undefined): QuizVariant & { variantLang: Lang | null } {
  const v = lang === 'java' ? q.variants?.java : lang === 'cpp' ? q.variants?.cpp : undefined;
  // A variant without its own explainer borrows the base one (the concept is usually the same).
  if (v) return { ...v, topicMd: v.topicMd ?? q.topicMd, keyTerms: v.keyTerms ?? q.keyTerms, variantLang: lang ?? null };
  return {
    promptMd: q.promptMd,
    choices: q.choices,
    answerIndex: q.answerIndex,
    explanationMd: q.explanationMd,
    choiceNotesMd: q.choiceNotesMd,
    topicMd: q.topicMd,
    keyTerms: q.keyTerms,
    variantLang: q.variants ? 'python3' : null,
  };
}

export function hasVariants(q: QuizQuestion): boolean {
  return !!(q.variants?.java || q.variants?.cpp);
}
