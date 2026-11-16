import type { Lang } from "../runner/harness/types";

export interface SyntaxItem {
  label: string;
  code: string;
  note?: string;
}

export interface SyntaxCategory {
  id: string;
  title: string;
  icon: string;
  items: SyntaxItem[];
}

export interface SyntaxSheet {
  lang: Lang;
  /** Shown expanded at the top: the snippets you reach for in almost every problem. */
  common: SyntaxItem[];
  categories: SyntaxCategory[];
}
