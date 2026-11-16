---
title: JavaScript, TypeScript & React crash course
summary: JavaScript, TypeScript, HTML and React for programmers who already know another language: the semantics that surprise you, idiomatic modern code, the browser model and LeetCode idioms.
related: language-gotchas, concurrency, hashing, heaps, stacks-queues, networking, security
terms:
  - TypeScript #typescript
  - React #react
  - JSX #components-and-jsx
  - useState #state-with-usestate
  - useEffect #effects-with-useeffect
  - DOM #the-dom-queryselector-and-events
  - optional chaining #missing-values-null-undefined-and
  - nullish coalescing #missing-values-null-undefined-and
  - structural typing #structural-typing
  - type narrowing #unions-and-narrowing
  - promises #promises-and-async-await
  - flexbox #css-in-five-minutes
---

## How to read this page

This page is for people who already program well in something else (Python, Java, C++, C#, Go) and want to write correct, idiomatic JavaScript, TypeScript and React quickly. It skips what a loop or a class is and concentrates on how these languages do things and where they will surprise you.

The pieces fit together like this:

- **JavaScript** (the standard is called ECMAScript; this page assumes ES2023 or later) is the language. It runs in every browser and, through **Node.js**, on servers and your command line.
- **TypeScript** (5.x and 6.0) is JavaScript plus a static type system. The compiler checks your types and then deletes them, leaving plain JavaScript.
- **HTML** describes a page's structure, **CSS** its look, and the **DOM** is the live object tree that JavaScript reads and changes.
- **React** (version 19) is a library for building user interfaces out of functions that turn state into HTML.

Read the JavaScript section first, then whichever of the others you need. The last two sections cover LeetCode idioms and a comparison table for Python, Java and C++ programmers.

## Where JavaScript runs

JavaScript has no `main` function and no single standard library. What you can call depends on the **host**:

| Host | Gives you | Doesn't have |
|---|---|---|
| Browser | `document`, `window`, `fetch`, `localStorage`, DOM events | file system, processes |
| Node.js 20+ | `fs`, `process`, `http`, `fetch`, `npm` packages | `document`, `window` |
| Both | the language itself, `console`, `JSON`, `Math`, `Map`, `Set`, `Promise`, `setTimeout`, `structuredClone` | |

To try things, install Node (an LTS release: 22 or 24) and run a file or open a REPL:

```bash
node --version
node hello.js
# interactive prompt
node
```

The browser's developer tools (F12) also have a console where you can type JavaScript against the current page.

**npm** is the package manager that comes with Node. A project is a folder with a `package.json` listing its dependencies and scripts; `npm install` fills `node_modules/`. More in [Tooling](#tooling-npm-vite-and-scripts).

## JavaScript the language

### let and const, never var

```js
const limit = 10;
let count = 0;
count += 1;

// const freezes the binding, not the value
const items = [1, 2];
items.push(3);
console.log(items); // [ 1, 2, 3 ]
```

- `const` for anything you don't reassign (most variables), `let` for the rest. Both are block scoped, like Java or C++ locals.
- `var` is the old function-scoped declaration with hoisting quirks. Don't write it; recognise it in old code.
- Statements end with semicolons. They are optional thanks to automatic semicolon insertion, but most style guides (and formatters such as Prettier) add them. The trap: `return` followed by a newline returns `undefined`.

### Numbers, strings and the other primitives

JavaScript has seven primitive types: `number`, `string`, `boolean`, `undefined`, `null`, `bigint` and `symbol`. Everything else is an object (arrays and functions included). `typeof` tells them apart, with one historical bug: `typeof null === "object"`.

The big surprise for C++ and Java programmers: **there is no integer type**. Every `number` is a 64-bit IEEE 754 double.

```js
console.log(0.1 + 0.2);                 // 0.30000000000000004
console.log(7 / 2);                     // 3.5 (no integer division)
console.log(Math.trunc(7 / 2));         // 3
console.log(Math.floor(-7 / 2));        // -4
console.log(-7 % 2);                    // -1 (sign follows left operand)
console.log(Number.MAX_SAFE_INTEGER);   // 9007199254740991 (2^53 - 1)
console.log(2 ** 53 + 1);               // 9007199254740992 (precision lost)
console.log(1 / 0, Number.isNaN(0 / 0));// Infinity true
console.log(2n ** 64n);                 // 18446744073709551616n
```

- Integers are exact up to 2^53 − 1 (`Number.MAX_SAFE_INTEGER`). Past that, use **BigInt**: write `123n` or `BigInt(x)`. BigInts don't mix with numbers (`1n + 1` is a `TypeError`) and are much slower.
- Division never truncates. Use `Math.trunc` (toward zero, like C++ and Java) or `Math.floor` (like Python's `//`).
- Bitwise operators (`|`, `&`, `^`, `<<`, `>>`) convert to a **32-bit signed** integer first. `x | 0` truncates, but silently breaks for values above 2^31 − 1. `>>>` is the unsigned shift.
- Division by zero gives `Infinity` or `NaN` instead of throwing. `NaN !== NaN`, so test with `Number.isNaN`.
- `parseInt("42px")` is 42; `Number("42px")` is `NaN`. Prefer `Number` for strict parsing.

Strings are immutable sequences of UTF-16 code units, with no separate `char` type (a character is a one-length string). Single and double quotes are the same; backticks make a **template literal** with interpolation and real newlines:

```js
const name = "Ada";
const n = 3;
console.log(`${name} has ${n * 2} items`); // Ada has 6 items
console.log("abc".at(-1), "abc"[0]);       // c a
console.log("a,b,c".split(","));           // [ 'a', 'b', 'c' ]
console.log("ab".repeat(2), " x ".trim()); // abab x
console.log("é😀".length, [..."é😀"].length); // 3 2 (emoji is two code units)
console.log("a".charCodeAt(0));             // 97
```

### Equality and truthiness

Use `===` and `!==` everywhere. `==` converts types first (`0 == ""` is true) and the rules aren't worth learning; [language gotchas](/learn/language-gotchas#javascript-coercion-and-this) lists the worst cases. The one accepted exception is `x == null`, which is true for both `null` and `undefined`.

`===` on objects compares **references**, like Java's `==`. Two arrays with the same contents are not equal; there is no built-in deep equality.

In an `if`, these values are **falsy**: `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined`, `NaN`. Everything else is truthy, including `"0"`, `[]` and `{}` (unlike Python, empty collections are truthy). Test `arr.length === 0` for empty arrays.

### Missing values: null, undefined, ?. and ??

JavaScript has two "nothing" values:

- `undefined` is what you get from a missing object property, an array index past the end, a parameter nobody passed, or a function without `return`. Reading a missing property never throws.
- `null` is an explicit "no value" that code assigns on purpose.

Treat both as "missing". Two operators make that easy:

```js
const user = { name: "Ada", address: null };

// optional chaining stops at null/undefined
console.log(user.address?.city);        // undefined
console.log(user.getAge?.());           // undefined (method missing)

// ?? replaces only null/undefined, || replaces every falsy value
const retries = 0;
console.log(retries ?? 3, retries || 3); // 0 3

const opts = {};
opts.timeout ??= 1000;
console.log(opts);                       // { timeout: 1000 }
```

**Optional chaining** (`a?.b`, `a?.[i]`, `f?.()`) short-circuits to `undefined` instead of throwing a `TypeError`. **Nullish coalescing** (`a ?? b`) picks `b` only when `a` is `null` or `undefined`, so it keeps legitimate `0` and `""` values that `||` would discard.

### Objects and arrays are references

Objects are hash-map-like bags of properties, written as literals. Variables hold references, exactly like Java objects or Python lists: assignment and argument passing share the same object.

```js
const point = { x: 1, y: 2 };
const alias = point;
alias.x = 99;
console.log(point.x); // 99

const key = "y";
console.log(point[key], "x" in point);  // 2 true
point.z = 3;
delete point.z;

for (const [k, v] of Object.entries(point)) console.log(k, v);

// copies: spread is shallow, structuredClone is deep
const nested = { tags: ["a"] };
const shallow = { ...nested };
const deep = structuredClone(nested);
nested.tags.push("b");
console.log(shallow.tags, deep.tags);   // [ 'a', 'b' ] [ 'a' ]
```

Arrays are dynamic, can hold mixed types, and are objects too. Writing past the end grows the array (with holes); reading past the end gives `undefined` instead of an exception. Common operations: `push`/`pop` at the end are O(1), `shift`/`unshift` at the front are O(n), `slice(a, b)` copies, `splice` edits in place, `arr.at(-1)` reads the last element.

Use `for (const x of arr)` to loop over values. `for...in` loops over *keys as strings*, including inherited ones; don't use it on arrays.

### Destructuring and spread

Destructuring pulls values out of arrays and objects; `...` collects or spreads the rest:

```js
const [first, second = 0, ...rest] = [10, 20, 30, 40];
console.log(first, second, rest);       // 10 20 [ 30, 40 ]

const { name, age = 0, ...others } = { name: "Ada", role: "dev" };
console.log(name, age, others);         // Ada 0 { role: 'dev' }

// swap without temp
let a = 1, b = 2;
[a, b] = [b, a];

// merge, later keys win
const defaults = { color: "red", size: 1 };
const merged = { ...defaults, size: 2 };
console.log(merged);                    // { color: 'red', size: 2 }

// options object, destructured in parameters
function connect({ host, port = 443 }) {
  return `${host}:${port}`;
}
console.log(connect({ host: "example.com" })); // example.com:443
console.log(Math.max(...[3, 9, 4]));    // 9
```

Passing an options object and destructuring it is JavaScript's answer to keyword arguments.

### Functions, arrow functions and this

There are two kinds of function:

```js
function add(a, b = 0) {
  return a + b;
}

// arrow function, expression body returns implicitly
const square = (x) => x * x;
// object literal body needs parentheses
const pair = (x) => ({ x, double: x * 2 });

// rest parameter collects extra args into array
const sum = (...nums) => nums.reduce((s, n) => s + n, 0);

console.log(add(2), square(4), pair(3), sum(1, 2, 3)); // 2 16 { x: 3, double: 6 } 6
```

- Functions are values: pass them, return them, store them in objects.
- Calling with too few arguments is legal (the missing ones are `undefined`); too many are ignored. There is no overloading.
- **`this`** in a `function` (or method) is decided by *how it's called*: `obj.method()` sets `this` to `obj`, but pulling the method out and calling it alone loses it. An **arrow function** has no `this` of its own; it uses the surrounding one.

Practical rule: use method syntax in classes and object literals, and arrow functions for callbacks (`arr.map(x => ...)`, event handlers, `setTimeout`). Then `this` behaves the way a Java or C++ programmer expects. [Language gotchas](/learn/language-gotchas#javascript-coercion-and-this) shows the failure case.

### Closures

A function keeps access to the variables in scope where it was created, even after that scope has returned. This is used constantly, for callbacks, factories and private state:

```js
function makeCounter() {
  let count = 0;
  return () => ++count;
}

const next = makeCounter();
next();
console.log(next()); // 2

// let gives each iteration its own i
const fns = [];
for (let i = 0; i < 3; i++) fns.push(() => i);
console.log(fns.map((f) => f())); // [ 0, 1, 2 ]
```

With `var` instead of `let`, that loop would print `[3, 3, 3]`: one shared variable, read when the functions run.

### Array methods cheat sheet

Idiomatic JavaScript transforms arrays with methods and callbacks instead of index loops. The callback gets `(value, index, array)`.

| Method | Returns | Notes |
|---|---|---|
| `map(f)` | new array | transform each element |
| `filter(f)` | new array | keep elements where `f` is truthy |
| `reduce(f, init)` | any value | always pass `init` (empty array without it throws) |
| `find(f)` / `findIndex(f)` | element or `undefined` / index or −1 | first match; `findLast` searches from the end |
| `some(f)` / `every(f)` | boolean | short-circuit |
| `includes(x)` / `indexOf(x)` | boolean / index | O(n); `includes` finds `NaN`, `indexOf` doesn't |
| `forEach(f)` | `undefined` | can't `break`; use `for...of` when you need to |
| `sort(cmp)` | same array, mutated | **compares as strings without `cmp`** |
| `toSorted(cmp)`, `toReversed()` | new array | ES2023 non-mutating versions |
| `slice(a, b)` / `splice(i, n, ...add)` | copy / removed items | `splice` mutates |
| `flat()` / `flatMap(f)` | new array | flatten one level |
| `join(sep)` | string | default separator is `,` |
| `Array.from(iter, f)` | new array | `Array.from({ length: n }, (_, i) => i)` |

```js
const nums = [5, 1, 10, 2];
console.log(nums.toSorted());                 // [ 1, 10, 2, 5 ] (string order!)
console.log(nums.toSorted((a, b) => a - b));  // [ 1, 2, 5, 10 ]

const words = ["pear", "fig", "apple"];
// by length, then alphabetically
words.sort((a, b) => a.length - b.length || a.localeCompare(b));
console.log(words);                           // [ 'fig', 'pear', 'apple' ]

const total = nums.filter((n) => n > 1).map((n) => n * 2).reduce((s, n) => s + n, 0);
console.log(total);                           // 34

const people = [{ name: "a", team: "x" }, { name: "b", team: "y" }, { name: "c", team: "x" }];
console.log(Object.groupBy(people, (p) => p.team).x.length); // 2
```

The comparator returns a negative number, zero or a positive number, like Java's `Comparator`. `a - b` sorts numbers ascending, `b - a` descending. Sorting is stable (guaranteed since ES2019). `Object.groupBy` needs Node 21+ or a 2024-era browser.

### Map and Set vs plain objects

Plain objects are often used as dictionaries, but their keys are always strings (or symbols): `obj[1]` and `obj["1"]` are the same slot, and inherited names like `"constructor"` can collide. For real [hash maps](/learn/hashing) use `Map` and `Set`:

```js
const counts = new Map();
for (const w of ["a", "b", "a"]) counts.set(w, (counts.get(w) ?? 0) + 1);
console.log(counts.get("a"), counts.size, counts.has("z")); // 2 2 false

for (const [word, c] of counts) console.log(word, c);  // insertion order

const seen = new Set([3, 1, 3]);
seen.add(2);
console.log([...seen]);                    // [ 3, 1, 2 ]

// keys compare by reference, so arrays as keys don't work
const grid = new Set();
grid.add([0, 1]);
console.log(grid.has([0, 1]));             // false
grid.add(`${0},${1}`);
console.log(grid.has("0,1"));              // true
```

- `Map` takes any key type, keeps insertion order, and has `size`. `Set` is the same without values.
- Keys compare with `===` semantics (plus `NaN` equals `NaN`). There's no `hashCode`/`__hash__` hook, so composite keys must be encoded as strings (`` `${r},${c}` ``) or numbers (`r * cols + c`).
- Node 22+ also has the ES2025 set methods: `a.union(b)`, `a.intersection(b)`, `a.difference(b)`, `a.isSubsetOf(b)`.
- Use plain objects for records with fixed field names (and for JSON); use `Map` for lookups keyed by data.

### Classes

Classes are syntax over JavaScript's prototype-based objects, and look familiar:

```js
class Account {
  // private field (enforced at runtime)
  #balance = 0;
  static count = 0;

  constructor(owner) {
    this.owner = owner;
    Account.count++;
  }

  deposit(amount) {
    if (amount <= 0) throw new RangeError("amount must be positive");
    this.#balance += amount;
    return this;
  }

  get balance() {
    return this.#balance;
  }
}

class Savings extends Account {
  constructor(owner, rate) {
    super(owner);
    this.rate = rate;
  }
}

const s = new Savings("Ada", 0.02).deposit(50);
console.log(s.balance, s instanceof Account, Account.count); // 50 true 1
```

Fields are public unless prefixed with `#`. There are no interfaces, abstract classes or overloads in JavaScript itself (TypeScript adds the first two at the type level). Single inheritance only. Idiomatic JavaScript uses classes less than Java does: plain objects and functions are often enough.

### Modules

Modern code uses **ES modules** (ESM): every file is its own scope, and you share things with `export` and `import`.

```js
// math.js
export function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}
export const PHI = 1.618;
export default class Fraction {}
```

```js
// main.js
import Fraction, { gcd, PHI as goldenRatio } from "./math.js";
import * as math from "./math.js";
import { readFile } from "node:fs/promises";
```

- Named exports are imported by name in braces; the one `default` export takes any name. Many teams use only named exports.
- Relative imports need the file extension in Node and the browser (`./math.js`). Bundlers and TypeScript setups often let you leave it off.
- Node treats a file as ESM when it ends in `.mjs` or the nearest `package.json` has `"type": "module"`. Older Node code uses **CommonJS** (`const fs = require("fs")`, `module.exports = ...`); you will still see it.
- Modules run in strict mode automatically, and support top-level `await`.

### Errors

```js
class NotFoundError extends Error {
  constructor(id, options) {
    super(`no item ${id}`, options);
    this.name = "NotFoundError";
  }
}

function load(id) {
  try {
    return JSON.parse("{bad json");
  } catch (err) {
    // keep original error as cause
    throw new NotFoundError(id, { cause: err });
  } finally {
    console.log("cleanup runs either way");
  }
}

try {
  load(7);
} catch (err) {
  // no item 7 SyntaxError
  if (err instanceof NotFoundError) console.log(err.message, err.cause.name);
  else throw err;
}
```

- There are no checked exceptions and no typed `catch` clauses: one `catch` gets everything, and you branch with `instanceof`.
- You can `throw` any value, but always throw `Error` objects (they carry a stack trace).
- Built-ins rarely throw where Java would: out-of-range indexes give `undefined`, bad arithmetic gives `NaN`. The common runtime error is `TypeError: Cannot read properties of undefined`, which `?.` and TypeScript largely prevent.
- Errors inside async code surface as rejected promises; see the next section.

## Async JavaScript

### The event loop in one paragraph

JavaScript runs your code on **one thread** with an **event loop**. Slow work (network, timers, disk, user input) is handed to the host, and when it finishes, a callback is queued. The loop runs one queued task at a time, each to completion, so two pieces of your code never run at the same moment and you need no locks. The price: a long-running loop blocks everything, including the page's rendering and every other request on a Node server. After each task, the loop drains the **microtask** queue (promise callbacks) before taking the next task (timers, I/O). The [concurrency page](/learn/concurrency#async-await-and-event-loops) compares this model with threads.

```js
console.log("1 sync");
setTimeout(() => console.log("4 timer (task)"), 0);
Promise.resolve().then(() => console.log("3 promise (microtask)"));
console.log("2 sync");
```

For real CPU parallelism there are Web Workers in browsers and `worker_threads` in Node, which run in separate threads and communicate by messages.

### Promises and async/await

A **promise** is an object representing a result that will arrive later (Java's `CompletableFuture`, Python's awaitable). It is pending, then either fulfilled with a value or rejected with an error. `async` functions always return a promise, and `await` pauses the function (not the thread) until a promise settles:

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchScore(id) {
  await sleep(10);
  if (id < 0) throw new Error("bad id");
  return id * 10;
}

async function main() {
  const score = await fetchScore(4);
  console.log(score); // 40
  try {
    await fetchScore(-1);
  } catch (err) {
    console.log("caught", err.message); // caught bad id
  }
}

await main();
```

- `await` only works inside an `async` function or at the top level of a module.
- An `async` function's `throw` becomes a rejection, and `await` on a rejected promise throws, so ordinary `try`/`catch` works.
- The older style chains callbacks: `fetchScore(4).then(s => ...).catch(err => ...)`. Same mechanism; prefer `await` in new code.
- **Forgetting `await`** is the classic bug: you get a `Promise` object instead of a value, and errors become unhandled rejections (which crash a Node process). TypeScript catches many of these, and linters flag "floating" promises.

### Running things in parallel

`await` in a loop runs operations one after another. To start them all and wait for every result, use `Promise.all`:

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const double = async (x) => { await sleep(50); return x * 2; };

const t0 = Date.now();
// all three start at once
const results = await Promise.all([1, 2, 3].map(double));
console.log(results, Date.now() - t0 < 100); // [ 2, 4, 6 ] true

const settled = await Promise.allSettled([double(1), Promise.reject(new Error("x"))]);
console.log(settled.map((r) => r.status));   // [ 'fulfilled', 'rejected' ]
```

| Combinator | Settles when | Typical use |
|---|---|---|
| `Promise.all` | all fulfil, or first rejection | parallel requests that all must succeed |
| `Promise.allSettled` | all settle | batch where some may fail |
| `Promise.race` | first settles | timeouts |
| `Promise.any` | first fulfils | fastest mirror |

### Async callbacks and forEach

`forEach` calls its callback and throws away the return value. An `async` callback returns a promise, so `forEach` starts every call and returns at once, without waiting for any of them. Code after the loop runs before the work is done, `await arr.forEach(...)` awaits `undefined`, and a rejection inside becomes an unhandled rejection that no surrounding `try`/`catch` sees:

```js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const save = async (id, log) => { await sleep(10); log.push(id); };

const a = [];
// forEach drops the promise each async callback returns
[1, 2, 3].forEach(async (id) => { await save(id, a); });
console.log(a); // [] (saves still running)

const b = [];
// one at a time, in order
for (const id of [1, 2, 3]) {
  await save(id, b);
}
console.log(b); // [ 1, 2, 3 ]

const c = [];
// all at once; waits for every one (rejects on first failure)
await Promise.all([1, 2, 3].map((id) => save(id, c)));
console.log(c); // [ 1, 2, 3 ]
```

Pick by what you need: **`for...of` with `await`** when order matters or each step depends on the last (total time is the sum); **`Promise.all` with `map`** when the calls are independent (total time is the slowest one). For thousands of items, neither extreme is right: run them in batches or with a small concurrency limit so you don't open thousands of requests at once. The same trap applies to `filter`, `some` and `reduce` with async callbacks: they get promises, and a promise is always truthy. Linters catch it (`no-misused-promises` in typescript-eslint).

### fetch

`fetch` is the standard HTTP client in browsers and in Node 18+:

```js
async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  // fetch rejects only on network failure, not on 404/500
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// POST with JSON body
async function createItem(item) {
  const res = await fetch("/api/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return res.json();
}
```

`JSON.stringify` and `JSON.parse` convert between objects and JSON text. For timeouts and cancellation, pass `signal: AbortSignal.timeout(5000)`. Browsers restrict cross-origin requests; see [CORS](/learn/networking#cors).

## TypeScript

TypeScript adds static types to JavaScript and nothing else of substance. Every JavaScript program is (nearly) a valid TypeScript program; you add annotations, run the compiler `tsc` to check them, and the output is JavaScript with the types removed. In practice almost all professional front-end code and much Node code is TypeScript.

### Structural typing

The first thing to unlearn from Java and C++: types are **structural**, not nominal. A value fits a type if it has the right shape, whatever it was declared as. There's no `implements` needed:

```ts
interface Point {
  x: number;
  y: number;
}

function norm(p: Point): number {
  return Math.hypot(p.x, p.y);
}

class Vec {
  constructor(public x: number, public y: number, public z = 0) {}
}

// any object with numeric x and y fits
const fromLiteral = norm({ x: 3, y: 4 });
const fromClass = norm(new Vec(3, 4));
console.log(fromLiteral, fromClass); // 5 5
```

Extra properties are fine when passing an existing variable, but an object *literal* with unknown properties (`norm({ x: 1, y: 2, w: 3 })`) is flagged as a likely typo ("excess property check").

### Annotations and inference

Annotate function parameters and return types of exported functions; let the compiler infer the rest:

```ts
// inferred as number
let count = 0;
const names: string[] = [];
const scores = new Map<string, number>();
// tuple (fixed length and types)
const pair: [string, number] = ["age", 42];

function average(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// optional param and object type inline
function greet(name: string, opts?: { loud: boolean }): string {
  const text = `hello ${name}`;
  return opts?.loud ? text.toUpperCase() : text;
}

// function type
const compare: (a: number, b: number) => number = (a, b) => a - b;
console.log(count, names, scores.size, pair, average([1, 2]), greet("ts"), compare(1, 2));
```

`number[]` and `Array<number>` are the same type. `readonly number[]` forbids mutation.

### Interfaces and type aliases

Both name an object shape, and mostly they are interchangeable:

```ts
interface User {
  id: number;
  name: string;
  // optional
  email?: string;
  readonly createdAt: Date;
}

interface Admin extends User {
  permissions: string[];
}

type Id = number | string;
type Pt = { x: number; y: number };
type Labeled = Pt & { label: string };

const admin: Admin = { id: 1, name: "Ada", createdAt: new Date(), permissions: ["all"] };
const spot: Labeled = { x: 0, y: 0, label: "origin" };
const ids: Id[] = [1, "two"];
console.log(admin.name, spot.label, ids.length);
```

- `interface` describes object shapes, can `extends`, and can be reopened to add members (declaration merging).
- `type` can name *anything*: unions, tuples, primitives, function types, mapped types. `&` intersects types.
- A common convention: `interface` for object shapes, `type` for everything else. Pick one style per codebase.

### Unions and narrowing

A union `A | B` holds a value of either type. Before using type-specific members you **narrow** it with an ordinary runtime check, and the compiler follows your control flow:

```ts
function describe(x: string | number | null): string {
  if (x === null) return "nothing";
  // x is string | number here
  if (typeof x === "string") return x.toUpperCase();
  // only number left
  return x.toFixed(2);
}

// discriminated union (shared literal "kind" field)
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "rect"; w: number; h: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "rect":
      return s.w * s.h;
    default: {
      // compile error here if a new kind is added and not handled
      const unreachable: never = s;
      return unreachable;
    }
  }
}

console.log(describe(null), describe("hi"), describe(2), area({ kind: "rect", w: 2, h: 3 }));
```

Narrowing works with `typeof`, `instanceof`, `in`, `===` against literals, truthiness checks, and your own **type guards** (`function isUser(x: unknown): x is User`). The **discriminated union** pattern (a shared literal field like `kind` or `type`) is TypeScript's equivalent of a sealed class hierarchy or a Rust enum, and is everywhere in real code (React reducers, API responses).

With `strictNullChecks` on, `null` and `undefined` are not part of every type: `string` can't be null, and a possibly-missing value is `string | undefined`, which you must narrow before use. That alone eliminates most `TypeError`s.

### Literal types

A string or number literal can be a type, and a union of literals replaces most enums:

```ts
type Direction = "up" | "down" | "left" | "right";
type Dice = 1 | 2 | 3 | 4 | 5 | 6;

function move(d: Direction) {
  return d;
}
move("up");
// move("north"); // error: not assignable to Direction

// as const keeps literal types and makes it readonly
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;
const COLORS = ["red", "green"] as const;
type Color = (typeof COLORS)[number]; // "red" | "green"
const c: Color = "green";
const roll: Dice = 6;
console.log(DIRS.length, c, roll);
```

TypeScript also has an `enum` keyword, but it generates runtime code (unlike everything else in TypeScript), and Node's built-in type stripping rejects it. Prefer literal unions.

### Generics

Generics look like Java's, are checked structurally, and disappear at runtime (like Java's erasure, unlike C++ templates):

```ts
function last<T>(arr: readonly T[]): T | undefined {
  return arr[arr.length - 1];
}

// constraint, keyof and indexed access
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((item) => item[key]);
}

class Stack<T> {
  private items: T[] = [];
  push(item: T): void {
    this.items.push(item);
  }
  pop(): T | undefined {
    return this.items.pop();
  }
}

const n = last([1, 2, 3]);
const names = pluck([{ name: "a", age: 1 }], "name");
const s = new Stack<string>();
s.push("x");
console.log(n, names, s.pop());
```

The type argument is usually inferred: `last([1, 2, 3])` infers `T = number`. `keyof T` is the union of `T`'s property names, and `T[K]` is the type of property `K`.

### unknown vs any

- `any` switches type checking off for that value: anything goes, and errors show up at runtime. It spreads silently through your code. Avoid it.
- `unknown` is the safe top type: anything can be assigned to it, but you can't use it until you narrow it. Use it for data from outside (parsed JSON, `catch` variables, user input).
- `never` is the empty type (a function that always throws, an impossible branch).

```ts
function parseAge(raw: string): number {
  const data: unknown = JSON.parse(raw);
  if (typeof data === "object" && data !== null && "age" in data && typeof data.age === "number") {
    return data.age;
  }
  throw new Error("invalid payload");
}

try {
  parseAge("{}");
} catch (err) {
  // err is unknown in strict mode
  if (err instanceof Error) console.log(err.message);
}
console.log(parseAge('{"age": 7}'));
```

Type assertions (`value as User`) tell the compiler to trust you without checking anything. Validate external data at the boundary instead (by hand as above, or with a schema library such as Zod).

### Strict mode and tsconfig

`tsconfig.json` configures the compiler. The most important setting is `"strict": true`, which turns on `strictNullChecks`, `noImplicitAny` and several other checks. It is the default from TypeScript 6.0 and is what everyone means by "TypeScript"; without it, the type system lets too much through. A reasonable starting point for a Node project:

```json
{
  "compilerOptions": {
    "target": "es2023",
    "module": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`noUncheckedIndexedAccess` (not part of `strict`) makes `arr[i]` and `record[key]` have type `T | undefined`, which is honest but noisier; it's worth turning on for application code.

Running TypeScript: `npx tsc --noEmit` type-checks without writing output. Bundlers (Vite, esbuild) and runners (`tsx`) strip types without checking, for speed, so run `tsc` in CI. Node 22.18+ and 23.6+ can run a `.ts` file directly (`node app.ts`) by stripping types, as long as it only uses erasable syntax (no `enum`, no `namespace`).

### Utility types

The standard library includes generic types that transform other types:

```ts
interface Todo {
  id: number;
  title: string;
  done: boolean;
}

// all fields optional, good for updates
type TodoPatch = Partial<Todo>;
type TodoPreview = Pick<Todo, "id" | "title">;
type NewTodo = Omit<Todo, "id">;
type ByStatus = Record<"open" | "closed", Todo[]>;

function update(todo: Todo, patch: TodoPatch): Todo {
  return { ...todo, ...patch };
}

const t: Todo = { id: 1, title: "write", done: false };
const preview: TodoPreview = { id: 2, title: "read" };
const draft: NewTodo = { title: "ship", done: false };
const board: ByStatus = { open: [t], closed: [] };
type Fn = typeof update;
type Out = ReturnType<Fn>; // Todo
const out: Out = update(t, { done: true });
console.log(out.done, preview.title, draft.title, board.open.length);
```

Others worth knowing: `Required<T>`, `Readonly<T>`, `NonNullable<T>`, `Parameters<F>`, `Awaited<P>`. The `satisfies` operator checks a value against a type without widening it: `const config = { port: 80 } satisfies Partial<Config>`.

### Types are erased at runtime

Nothing from the type system exists when the code runs. That means:

- You can't check `x instanceof User` when `User` is an interface or type; check fields, or use a class.
- There's no reflection on generic parameters (`T` inside a function is gone).
- A value typed `User` that came from `JSON.parse` or `fetch` is only *claimed* to be a `User`. The compiler trusts you; validate at the boundary.
- Types never change behaviour: `(x as number) + 1` does nothing to convert `x`.

## HTML and the DOM

If you've never done web work, here is the minimum to read and write a page. The browser downloads an **HTML** document, which declares the content and structure; **CSS** styles it; **JavaScript** makes it interactive by changing the **DOM**.

### Document structure

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Scores</title>
    <link rel="stylesheet" href="styles.css" />
    <script type="module" src="main.js"></script>
  </head>
  <body>
    <header>
      <nav><a href="/">Home</a> <a href="/about">About</a></nav>
    </header>
    <main>
      <h1>High scores</h1>
      <ul id="scores"></ul>
    </main>
    <footer>Made with care</footer>
  </body>
</html>
```

- An **element** is an opening tag, content and a closing tag: `<p>Hello</p>`. Some are empty (`<img>`, `<input>`, `<meta>`). Tags carry **attributes**: `id` (unique on the page), `class` (space-separated style hooks), `href`, `src` and so on.
- `<head>` holds metadata (title, character set, stylesheets, scripts); `<body>` holds what's shown.
- The `viewport` meta tag makes the page render at device width on phones. Always include it.
- `type="module"` scripts are deferred: they run after the HTML is parsed, so the elements exist when your code looks for them.

### Semantic elements and accessibility

Use elements for what they *mean*, not how they look. The browser, search engines and assistive technology (screen readers, keyboard navigation) all depend on it.

| Element | Meaning |
|---|---|
| `<header>`, `<nav>`, `<main>`, `<footer>`, `<aside>` | page regions (one `<main>` per page) |
| `<article>`, `<section>` | self-contained content, thematic group |
| `<h1>`…`<h6>` | headings, in order, without skipping levels |
| `<p>`, `<ul>`/`<ol>`/`<li>`, `<table>` | paragraphs, lists, tabular data |
| `<a href>` | navigation to another URL |
| `<button>` | an action on this page |
| `<div>`, `<span>` | generic block and inline containers, no meaning |

Accessibility basics that cost nothing:

- Clickable things are `<button>` or `<a>`, never a `<div>` with a click handler: real buttons are focusable, work with Enter and Space, and are announced as buttons.
- Every `<img>` has `alt` text (empty `alt=""` for decoration).
- Every form field has a `<label>`.
- Keep a visible focus outline and sufficient colour contrast.
- Reach for `aria-*` attributes only when no native element fits; the first rule of ARIA is to not use it when HTML already does the job.

### Forms

```html
<form id="signup">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required />

  <label for="plan">Plan</label>
  <select id="plan" name="plan">
    <option value="free">Free</option>
    <option value="pro">Pro</option>
  </select>

  <label><input type="checkbox" name="news" /> Send me news</label>
  <button type="submit">Sign up</button>
</form>
```

- A `<label for="x">` is tied to the input with `id="x"`; clicking the label focuses the field and screen readers read it out. Wrapping the input inside the label works too.
- `name` is the key the value is submitted under. Input `type`s (`email`, `number`, `date`, `password`, `checkbox`) give the right mobile keyboard and built-in validation (`required`, `min`, `pattern`).
- By default, submitting a form navigates to its `action` URL. In a JavaScript app you usually handle the `submit` event and call `event.preventDefault()`.

### The DOM, querySelector and events

The browser parses HTML into the **DOM** (Document Object Model): a tree of element objects that JavaScript can read and change, with the change showing on screen immediately.

```js
const list = document.querySelector("#scores");
const scores = [{ name: "Ada", points: 42 }, { name: "Linus", points: 37 }];

for (const s of scores) {
  const li = document.createElement("li");
  // textContent, not innerHTML, so names can't inject markup
  li.textContent = `${s.name}: ${s.points}`;
  li.dataset.points = String(s.points);
  list.append(li);
}

// one listener on the parent handles every item (event delegation)
list.addEventListener("click", (event) => {
  const li = event.target.closest("li");
  if (li) li.classList.toggle("selected");
});

document.querySelector("#signup").addEventListener("submit", (event) => {
  // stay on page instead of navigating
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  console.log(data.get("email"), data.get("news") === "on");
});
```

- `querySelector` takes a CSS selector and returns the first match or `null`; `querySelectorAll` returns all matches (a `NodeList`, which has `forEach` and works with `for...of`).
- Set text with `textContent`. Setting `innerHTML` with user data is the classic [XSS](/learn/security#cross-site-scripting-xss) hole.
- `classList.add/remove/toggle` changes classes (and therefore styling); `element.style.x` sets inline styles; `dataset` reads `data-*` attributes.
- Events **bubble**: a click on an `<li>` fires on the `<li>`, then on the `<ul>`, and so on up to `document`. `event.target` is where it started, `event.currentTarget` where the listener is. Listening on a parent (**event delegation**) handles items added later.

Changing the DOM by hand like this is fine for small pages. As the UI grows, keeping the DOM in sync with your data becomes the hard part, which is the problem React solves.

### CSS in five minutes

CSS rules pick elements with a **selector** and set properties:

```css
/* every element sizes including padding and border */
*, *::before, *::after { box-sizing: border-box; }

body { font-family: system-ui, sans-serif; margin: 0; }

/* class selector */
.card { padding: 1rem; border: 1px solid #ccc; border-radius: 8px; }

/* children of .toolbar laid out in a row */
.toolbar { display: flex; gap: 0.5rem; align-items: center; justify-content: space-between; }

/* responsive grid of cards, at least 200px wide */
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }

/* narrow screens */
@media (max-width: 600px) { .toolbar { flex-direction: column; } }

li.selected { font-weight: bold; }
```

- **Selectors**: `tag`, `.class`, `#id`, `parent child`, `a:hover`, `[type="email"]`. When rules conflict, the more specific selector wins (id beats class beats tag), then the later rule. That's the "cascade".
- **Box model**: every element is a box of content, then padding, then border, then margin. `box-sizing: border-box` makes `width` include padding and border, which is what you expect; nearly every site sets it globally.
- **Display**: block elements (`div`, `p`, headings) stack vertically and take the full width; inline elements (`span`, `a`) flow within text.
- **Layout**: **flexbox** (`display: flex`) arranges children along one axis (a row or a column) with `gap`, `justify-content` (main axis) and `align-items` (cross axis). **Grid** (`display: grid`) lays children out in two dimensions. Between them they cover almost every layout; you will rarely need floats or absolute positioning.
- **Units**: `px`, `rem` (relative to the root font size, good for spacing and text), `%`, `vw`/`vh` (viewport). **Media queries** apply rules at certain screen sizes.

### How a browser loads a page

1. The browser resolves the domain, connects and requests the URL (DNS, TCP, TLS, HTTP: see [what happens when you type a URL](/learn/networking#what-happens-when-you-type-a-url)).
2. It parses the HTML top to bottom into the DOM, fetching stylesheets, images and scripts it finds along the way.
3. A plain `<script src>` stops parsing until it downloads and runs. `defer` and `type="module"` scripts download in parallel and run after parsing, in order; `async` scripts run as soon as they arrive.
4. CSS is parsed into the CSSOM. The browser combines it with the DOM, computes the **layout** (sizes and positions of every box), then **paints** pixels.
5. After that, JavaScript changes trigger re-layout and repaint as needed. Reading layout values (`offsetHeight`) right after writing styles forces an early layout, a common cause of slow pages.

Single-page apps (most React apps) ship a nearly empty HTML page plus a JavaScript bundle that builds the DOM on the client; server-rendered frameworks send real HTML first and then attach JavaScript to it ("hydration").

## React

React lets you describe the UI as a function of state. You write components that return what the screen *should* look like for the current data; React works out the minimal DOM changes. You never touch the DOM directly for normal rendering.

This section covers React 19 with function components and hooks. Class components (`class X extends React.Component`) are legacy; you'll see them in old code only.

### Components and JSX

A **component** is a function whose name starts with a capital letter and which returns **JSX**, an HTML-like syntax that compiles to JavaScript function calls:

```tsx
function Greeting({ name }: { name: string }) {
  const hour = new Date().getHours();
  return (
    <section className="greeting">
      <h2>Hello, {name}!</h2>
      {hour < 12 ? <p>Good morning.</p> : <p>Good day.</p>}
    </section>
  );
}

export function App() {
  return (
    <>
      <Greeting name="Ada" />
      <Greeting name="Linus" />
    </>
  );
}
```

JSX rules that trip people up:

- Curly braces embed any JavaScript *expression* (not statements, so use `?:`, `&&` or `.map`, not `if`/`for`, inside JSX).
- Attributes are camelCase JavaScript names: `className` (not `class`), `htmlFor` (not `for`), `onClick`, `tabIndex`. `style` takes an object: `style={{ marginTop: 8 }}`.
- A component returns one root; wrap siblings in a fragment `<>...</>`.
- Every tag must be closed: `<img />`, `<input />`.
- `{count && <Badge />}` renders a literal `0` when `count` is 0. Write `{count > 0 && <Badge />}`.
- Text in braces is escaped automatically, so `{userInput}` is safe from XSS.

Files containing JSX use the `.jsx` or `.tsx` extension.

### Props

Components receive their inputs as one object, **props**, usually destructured in the parameter list. Props are read-only: a component never modifies its props.

```tsx
import type { ReactNode } from "react";

interface CardProps {
  title: string;
  // optional, with default below
  tone?: "info" | "warning";
  children: ReactNode;
  onClose?: () => void;
}

function Card({ title, tone = "info", children, onClose }: CardProps) {
  return (
    <div className={`card card-${tone}`}>
      <h3>{title}</h3>
      {children}
      {onClose && <button onClick={onClose}>Close</button>}
    </div>
  );
}

export function Notice() {
  return (
    <Card title="Heads up" tone="warning" onClose={() => console.log("closed")}>
      <p>Saved locally only.</p>
    </Card>
  );
}
```

`children` is whatever you put between the opening and closing tags. Passing functions as props (`onClose`) is how a child tells its parent something happened.

### State with useState

**State** is data a component remembers between renders. `useState` returns the current value and a setter; calling the setter schedules a re-render with the new value:

```tsx
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  const [tags, setTags] = useState<string[]>([]);

  function addTag() {
    // new array, never push into state
    setTags([...tags, `tag${tags.length}`]);
  }

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      {/* functional update, safe when called several times */}
      <button onClick={() => { setCount((c) => c + 1); setCount((c) => c + 1); }}>+2</button>
      <button onClick={addTag}>Add tag</button>
      <p>{tags.join(", ")}</p>
    </div>
  );
}
```

The model to internalise:

- **Rendering is a pure function of props and state.** React calls your component function on every render; it must compute JSX from its inputs without side effects. Local variables are recreated each time, so anything that must survive a render goes in state (or a ref).
- **State is a snapshot.** Inside one render, `count` is a constant. `setCount(count + 1)` twice in one handler adds one, not two. Use the updater form `setCount(c => c + 1)` when the new value depends on the old.
- **Never mutate state.** React compares old and new state by reference, so `tags.push(x); setTags(tags)` does nothing visible. Create new arrays and objects: `[...arr, x]`, `arr.filter(...)`, `arr.map(...)`, `{ ...obj, field: v }`.
- Hooks (functions starting with `use`) must be called at the top level of a component, in the same order every render: never inside conditions or loops.

### Effects with useEffect

`useEffect` runs code *after* React has updated the screen, to synchronise with something outside React: a network request, a timer, a subscription, a browser API.

```tsx
import { useEffect, useState } from "react";

interface Repo {
  id: number;
  name: string;
}

export function RepoList({ user }: { user: string }) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ignore responses for previous user
    let ignore = false;
    fetch(`https://api.github.com/users/${user}/repos`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: Repo[]) => { if (!ignore) setRepos(data); })
      .catch((err: Error) => { if (!ignore) setError(err.message); });
    // cleanup runs before next effect and on unmount
    return () => { ignore = true; };
  }, [user]);

  if (error) return <p role="alert">{error}</p>;
  return <ul>{repos.map((r) => <li key={r.id}>{r.name}</li>)}</ul>;
}
```

- The **dependency array** lists every value from the component the effect uses. The effect re-runs when any of them changes. `[]` means "only after the first render". No array means "after every render" (rarely what you want).
- The returned **cleanup** function undoes the effect: clear a timer, unsubscribe, ignore a stale response.
- In development, React's Strict Mode runs effects twice on mount to expose missing cleanups. That's expected.
- In real apps, data fetching usually goes through a library (TanStack Query, SWR) or your framework's loader, which handle caching and races for you.

**You often don't need an effect.** The most common React mistake is using `useEffect` to keep state in sync with other state. Compute derived values during render instead:

```tsx
import { useState } from "react";

export function Filtered({ items }: { items: string[] }) {
  const [query, setQuery] = useState("");
  // derived during render, no extra state and no effect
  const visible = items.filter((i) => i.includes(query));
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <p>{visible.length} matches</p>
    </>
  );
}
```

Similarly, logic that responds to a user action (submitting, clicking) belongs in the event handler, not in an effect that watches for the resulting state change. `useMemo` can cache an expensive derived value, but plain computation is fine for most cases.

### Lists and keys

Render lists with `.map`, giving each element a **key** that is unique among its siblings and stable across renders:

```tsx
interface Item {
  id: string;
  label: string;
}

export function ItemList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.label}</li>
      ))}
    </ul>
  );
}
```

React uses keys to match elements between renders. Use an ID from the data. The array index works only if the list never reorders, inserts or deletes; otherwise state (like a half-typed input) ends up attached to the wrong row.

### Controlled inputs and lifting state up

A **controlled input** takes its `value` from state and reports every change through `onChange`, so state is the single source of truth:

```tsx
import { useState } from "react";

