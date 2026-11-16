import type { Lang } from "../runner/harness/types";
import { cpp } from "./gloss/cpp";
import { java } from "./gloss/java";
import { python } from "./gloss/python";

export interface GlossaryEntry {
  /** Signature with parameter names. */
  sig: string;
  /** What it does, and what the parameters mean. */
  desc: string;
  /** Time complexity, when it matters. */
  cost?: string;
  /** Each input, in order: its name, type and what it is. */
  params?: { name: string; type: string; desc: string }[];
  /** What comes back (type and meaning); "None" / "void" when it only changes something in place. */
  returns?: { type: string; desc: string };
}

/*
 * One glossary per language (gloss/*.ts). Keys are names as they appear in code; a key starting with "." is the
 * member version (s.lower_bound) and wins over the plain one (lower_bound(first, last, x)) after a dot.
 */

export type Glossary = Record<string, GlossaryEntry>;

export const GLOSSARY: Record<Lang, Glossary> = { python3: python, java, cpp };
