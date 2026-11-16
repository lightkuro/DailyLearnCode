# Contributing

Thanks for helping! Bug fixes, new problems, quiz questions, Detective cases, Learn pages and UI improvements are all
welcome.

## Before you open a pull request

1. **Open an issue first** for anything bigger than a small fix or a single piece of content, so we can agree on the
   approach.
2. **Run the checks.** CI runs the same ones.
   ```bash
   npm run lint && npm run typecheck && npm test && npm run build
   ```
   If you touched anything in `content/`:
   ```bash
   npm run content:validate -- content/days/<date>.json
   ```
   Learn pages only:
   ```bash
   npm run learn:validate -- <slug>
   ```
   `content:validate` needs `python3`, a JDK 21 `javac`/`java`, and `g++` with C++23 support.
3. For UI changes, include a screenshot (desktop and phone if the layout changed). If you can, also run the browser
   test: `npm run build && npm run serve:dist`, then `npm run e2e` in another terminal.
4. Keep pull requests focused, one change per PR. Add a line to `content/patch-notes.md` for anything players will
   notice.

## Content guidelines

- **Original problems only.** Write your own statement, story and examples. Don't copy text from LeetCode or other
  sites. `similarLC` may point to a similar LeetCode problem by number and title.
- **Correctness comes from code.** Reference solutions in Python, Java and C++ must all pass. Expected outputs are
  computed from the Python reference (`npm run content:finalize`), never typed by hand.
- **Starter quiz questions test ideas, not stamina.** A reader should get the answer by recognising the pattern
  after reading once or twice. No hand-tracing loops, filling DP tables or simulating many steps.
- **Tags** must come from `src/content/topics.ts`; the validator rejects anything else.
- **Comments in solutions:** every reference solution needs some (the validator checks). They explain *why*,
  briefly and in plain words. Players can hide comments, so the code must still read clearly without them.
- Formats and the full checklist: [docs/content-format.md](docs/content-format.md) and
  [docs/learn-pages.md](docs/learn-pages.md).

## Code style

TypeScript, React function components, Tailwind for styling. Run the linter and match the surrounding code. Keep
the site static: no server code and no new third-party scripts unless there is a strong reason. Any new origin also
needs a CSP entry in `public/_headers`.

## Licence

By contributing, you agree that your contribution is licensed under the [MIT licence](LICENSE) like the rest of the
project.