function TempInput({ celsius, onChange }: { celsius: number; onChange: (c: number) => void }) {
  return (
    <label>
      Celsius
      <input type="number" value={celsius} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Converter() {
  // state lives in common parent so both children see it
  const [celsius, setCelsius] = useState(20);
  return (
    <div>
      <TempInput celsius={celsius} onChange={setCelsius} />
      <p>{((celsius * 9) / 5 + 32).toFixed(1)} °F</p>
    </div>
  );
}
```

When two components need the same data, move the state up to their closest common parent and pass the value down as props and a setter or callback down as a function. That's **lifting state up**. Data flows down through props; events flow up through callbacks. For state needed far down the tree, React has **context** (`createContext` plus `useContext`), and larger apps add a state library, but props and lifted state go a long way.

### A complete component

A small to-do list in TSX using everything above: state, a controlled input, a form submit, immutable updates, derived values, keys and lifted callbacks.

```tsx
import { useState, type FormEvent } from "react";

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

function TodoItem({ todo, onToggle, onDelete }: {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <li>
      <label>
        <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.id)} />
        {todo.done ? <s>{todo.text}</s> : todo.text}
      </label>
      <button onClick={() => onDelete(todo.id)} aria-label={`Delete ${todo.text}`}>×</button>
    </li>
  );
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // keep page from reloading
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: Date.now(), text, done: false }]);
    setDraft("");
  }

  function toggle(id: number) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id: number) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }

  // derived, not stored
  const remaining = todos.filter((t) => !t.done).length;

  return (
    <main>
      <h1>Todos</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="new-todo">New todo</label>
        <input id="new-todo" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((t) => (
          <TodoItem key={t.id} todo={t} onToggle={toggle} onDelete={remove} />
        ))}
      </ul>
      <p>{remaining} left</p>
    </main>
  );
}
```

And the entry point that mounts it into the page's `<div id="root">`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TodoApp from "./TodoApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TodoApp />
  </StrictMode>,
);
```

