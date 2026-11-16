# Third-party notices

dailylearncode is MIT licensed (see [LICENSE](LICENSE)). It uses the third-party software and fonts below, each under
its own licence.

## Loaded at runtime from a CDN (not included in this repository)

| Component | Used for | Licence |
|---|---|---|
| [Pyodide](https://pyodide.org) | Python 3 in the browser | MPL-2.0 |
| [YoWASP Clang/LLD](https://yowasp.org) (LLVM) | Compiling C++ in the browser | Apache-2.0 with LLVM exception |
| [CheerpJ](https://cheerpj.com) by Leaning Technologies | Java in the browser | CheerpJ Community licence: free for personal and non-commercial use; commercial and organisational use needs a licence from Leaning Technologies. Must be loaded from their CDN and credited ("Built with CheerpJ"). |

Exact versions are pinned in `src/runner/types.ts`.

## Included in this repository

| Component | Where | Licence |
|---|---|---|
| [Paper Mono](https://github.com/paper-design/paper-mono) by Paper | `public/fonts/PaperMono.woff2` | SIL Open Font License 1.1 (`public/fonts/PaperMono-OFL.txt`) |

## Installed from npm and bundled into the build

The npm packages are listed in `package.json`, and each one's licence is in its own package under `node_modules/`
after `npm install`. They include:

- **MIT:** React, React Router, CodeMirror, Motion, Zustand, Zod, react-markdown and remark-gfm.
- **ISC:** Lucide icons and canvas-confetti.
- **MIT or Apache-2.0:** `@bjorn3/browser_wasi_shim`.
- **SIL OFL 1.1:** the Fredoka font, via `@fontsource-variable/fredoka`.
