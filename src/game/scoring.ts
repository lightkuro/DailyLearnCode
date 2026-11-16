import { resolveQuestion } from '../content/quiz';
import type { DailySet, QuizStage } from '../content/schema';
import type { Lang } from '../runner/harness/types';

export const QUIZ_POINTS = 1;
export const CODE_MAX = 4;
export const MAX_HINTS = 3;
export const DAY_MAX = 20;

export type CodeStatus = 'active' | 'accepted' | 'gaveup';

export interface QuizProgress {
  kind: 'quiz';
  /** Chosen choice index per question (null = unanswered, -1 = skipped). */
  answers: (number | null)[];
  /** Language version each question was answered in (questions can have per-language variants). */
  langs?: (Lang | null)[];
  done: boolean;
}

export const SKIPPED = -1;

export interface CodeProgress {
  kind: 'code';
  status: CodeStatus;
  hintsUsed: number;
  submissions: number;
}

export type StageProgress = QuizProgress | CodeProgress;

export function isCorrect(stage: QuizStage, i: number, answers: (number | null)[], langs?: (Lang | null)[]): boolean {
  const a = answers[i];
  return a !== null && a !== undefined && a >= 0 && a === resolveQuestion(stage.questions[i], langs?.[i]).answerIndex;
}

export function quizScore(stage: QuizStage, answers: (number | null)[], langs?: (Lang | null)[]): number {
  return stage.questions.reduce((n, _, i) => n + (isCorrect(stage, i, answers, langs) ? QUIZ_POINTS : 0), 0);
}

/** Best score still reachable on a coding task after using `hintsUsed` hints. */
export function codeMax(hintsUsed: number): number {
  return Math.max(0, CODE_MAX - Math.min(hintsUsed, MAX_HINTS));
}

/** All-or-nothing: full (hint-reduced) points only when every test passes. */
export function codeScore(p: Pick<CodeProgress, 'status' | 'hintsUsed'>): number {
  return p.status === 'accepted' ? codeMax(p.hintsUsed) : 0;
}

export function stageMax(set: DailySet, i: number): number {
  const s = set.stages[i];
  return s.kind === 'quiz' ? s.questions.length * QUIZ_POINTS : CODE_MAX;
}

export function isStageDone(p: StageProgress | undefined): boolean {
  if (!p) return false;
  return p.kind === 'quiz' ? p.done : p.status !== 'active';
}

export function stageScore(set: DailySet, i: number, p: StageProgress | undefined): number {
  if (!p) return 0;
  const s = set.stages[i];
  if (p.kind === 'quiz' && s.kind === 'quiz') return quizScore(s, p.answers, p.langs);
  if (p.kind === 'code') return codeScore(p);
  return 0;
}

export function totalScore(set: DailySet, stages: (StageProgress | undefined)[]): number {
  return set.stages.reduce((sum, _, i) => sum + stageScore(set, i, stages[i]), 0);
}

export interface Grade {
  label: string;
  emoji: string;
}

export function grade(score: number): Grade {
  if (score >= DAY_MAX) return { label: 'Flawless', emoji: '👑' };
  if (score >= 17) return { label: 'Excellent', emoji: '🚀' };
  if (score >= 13) return { label: 'Solid run', emoji: '💪' };
  if (score >= 8) return { label: 'Getting there', emoji: '🌱' };
  return { label: 'Every day counts', emoji: '🧭' };
}