The `!` is TypeScript's non-null assertion: `getElementById` returns `HTMLElement | null`, and we promise it exists.

Other hooks you'll meet: `useRef` (a mutable box that survives renders without causing them, also used to reach a DOM element), `useMemo` and `useCallback` (cache values and functions between renders), `useReducer` (state updated by a reducer function and actions, good with discriminated unions), `useContext`. In React 19, function components accept `ref` as an ordinary prop, so the old `forwardRef` wrapper is no longer needed.

### Tooling: npm, Vite and scripts

Start a React + TypeScript project with **Vite**, the standard dev server and bundler (Create React App is deprecated):

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install
# dev server with hot reload
npm run dev
# type-check and production build into dist/
npm run build
```

`package.json` holds dependencies and **npm scripts**, which `npm run <name>` executes with `node_modules/.bin` on the `PATH`:

```json
{
  "name": "my-app",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest",
    "lint": "eslint ."
  },
  "dependencies": { "react": "^19.0.0", "react-dom": "^19.0.0" },
  "devDependencies": { "typescript": "^6.0.0", "vite": "^7.0.0" }
}
```

- `npm install pkg` adds a runtime dependency, `npm install -D pkg` a dev-only one. `package-lock.json` pins exact versions; commit it. `npx tool` runs a package's command without installing it globally. `pnpm` and `yarn` are popular alternatives with the same ideas.
- The version numbers above are illustrative; the Vite template writes current ones. `^19.0.0` means "any 19.x at or above 19.0.0" (semantic versioning: breaking changes only in the major number).
- Common companions: ESLint (linting), Prettier (formatting), Vitest (tests, Jest-compatible), React Testing Library.
- For full sites with routing and server rendering, React's docs recommend a framework such as Next.js or React Router (formerly Remix) instead of hand-assembling one.

## LeetCode in JavaScript and TypeScript

LeetCode's JavaScript and TypeScript run on Node. Solutions are plain functions; the signature in the template is already typed in TypeScript.

```ts
function twoSum(nums: number[], target: number): number[] {
  // Store each val's index; look up complement before storing
  // index of each val seen so far
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    // 0 is valid index, so compare with undefined
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  return [];
}

function groupAnagrams(strs: string[]): string[][] {
  // Sorted letters as key; anagrams share key
  const groups = new Map<string, string[]>();
  for (const s of strs) {
    const key = [...s].sort().join("");
    const group = groups.get(key);
    if (group) group.push(s);
    else groups.set(key, [s]);
  }
  return [...groups.values()];
}

console.log(twoSum([2, 7, 11, 15], 9), groupAnagrams(["eat", "tea", "tan"]));
```

The idioms that matter:

- **Hashing**: `Map` and `Set`, not objects (see [above](#map-and-set-vs-plain-objects)). Composite keys as strings (`` `${r},${c}` ``) or packed numbers (`r * cols + c`, faster).
- **Sorting numbers**: always `arr.sort((a, b) => a - b)`. The default sort is lexicographic and will pass small tests and fail on `[10, 9]`. Sort pairs with `(a, b) => a[0] - b[0] || a[1] - b[1]`.
- **Filling arrays**: `new Array(n).fill(0)` for numbers. For 2D, `Array.from({ length: rows }, () => new Array(cols).fill(0))`. Never `new Array(n).fill([])`: every row would be the same array. Typed arrays (`Int32Array`, `Float64Array`, `Uint8Array`) are zero-filled, fixed-size and fast for DP tables.
- **Integer division**: `Math.floor(a / b)` (or `Math.trunc` for C-style truncation toward zero). Midpoint: `lo + ((hi - lo) >> 1)` is fine while values fit in 32 bits.
- **Large numbers**: products of two values near 10^9 exceed 2^53 and lose precision, so `(a * b) % MOD` is wrong. Use BigInt for that step (`Number((BigInt(a) * BigInt(b)) % BigInt(MOD))`) or split the multiplication.
- **Infinity**: `Infinity` and `-Infinity` are real numbers and make good sentinels. `Math.max(...arr)` throws a `RangeError` once the array is too big to pass as arguments (in current Node, past about 125,000 elements); use a loop or `reduce` for big inputs.
- **Strings**: immutable; build with an array and `join("")`, or `+=` (V8 makes that fast too). Character codes via `s.charCodeAt(i) - 97` for a letter index 0–25; counts in `new Array(26).fill(0)`.
- **Linked lists and trees**: LeetCode predefines `ListNode` and `TreeNode` classes with `val`, `next`, `left`, `right`; missing children are `null`.

### No built-in heap or deque

JavaScript's standard library has no priority queue, no deque and no sorted map. Options:

- **Queue for BFS**: `shift()` is O(n), which turns BFS into O(n²) on big inputs. Use an array plus a head index, or swap in a fresh array per level (shown below).
- **Deque**: a circular buffer, or two stacks. For the [monotonic deque](/learn/stacks-queues#monotonic-deque-sliding-window-maximum) pattern, an array plus a head index works: elements are pushed and popped at the back and only ever removed from the front.
- **Priority queue**: LeetCode preinstalls `@datastructures-js/priority-queue` (`PriorityQueue`, `MinPriorityQueue`, `MaxPriorityQueue`) and `@datastructures-js/queue`, available as globals. Their API has changed between major versions, so check LeetCode's language notes. In interviews, or anywhere else, write a small [binary heap](/learn/heaps):

```ts
class MinHeap<T> {
  // Array-backed binary heap; children of i at 2i+1 and 2i+2
  private a: T[] = [];
  constructor(private less: (x: T, y: T) => boolean) {}

  get size(): number {
    return this.a.length;
  }

  peek(): T | undefined {
    return this.a[0];
  }

  push(x: T): void {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    // sift up while smaller than parent
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }

  pop(): T | undefined {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0 && last !== undefined) {
      // move last leaf to root, then sift down
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

function kClosest(points: number[][], k: number): number[][] {
  // Max-heap of size k on squared distance; farthest kept on top
  const dist = (p: number[]) => p[0] * p[0] + p[1] * p[1];
  // reversed comparison makes max-heap
  const heap = new MinHeap<number[]>((x, y) => dist(x) > dist(y));
  for (const p of points) {
    heap.push(p);
    // too many, so drop farthest
    if (heap.size > k) heap.pop();
  }
  const out: number[][] = [];
  while (heap.size > 0) out.push(heap.pop()!);
  return out;
}

console.log(kClosest([[1, 3], [-2, 2], [5, 8], [0, 1]], 2));
```

A BFS on a grid without `shift()`:

```ts
function shortestPath(grid: number[][]): number {
  // BFS by levels from top-left over 0 cells; level count = distance
  const rows = grid.length, cols = grid[0].length;
  if (grid[0][0] === 1) return -1;
  // visited flags, packed index r * cols + c
  const seen = new Uint8Array(rows * cols);
  seen[0] = 1;
  let frontier: [number, number][] = [[0, 0]];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let dist = 0; frontier.length > 0; dist++) {
    const next: [number, number][] = [];
    for (const [r, c] of frontier) {
      if (r === rows - 1 && c === cols - 1) return dist;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nc < 0 || nr >= rows || nc >= cols || grid[nr][nc] === 1) continue;
        // mark on push, ensuring no cell is queued twice
        if (seen[nr * cols + nc]) continue;
        seen[nr * cols + nc] = 1;
        next.push([nr, nc]);
      }
    }
    frontier = next;
  }
  return -1;
}

console.log(shortestPath([[0, 0, 0], [1, 1, 0], [0, 0, 0]])); // 4
```

## Coming from Python, Java or C++

| Topic | Python | Java | C++ | JavaScript / TypeScript |
|---|---|---|---|---|
| Integers | arbitrary size | 32/64-bit, wraps | fixed width, overflow is UB | all doubles; exact to 2^53; `bigint` for more |
| Integer division | `//` floors | `/` truncates | `/` truncates | `/` is real division; `Math.floor` or `Math.trunc` |
| Equality | `==` value, `is` identity | `==` reference, `.equals` value | `==` per type | `===` (reference for objects); never `==` |
| Missing value | `None` | `null` | `nullptr`, `std::optional` | `null` and `undefined`; `?.` and `??` |
| Missing key / index | `KeyError`, `IndexError` | exception or `null` | UB or inserts (`map[k]`) | `undefined`, no error |
| Empty list in `if` | falsy | not allowed | not allowed | **truthy**; test `.length` |
| Dict / hash map | `dict` | `HashMap` | `unordered_map` | `Map` (insertion ordered) |
| Set | `set` | `HashSet` | `unordered_set` | `Set`, keys by reference |
| Tuple keys | `(r, c)` works | record or string | `pair` with hash | encode as string or number |
| Sorting | `sorted(key=)` | `Comparator` | `std::sort(cmp)` | `sort((a, b) => a - b)`; default is string order |
| Heap | `heapq` | `PriorityQueue` | `priority_queue` | none built in |
| Deque | `collections.deque` | `ArrayDeque` | `std::deque` | none; array plus head index |
| Strings | immutable, `str` | immutable, `String` | mutable `std::string` | immutable, UTF-16, no `char` |
| Keyword args | `f(x=1)` | none (builders) | none | options object `f({ x: 1 })` |
| Interfaces | duck typing, `Protocol` | nominal `interface` | concepts, inheritance | structural types (TS), erased |
| Generics | type hints only | erased | templates, compiled per type | erased, structural |
| Null safety | `Optional` hints | annotations | none | `strictNullChecks` in TS |
| Concurrency | threads, GIL, `asyncio` | threads | threads | single thread, event loop, `async`/`await` |
| Visibility | `_name` convention | `private` | `private` | `#private` (runtime) or TS `private` (compile time) |
| Modules | `import x` | packages | headers, modules | `import { x } from "./x.js"` |
| Memory | GC | GC | manual, RAII | GC |

The surprises worth rereading before your first real code:

- **From Python**: empty arrays and objects are truthy; `arr[-1]` is `undefined` (use `arr.at(-1)`); `%` takes the sign of the left operand (`-7 % 3` is `-1`), so wrap with `((a % m) + m) % m`; there is no `range`, use index loops or `Array.from({ length: n }, (_, i) => i)`; objects as dictionaries have string keys, so prefer `Map`; there's no operator overloading, so comparing arrays with `===` or `<` doesn't do what you think.
- **From Java**: no integer types means no overflow but also no exactness past 2^53; `this` isn't fixed to the instance when you pass methods around (use arrow functions); TypeScript types are structural, so two interfaces with the same fields are interchangeable; exceptions are unchecked and `catch` can't filter by type.
- **From C++**: out-of-bounds reads are safe but silently return `undefined`; everything non-primitive is a reference with garbage collection, so there's no copy-on-assign (use spread or `structuredClone`); bitwise operators truncate to 32 bits; there's no sorted map (`std::map`) or multiset, so you sort an array, binary search it, or write a tree.
- **From everything**: the default `sort` compares as strings. Pass a comparator, every time.
