---
title: Java crash course
summary: Java for programmers who already know another language: running code, primitives vs boxed types, strings, generics, records, the collections you need, lambdas and streams, and LeetCode idioms.
related: language-gotchas, hashing, heaps, stacks-queues, sorting, oop-design, concurrency, os-memory
terms:
  - autoboxing #primitives-and-boxed-types
  - type erasure #generics-and-type-erasure
  - Java records #records
  - switch expressions #switch-expressions
  - TreeMap #sorted-maps-and-sets
  - TreeSet #sorted-maps-and-sets
  - computeIfAbsent #iteration-and-map-idioms
  - functional interface #functional-interfaces-and-method-references
  - method references #functional-interfaces-and-method-references
  - checked exceptions #checked-vs-unchecked
  - try-with-resources #try-with-resources
---

## Running Java code

Java source compiles to **bytecode** (`.class` files), which the **JVM** runs and compiles to machine code as it goes. You need a **JDK** (compiler plus runtime): any OpenJDK build such as Temurin, Corretto or your package manager's `openjdk-21-jdk`. This page targets **Java 21**, a long-term-support (LTS) release; Java 25 (September 2025) is the newest LTS and everything here works there too. Version numbers in brackets below mark when a feature arrived.

```bash
java -version                 # want 21 or later
java Main.java                # compile in memory and run one file (Java 11+)
javac Main.java && java Main  # classic two steps: .java to Main.class, then run class Main
jshell                        # REPL for trying expressions without a class
```

For scratch work and interview practice, `java Main.java` is all you need. Real projects use a build tool: **Maven** (`pom.xml`, `mvn package`) or **Gradle** (`build.gradle.kts`, `./gradlew build`). Both download dependencies from Maven Central, expect sources in `src/main/java` and tests in `src/test/java` (usually JUnit 5), and produce a `.jar`. IDE support (IntelliJ IDEA, VS Code with the Java extension) is a large part of why Java is pleasant to write; let it generate imports and boilerplate.

## Program structure

Everything lives inside a class. There are no top-level functions or variables: a "utility function" is a `static` method on some class (`Math.max`, `Arrays.sort`, `Collections.reverse`). The entry point is a method with this exact signature:

```java
import java.util.*;

// file Main.java (a public class must live in a file with its name)
public class Main {
    public static void main(String[] args) {
        List<String> names = new ArrayList<>(List.of("ada", "linus"));
        names.add("grace");
        // prints [ada, linus, grace] 0
        System.out.println(names + " " + args.length);
    }
}
```

- **Files and packages.** One public top-level class per file, named after the file. A file starting `package com.example.shop;` must sit in the directory `com/example/shop/`. Package names are reversed domain names by convention.
- **Imports.** `java.lang` (`String`, `Math`, `Integer`, `System`) is imported automatically; everything else needs an import. `import java.util.*;` pulls in the collections; `import static java.lang.Math.max;` lets you call `max(a, b)` unqualified. Imports are only name shortcuts: nothing runs at import time.
- **Naming.** `camelCase` for methods and variables, `PascalCase` for classes, `UPPER_SNAKE` for constants. Braces are mandatory in spirit even when optional; semicolons are mandatory.
- **Newer shortcut.** Java 25 finalised compact source files: a file containing only `void main() { IO.println("hi"); }` runs with `java Hello.java`. In Java 21 that form is a preview feature (`--enable-preview`), so the examples here use the classic class.

## Types and values

Java is statically typed with two kinds of type: eight **primitives** stored as plain values, and **reference types** (every class, interface, array and `String`) where a variable holds a reference to a heap object or `null`. Uninitialised fields default to `0`, `false` or `null`; local variables have no default, and reading one before assigning it is a compile error.

### Primitives and boxed types

| Primitive | Size | Range / notes | Boxed type |
|---|---|---|---|
| `byte`, `short` | 8, 16 bits | rarely used | `Byte`, `Short` |
| `int` | 32 bits | ±2.1 × 10⁹ | `Integer` |
| `long` | 64 bits | ±9.2 × 10¹⁸; literal needs `L` past int range | `Long` |
| `float`, `double` | 32, 64 bits | IEEE 754; use `double` | `Float`, `Double` |
| `char` | 16 bits | one UTF-16 code unit, unsigned | `Character` |
| `boolean` | | `true`/`false`, not a number | `Boolean` |

Collections and generics can only hold objects, so each primitive has a **boxed type**. **Autoboxing** converts between them silently: putting an `int` into a `List<Integer>` boxes it (`Integer.valueOf`), and reading it into an `int` unboxes it (`intValue()`).

```java
int a = 42;
long big = 3_000_000_000L;
double d = 0.1 + 0.2;
boolean ok = a > 40;
char c = 'x';

List<Integer> xs = new ArrayList<>();
// boxing (int to Integer)
xs.add(a);
// unboxing (Integer to int)
int first = xs.get(0);
```

The convenience has two classic traps. `==` on two boxed values compares references, and `Integer.valueOf` only caches -128 to 127, so equality "works" for small numbers and breaks for larger ones. And unboxing `null` throws:

```java
Integer p = 127, q = 127, r = 1000, s = 1000;
System.out.println(p == q);       // true (cached)
System.out.println(r == s);       // false (two different objects)
System.out.println(r.equals(s));  // true
Map<String, Integer> count = new HashMap<>();
// deliberate error: get returns null, unboxing it throws NullPointerException
int n = count.get("missing");
```

Use `equals` (or unbox one side: `r.intValue() == s`) and prefer `getOrDefault` on maps. [Language gotchas](/learn/language-gotchas#integer-caching) has more on the cache. Boxing also costs memory and time: an `Integer` is a 16-byte object plus a reference, so an `int[]` is several times smaller and faster than a `List<Integer>`.

### Integer arithmetic

Arithmetic happens in the widest operand type, but no wider. `int / int` is integer division, and `int * int` overflows *before* being stored into a `long`. Overflow wraps silently (it's defined behaviour, unlike C++, but still a bug).

```java
System.out.println(7 / 2);                   // 3 (int / int truncates)
System.out.println(7 / 2.0);                 // 3.5
System.out.println(-7 / 2 + " " + -7 % 2);   // -3 -1 (rounds toward zero)
System.out.println(Math.floorMod(-7, 2));    // 1 (Python-style %)
int max = Integer.MAX_VALUE;
System.out.println(max + 1);                 // -2147483648 (wraps)
// multiplied as int, then widened, so already wrong
long wrong = max * 2;
// widen first
long right = (long) max * 2;
System.out.println(wrong + " " + right);     // -2 4294967294
// deliberate error: throws ArithmeticException instead of wrapping
System.out.println(Math.addExact(max, 1));
```

Rules of thumb: use `long` for sums, products and anything modulo `1_000_000_007` (underscores in literals are allowed); write `(long) a * b`, not `(long) (a * b)`; `Math.floorMod` fixes negative remainders; `BigInteger` exists when 64 bits isn't enough.

### char is a number

A `char` is an unsigned 16-bit integer, and arithmetic on it produces an `int`. This makes letter counting easy and string building surprising:

```java
char c = 'a';
System.out.println(c + 1);            // 98 (char promoted to int)
System.out.println((char) (c + 1));   // b
// letter index 0-25
int idx = 'e' - 'a';
int[] freq = new int[26];
for (char ch : "hello".toCharArray()) freq[ch - 'a']++;
System.out.println(idx + " " + freq['l' - 'a']);              // 4 2
System.out.println(Character.isDigit('7') + " " + ('7' - '0'));  // true 7
System.out.println('a' + 'b');        // 195 (char + char is int)
System.out.println("" + 'a' + 'b');   // ab (string first, so concatenation)
```

`Character` has the helpers: `isDigit`, `isLetter`, `isLetterOrDigit`, `isWhitespace`, `toLowerCase`, `toUpperCase`. Because a `char` is a UTF-16 unit, an emoji is two `char`s; for interview problems over `a`–`z` that never matters.

### Strings

`String` is an immutable object. Every "modifying" method returns a new string, `+` creates a new string, and `==` compares references, so always compare contents with `equals`:

```java
String s = "hello";
// returns a new string; s is unchanged
String upper = s.toUpperCase();
System.out.println(s + " " + upper);                       // hello HELLO
System.out.println(s.length() + " " + s.charAt(1) + " " + s.substring(1, 3));  // 5 e el
String built = new String("hello");
System.out.println(s == built);                            // false (different objects)
System.out.println(s.equals(built));                       // true
System.out.println(s.compareTo("help") < 0);               // true (lexicographic)

// += in a loop copies the whole string each time (O(n^2)), so build with StringBuilder
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 5; i++) sb.append(i).append(',');
// drop trailing comma
sb.setLength(sb.length() - 1);
System.out.println(sb.reverse());                          // 4,3,2,1,0
```

Note the three spellings of "length": `arr.length` for arrays (a field), `s.length()` for strings, `list.size()` for collections. The methods you'll reach for most:

| Task | Java |
|---|---|
| Split / join | `s.split("\\s+")` (takes a regex), `String.join(",", list)` |
| Trim, repeat, blank check | `s.strip()`, `s.repeat(3)`, `s.isBlank()` (Java 11) |
| Search | `s.indexOf("ab")`, `s.contains("ab")`, `s.startsWith("ab")` |
| To and from chars | `s.toCharArray()`, `new String(chars)`, `String.valueOf(chars)` |
| Numbers | `Integer.parseInt("42")`, `Long.parseLong`, `String.valueOf(42)`, `Integer.toBinaryString(5)` |
| Formatting | `String.format("%d items, %.2f each", n, price)` or `"%d".formatted(n)` |

`substring` copies, so it's O(length of the result). Multi-line strings use **text blocks** (Java 15); the common indentation is stripped:

```java
String json = """
    {"name": "ada", "langs": ["java", "python"]}
    """;
System.out.print(json);   // {"name": "ada", "langs": ["java", "python"]} plus newline
```

## var, final and generics

`var` (Java 10) infers a local variable's type from its initialiser. It's still static typing: the type is fixed at compile time. Use it when the right-hand side already names the type; avoid it when it hides something the reader needs.

```java
// HashMap<String, List<Integer>>, inferred
var graph = new HashMap<String, List<Integer>>();
for (var entry : graph.entrySet()) System.out.println(entry.getKey());
final int limit = 10;
// limit = 11;   compile error: final variables are assigned once
final List<Integer> list = new ArrayList<>();
// fine: final freezes the variable, not the object it points to
list.add(1);
```

`final` is Java's `const`, but shallow. Fields, parameters and locals can all be `final`; a `final` class can't be subclassed and a `final` method can't be overridden. Lambdas and inner classes can only capture locals that are **effectively final** (never reassigned).

### Generics and type erasure

Generic types take type arguments in angle brackets, and the **diamond** `<>` infers them on the right-hand side: `Map<String, List<Integer>> m = new HashMap<>();`. Type arguments must be reference types, so there is no `List<int>`; write `List<Integer>` and accept the boxing.

Generics are implemented by **type erasure**: the compiler checks the types, then erases them to `Object` (or the bound) in the bytecode. At runtime a `List<String>` and a `List<Integer>` are the same class.

```java
import java.util.*;

public class Generics {
    // generic method; T inferred at each call
    static <T extends Comparable<T>> T maxOf(List<T> items) {
        T best = items.get(0);
        for (T item : items) if (item.compareTo(best) > 0) best = item;
        return best;
    }

    public static void main(String[] args) {
        System.out.println(maxOf(List.of(3, 9, 4)));          // 9
        System.out.println(maxOf(List.of("pear", "apple")));  // pear
        List<String> a = new ArrayList<>();
        List<Integer> b = new ArrayList<>();
        // erased, so same runtime class
        System.out.println(a.getClass() == b.getClass());     // true
    }
}
```

What erasure rules out:

- `new T()` and `new T[n]` don't compile (the runtime doesn't know `T`).
- `x instanceof List<String>` doesn't compile; `x instanceof List<?>` does.
- You can't overload `f(List<String>)` and `f(List<Integer>)`: they erase to the same signature.
- Arrays of generics are awkward. `List<Integer>[] adj = new List[n];` compiles with an "unchecked" warning and is common in graph code; `List<List<Integer>>` avoids the warning.

Wildcards appear in library signatures: `List<? extends Number>` is a list you can read `Number`s from, `List<? super Integer>` one you can add `Integer`s to ("producer extends, consumer super"). You rarely need to write them in application code.

## Control flow, switch and records

`if`, `while`, `do`/`while`, C-style `for`, `break`, `continue` and the ternary `?:` behave as in C and JavaScript, except that conditions must be `boolean` (`if (count)` doesn't compile; write `if (count != 0)`). The enhanced `for` iterates arrays and anything `Iterable`, and labels let `break` leave nested loops:

```java
int[] nums = {3, 1, 4};
for (int x : nums) System.out.print(x + " ");
System.out.println();
outer:
for (int i = 0; i < 3; i++)
    for (int j = 0; j < 3; j++)
        // leaves both loops
        if (i * j == 2) { System.out.println(i + "," + j); break outer; }
```

### Switch expressions

The old `switch` statement falls through between `case` labels unless you `break`. Arrow-form **switch expressions** (Java 14) don't fall through, can match several labels per case, return a value, and must be exhaustive:

```java
String day = "SAT";
int hours = switch (day) {
    case "SAT", "SUN" -> 0;
    case "FRI" -> 6;
    default -> {
        int base = 8;
        // yield returns a value from a block
        yield base;
    }
};
System.out.println(hours);   // 0
```

Switch works on integers, `char`, strings and enums, and since Java 21 on any type through patterns.

### Pattern matching

`instanceof` can bind a variable (Java 16), so the cast disappears. Java 21 adds **pattern matching for switch** and **record patterns**, which take a value apart by type and by components. Combined with a `sealed` interface (Java 17), which lists its only implementations, the compiler checks that every case is handled:

```java
public class Shapes {
    sealed interface Shape permits Circle, Square, Rect {}
    record Circle(double r) implements Shape {}
    record Square(double side) implements Shape {}
    record Rect(double w, double h) implements Shape {}

    static double area(Shape s) {
        // exhaustive over sealed type, so no default needed
        return switch (s) {
            case Circle c -> Math.PI * c.r() * c.r();
            case Square(double side) -> side * side;
            // guard with when
            case Rect(double w, double h) when w == h -> w * w;
            case Rect(double w, double h) -> w * h;
        };
    }

    public static void main(String[] args) {
        Object o = 42;
        // binds i only when o is an Integer
        if (o instanceof Integer i && i > 10) System.out.println(i + 1);   // 43
        System.out.println(area(new Rect(2, 3)) + " " + area(new Square(2)));   // 6.0 4.0
    }
}
```

### Records

A **record** (Java 16) is a final, immutable data class. You declare the components; the compiler generates the constructor, accessors (`p.x()`, not `getX()`), `equals`, `hashCode` and `toString`. A compact constructor can validate, and you can add methods:

```java
record Point(int x, int y) {
    // compact constructor; fields are assigned after it runs
    Point {
        if (x < 0) throw new IllegalArgumentException("x < 0");
    }
    int manhattan() { return Math.abs(x) + Math.abs(y); }
}
Point p = new Point(1, 2);
System.out.println(p + " " + p.x() + " " + p.manhattan());   // Point[x=1, y=2] 1 3
Set<Point> seen = new HashSet<>();
seen.add(p);
// equals and hashCode compare components, so a fresh copy is found
System.out.println(seen.contains(new Point(1, 2)));          // true
```

Records are the right answer whenever you'd reach for a tuple, a struct or a Python dataclass: map keys such as grid cells, return values with two fields, heap entries. They can implement interfaces but can't extend classes, and immutability is shallow (a record holding a `List` doesn't freeze the list). Records, like other classes, can be declared inside a method.

## Collections cheat sheet

The **collections framework** (`java.util`) separates interfaces (`List`, `Deque`, `Map`, `Set`, `Queue`) from implementations. Declare variables by interface (`List<Integer> xs = new ArrayList<>()`) and pick the implementation by the operations you need:

| Need | Class | Main operations and cost |
|---|---|---|
| Dynamic array | `ArrayList` | `get`/`set` O(1), `add` at end amortised O(1), insert/remove at index O(n) |
| Stack | `ArrayDeque` | `push`/`pop`/`peek` O(1) |
| Queue or deque | `ArrayDeque` | `offer`/`poll`/`peek` O(1), plus `offerFirst`, `pollLast`, `peekLast` |
| Hash map / set | `HashMap`, `HashSet` | `get`/`put`/`containsKey`/`add`/`contains` O(1) average; no order |
| Insertion order | `LinkedHashMap`, `LinkedHashSet` | as above, iterates in insertion order |
| Sorted map / set | `TreeMap`, `TreeSet` | `get`/`put`/`floor`/`ceiling`/`first` O(log n); red-black tree |
| Priority queue | `PriorityQueue` | `offer`/`poll` O(log n), `peek` O(1), `remove(obj)` O(n); min-heap |
| Linked list | `LinkedList` | O(1) at the ends, O(n) `get(i)`; rarely the right choice |

Avoid the legacy classes `Stack`, `Vector` and `Hashtable`: they're synchronised on every call and `Stack` iterates in the "wrong" order. `LinkedList` loses to `ArrayDeque` at both ends and to `ArrayList` everywhere else. For the theory behind each structure see [Hash maps](/learn/hashing), [Stacks & queues](/learn/stacks-queues) and [Heaps](/learn/heaps).

### Lists, stacks and queues

```java
List<Integer> list = new ArrayList<>(List.of(5, 6, 7));
// remove(int) removes by index; remove(Object) by value
list.remove(1);
list.remove(Integer.valueOf(7));
System.out.println(list);                                 // [5]

Deque<Integer> stack = new ArrayDeque<>();
stack.push(1);
stack.push(2);
System.out.println(stack.pop() + " " + stack.peek());     // 2 1

Deque<Integer> queue = new ArrayDeque<>();
queue.offer(1);
queue.offer(2);
System.out.println(queue.poll() + " " + queue.peek());    // 1 2
System.out.println(queue.poll() + " " + queue.poll());    // 2 null
```

Watch the `remove` overload on a `List<Integer>`: `list.remove(1)` removes index 1, not the value 1. `Queue` and `Deque` methods come in pairs: `peek`/`poll`/`offer` return `null` (or `false`) when empty or full, while `element`/`remove`/`add` throw. `ArrayDeque` rejects `null` elements.

### Sorted maps and sets

`TreeMap` and `TreeSet` keep keys sorted and answer "nearest key" questions in O(log n). They fill the role of C++'s `map`/`set` with `lower_bound`, and of Python's `sortedcontainers` (which isn't in the standard library):

```java
TreeMap<Integer, String> events = new TreeMap<>(Map.of(10, "a", 20, "b", 30, "c"));
System.out.println(events.floorKey(25));      // 20 (largest key <= 25)
System.out.println(events.ceilingKey(25));    // 30 (smallest key >= 25)
System.out.println(events.higherKey(30));     // null (no key > 30)
System.out.println(events.firstKey() + " " + events.lastEntry().getValue());   // 10 c
System.out.println(events.headMap(20));       // {10=a} (keys < 20)
TreeSet<Integer> set = new TreeSet<>(List.of(4, 1, 9));
System.out.println(set.floor(5) + " " + set.pollFirst() + " " + set);          // 4 1 [4, 9]
```

The family: `floor` (≤), `ceiling` (≥), `lower` (<), `higher` (>), each as `...Key` or `...Entry` on maps; `first`/`last`, `pollFirst`/`pollLast`; and range views `headMap`, `tailMap`, `subMap`. They return `null` when nothing qualifies, so assign to `Integer`, not `int`. A `TreeMap<Integer, Integer>` of value counts is the standard multiset.

### PriorityQueue

`PriorityQueue` is a binary **min-heap** by default (C++'s `priority_queue` is a max-heap). Pass a comparator for anything else:

```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>(List.of(5, 1, 8));
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
maxHeap.addAll(List.of(5, 1, 8));
System.out.println(minHeap.poll() + " " + maxHeap.poll());   // 1 8
// [node, distance] pairs, smallest distance first
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
pq.offer(new int[]{7, 30});
pq.offer(new int[]{3, 10});
System.out.println(pq.peek()[0]);                            // 3
```

Iterating or printing a `PriorityQueue` shows heap order, not sorted order; only repeated `poll` gives sorted output. There's no decrease-key: for Dijkstra, push a new entry and skip stale ones when popped.

### Arrays and Collections utilities

Plain arrays (`int[]`, `char[]`, `int[][]`) are fixed-size, zero-initialised and fast. They have no methods worth mentioning, so the helpers live in `java.util.Arrays`; `java.util.Collections` does the same for collections:

```java
int[] a = {5, 2, 9};
Arrays.sort(a);
int[] filled = new int[4];
Arrays.fill(filled, -1);
// 3 rows of 4 zeros
int[][] grid = new int[3][4];
System.out.println(Arrays.toString(a) + " " + Arrays.toString(filled));   // [2, 5, 9] [-1, -1, -1, -1]
System.out.println(Arrays.deepToString(grid));
// index of 5 (negative if missing)
System.out.println(Arrays.binarySearch(a, 5));                            // 1
int[] prefix = Arrays.copyOfRange(a, 0, 2);
System.out.println(Arrays.equals(prefix, new int[]{2, 5}));              // true
List<Integer> list = new ArrayList<>(List.of(3, 1, 2));
Collections.sort(list);
Collections.reverse(list);
System.out.println(list + " " + Collections.max(list));                   // [3, 2, 1] 3
Integer[] boxed = {3, 1, 2};
// comparators work on object arrays only, not int[]
Arrays.sort(boxed, Collections.reverseOrder());
```

Printing an array directly gives something like `[I@1b6d3586`, and `a.equals(b)` on arrays compares references; use `Arrays.toString` and `Arrays.equals`. Arrays also hash by identity, so an `int[]` is useless as a `HashMap` key: use a `String`, a `List<Integer>` or a record instead. `Arrays.sort` on primitives uses dual-pivot quicksort; on objects it uses TimSort, which is stable (see [Sorting](/learn/sorting)).

### Immutable and fixed-size lists

There are three ways to get a list from literal values, and they behave differently:

```java
// immutable, rejects nulls (Java 9)
List<Integer> frozen = List.of(1, 2, 3);
// fixed size, writes through to backing array
List<Integer> view = Arrays.asList(1, 2, 3);
// independent mutable copy
List<Integer> mine = new ArrayList<>(frozen);
view.set(0, 9);
mine.add(4);
System.out.println(view + " " + mine);   // [9, 2, 3] [1, 2, 3, 4]
// deliberate error: throws UnsupportedOperationException
frozen.add(4);
```

`Map.of`, `Set.of` and `stream.toList()` are immutable too, and `list.subList(i, j)` is a live view. Wrap in `new ArrayList<>(...)` whenever you need to modify.

## Iteration and map idioms

Iterate a map through `entrySet()` (key and value together) rather than looking up every key again. Counting and grouping each have a one-line idiom: `merge` for counts and `computeIfAbsent` for "get the list, creating it if missing":

```java
String text = "the cat and the hat";
Map<String, Integer> count = new HashMap<>();
// same as count.put(w, count.getOrDefault(w, 0) + 1)
for (String w : text.split(" ")) count.merge(w, 1, Integer::sum);
System.out.println(count.get("the") + " " + count.getOrDefault("dog", 0));   // 2 0

Map<Character, List<String>> byFirst = new TreeMap<>();
for (String w : text.split(" ")) byFirst.computeIfAbsent(w.charAt(0), k -> new ArrayList<>()).add(w);
System.out.println(byFirst);   // {a=[and], c=[cat], h=[hat], t=[the, the]}

for (Map.Entry<String, Integer> e : count.entrySet())
    if (e.getValue() > 1) System.out.println(e.getKey());   // the

count.putIfAbsent("dog", 0);
// removing while looping throws, so use removeIf on the view
count.entrySet().removeIf(e -> e.getValue() == 0);
count.forEach((word, n) -> System.out.print(word + "=" + n + " "));
```

- `map.get(k)` returns `null` for a missing key; it never throws. `containsKey` distinguishes "missing" from "mapped to null".
- `HashMap` iteration order is unspecified and can change between runs of a modified program; use `LinkedHashMap` for insertion order or `TreeMap` for sorted order. `LinkedHashMap` with `accessOrder = true` plus `removeEldestEntry` is a ready-made LRU cache.
- Changing a collection while a for-each loop walks it throws `ConcurrentModificationException`; use `removeIf` or the iterator's own `remove()` ([details](/learn/language-gotchas#concurrentmodificationexception)).
- Since Java 21, lists, deques and sorted sets share `getFirst()`, `getLast()` and `reversed()` (sequenced collections).

## Lambdas and streams

### Functional interfaces and method references

Java has no function type. A lambda is an instance of a **functional interface**: any interface with exactly one abstract method. `java.util.function` supplies the common shapes:

| Interface | Method | Shape |
|---|---|---|
| `Function<T, R>` | `apply` | T to R |
| `BiFunction<T, U, R>` | `apply` | (T, U) to R |
| `Predicate<T>` | `test` | T to boolean |
| `Supplier<T>` / `Consumer<T>` | `get` / `accept` | () to T / T to nothing |
| `UnaryOperator<T>`, `BinaryOperator<T>` | `apply` | T to T, (T, T) to T |
| `IntBinaryOperator`, `ToIntFunction<T>`, ... | `applyAsInt` | primitive versions that skip boxing |
| `Comparator<T>`, `Runnable` | `compare`, `run` | (T, T) to int, () to nothing |

A **method reference** is shorthand for a lambda that only calls one method: `String::length` (`s -> s.length()`), `Integer::compare`, `System.out::println`, `ArrayList::new`. `Comparator` has builder methods that read better than hand-written comparisons:

```java
Function<String, Integer> len = String::length;
BiFunction<Integer, Integer, Integer> add = (x, y) -> x + y;
Predicate<String> empty = String::isEmpty;
Supplier<List<Integer>> fresh = ArrayList::new;
System.out.println(len.apply("java") + " " + add.apply(2, 3) + " " + empty.test("") + " " + fresh.get());   // 4 5 true []

List<String> words = new ArrayList<>(List.of("kiwi", "fig", "banana", "date"));
// by length, ties in reverse alphabetical order
words.sort(Comparator.comparingInt(String::length).thenComparing(Comparator.reverseOrder()));
System.out.println(words);   // [fig, kiwi, date, banana]

int base = 10;
// base is captured, so it must never be reassigned
Function<Integer, Integer> plusBase = x -> x + base;
System.out.println(plusBase.apply(5));   // 15
```

Lambdas capture only **effectively final** locals. To mutate state from a lambda, use a field, a one-element array (`int[] total = {0}`) or, better, a loop. Lambdas also can't throw checked exceptions through the standard interfaces (see below).

### Streams

A **stream** is a lazy pipeline over a collection, array or range: a source, intermediate steps (`filter`, `map`, `sorted`, `distinct`, `limit`), and one terminal step (`toList`, `collect`, `sum`, `count`, `anyMatch`, `forEach`) that runs it. `IntStream`, `LongStream` and `DoubleStream` are the unboxed versions with `sum`, `max` and `average`.

```java
List<String> words = List.of("apple", "avocado", "banana", "cherry", "blueberry");
Map<Character, Long> byLetter = words.stream()
        .collect(Collectors.groupingBy(w -> w.charAt(0), TreeMap::new, Collectors.counting()));
System.out.println(byLetter);   // {a=2, b=2, c=1}

List<String> longOnes = words.stream()
        .filter(w -> w.length() > 5)
        .map(String::toUpperCase)
        .sorted()
        .toList();
System.out.println(longOnes);   // [AVOCADO, BANANA, BLUEBERRY, CHERRY]

int[] nums = {4, 8, 15, 16};
int sum = Arrays.stream(nums).sum();
double avg = IntStream.of(nums).average().orElse(0);
String joined = IntStream.rangeClosed(1, 3).mapToObj(String::valueOf).collect(Collectors.joining("-"));
System.out.println(sum + " " + avg + " " + joined);   // 43 10.75 1-2-3
```

Streams shine for transform-filter-collect over a whole collection, grouping, and joining strings. A plain loop is clearer and usually faster when you need indexes, early exit with state, several outputs at once, or checked exceptions. A stream can be consumed only once, and `.toList()` (Java 16) returns an unmodifiable list, while `Collectors.toList()` returns one you can modify in practice. `Optional` (what `max()` and `findFirst()` return) is for return values: unwrap it with `orElse`, `orElseThrow` or `ifPresent`, never `get()` without a check.

## Classes and interfaces

Classes look like C++ or TypeScript classes, with a few Java rules: single inheritance of classes (`extends`), any number of interfaces (`implements`), every non-static method virtual unless `final`, no operator overloading, no default arguments (write overloads) and no destructors.

```java
public class Account {
    // one copy shared by all instances
    private static int created = 0;
    // assigned once, in constructor
    private final String owner;
    private long balanceCents;

    // delegate to other constructor
    public Account(String owner) { this(owner, 0); }

    public Account(String owner, long balanceCents) {
        this.owner = owner;
        this.balanceCents = balanceCents;
        created++;
    }

    public void deposit(long cents) {
        if (cents <= 0) throw new IllegalArgumentException("cents must be positive");
        balanceCents += cents;
    }

    public long balance() { return balanceCents; }
    public static int created() { return created; }

    @Override
    public String toString() { return owner + ": " + balanceCents; }
}
```

Access modifiers apply to classes, fields, methods and constructors:

| Modifier | Visible to |
|---|---|
| `private` | the same top-level class only |
| *(none)*, "package-private" | the same package |
| `protected` | the same package, plus subclasses |
| `public` | everyone |

Interfaces can carry `default` methods with a body (Java 8), `static` helpers and `private` methods. An **abstract class** can also hold state and constructors. Prefer interfaces for "can do" types and composition over deep hierarchies ([OOP design](/learn/oop-design) covers the trade-offs):

```java
interface Shape {
    double area();
    default String describe() { return getClass().getSimpleName() + " with area " + area(); }
    static Shape unitSquare() { return new Square(1); }
}

abstract class Polygon implements Shape {
    protected final int sides;
    protected Polygon(int sides) { this.sides = sides; }
}

class Square extends Polygon {
    private final double side;
    // super(...) must come first
    Square(double side) { super(4); this.side = side; }
    @Override public double area() { return side * side; }
}
```

`Shape.unitSquare().describe()` returns `"Square with area 1.0"`. A few more rules that surprise newcomers:

- **Everything is passed by value, and for objects the value is a reference.** A method can mutate the caller's list, but assigning a new list to its parameter doesn't affect the caller. There are no `out` or `&` parameters; return a record or an array instead.
- **`equals` and `hashCode` go together.** If you override `equals`, override `hashCode` so equal objects hash equally, or hash-based collections lose your objects ([why](/learn/language-gotchas#equals-and-hashcode)). Records and IDE generators get this right. Implement `Comparable<T>` (`compareTo`) for a natural sort order.
- **Nested classes.** A `static` nested class is an ordinary class namespaced inside another. A non-static **inner class** holds a hidden reference to its outer instance; use `static` unless you need that.
- **Enums are classes**: `enum Dir { N, E, S, W }` can have fields, constructors and methods, works in `switch`, and has `values()` and `ordinal()`.
- **`@Override`** is optional but makes the compiler check that you really override something. Use it always.

## Exceptions

### Checked vs unchecked

Java splits exceptions in two. **Checked exceptions** (subclasses of `Exception` but not `RuntimeException`, such as `IOException` and `InterruptedException`) must be caught or declared with `throws` in the method signature, or the code doesn't compile. **Unchecked exceptions** (`RuntimeException` and its subclasses: `NullPointerException`, `IllegalArgumentException`, `ArrayIndexOutOfBoundsException`, `ArithmeticException`) need no declaration. `Error`s (`OutOfMemoryError`, `StackOverflowError`) are for the JVM; don't catch them.

The convention: throw unchecked exceptions for programming errors and bad arguments, checked ones for conditions a caller can reasonably handle (a missing file). Many modern APIs avoid checked exceptions entirely, partly because they don't pass through lambdas: a `Function` can't throw `IOException`, so stream code wraps them in `UncheckedIOException`.

### try-with-resources

Anything `AutoCloseable` (files, sockets, database connections) declared in a `try (...)` header is closed automatically when the block ends, in reverse order, even when an exception is thrown. It's Java's answer to Python's `with` and C++'s RAII:

```java
import java.io.*;
import java.nio.file.*;
import java.util.*;

public class Errors {
    static int parseOrDefault(String s, int fallback) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            // unchecked, so catching is optional
            return fallback;
        }
    }

    // IOException is checked, so it must be declared or caught
    static List<String> readLines(Path path) throws IOException {
        // reader closed when block exits, even on exception
        try (BufferedReader in = Files.newBufferedReader(path)) {
            List<String> lines = new ArrayList<>();
            for (String line; (line = in.readLine()) != null; ) lines.add(line);
            return lines;
        }
    }

    public static void main(String[] args) {
        System.out.println(parseOrDefault("12", 0) + parseOrDefault("x", 0));   // 12
        try {
            Path tmp = Files.createTempFile("demo", ".txt");
            Files.writeString(tmp, "one\ntwo\n");
            System.out.println(readLines(tmp));   // [one, two]
        } catch (IOException | UncheckedIOException e) {
            // multi-catch
            System.err.println("failed: " + e.getMessage());
        } finally {
            System.out.println("finally always runs");
        }
    }
}
```

Throw with `throw new IllegalStateException("message")`; define your own by extending `RuntimeException` (or `Exception` for a checked one). Exceptions carry a stack trace and are relatively expensive to create, so don't use them for ordinary control flow. Catch the narrowest type you can handle, and never swallow an exception with an empty `catch`.

## LeetCode in Java

LeetCode hands you a `class Solution` with one public method to fill in. Write helpers as `private` methods on it, keep shared state in fields, and import nothing: `java.util.*` and friends are already available there. A typical solution, showing a comparator on `int[][]` and conversion back to an array:

```java
class Solution {
    public int[][] merge(int[][] intervals) {
        // Sort by start; each interval either extends last merged one or starts new one
        // compare, not subtract (a[0] - b[0] overflows for large opposite-sign values)
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> merged = new ArrayList<>();
        for (int[] cur : intervals) {
            int[] last = merged.isEmpty() ? null : merged.get(merged.size() - 1);
            // starts inside last kept interval, so stretch its end
            if (last != null && cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
            else merged.add(cur);
        }
        return merged.toArray(new int[0][]);
    }
}
```

The comparator `(a, b) -> a[0] - b[0]` appears in many solutions and is wrong: with values near ±2³¹ the subtraction overflows and the sort order flips. `Integer.compare(a[0], b[0])` or `Comparator.comparingInt(a -> a[0])` is always safe.

Converting between arrays and lists is the other constant chore, because signatures mix `int[]` and `List<Integer>`:

```java
int[] arr = {3, 1, 2};
// mutable List<Integer>
List<Integer> list = Arrays.stream(arr).boxed().collect(Collectors.toList());
int[] back = list.stream().mapToInt(Integer::intValue).toArray();
List<int[]> pairs = new ArrayList<>(List.of(new int[]{1, 2}, new int[]{3, 4}));
int[][] matrix = pairs.toArray(new int[0][]);
List<List<Integer>> result = new ArrayList<>();
// copy current path, ensuring later backtracking edits don't change stored answer
result.add(new ArrayList<>(list));
char[] cs = "dcba".toCharArray();
Arrays.sort(cs);
// sorted letters as anagram key
String key = new String(cs);
System.out.println(Arrays.toString(back) + " " + matrix.length + " " + result + " " + key);   // [3, 1, 2] 2 [[3, 1, 2]] abcd
```

Grid problems combine several of these: `char[][]` input, a direction array, and an `ArrayDeque<int[]>` as the BFS queue:

```java
class Solution {
    public int numIslands(char[][] grid) {
        // Each unvisited land cell starts BFS that sinks its whole island
        int rows = grid.length, cols = grid[0].length, islands = 0;
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        Deque<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++)
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++;
                // sink on push, ensuring no cell is queued twice
                grid[r][c] = '0';
                queue.offer(new int[]{r, c});
                while (!queue.isEmpty()) {
                    int[] cell = queue.poll();
                    for (int[] d : dirs) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] != '1') continue;
                        grid[nr][nc] = '0';
                        queue.offer(new int[]{nr, nc});
                    }
                }
            }
        return islands;
    }
}
```

More habits that save time:

- **Counting letters**: `int[26]` indexed by `ch - 'a'` beats a `HashMap<Character, Integer>`, and `Arrays.equals(countA, countB)` compares two of them.
- **Sentinels**: `Arrays.fill(dist, Integer.MAX_VALUE)` for distances, `Arrays.fill(memo, -1)` for "not computed". For a 2-D memo, fill each row: `for (int[] row : memo) Arrays.fill(row, -1);`. Adding to `Integer.MAX_VALUE` overflows, so check before adding or use `Integer.MAX_VALUE / 2`.
- **Stacks and queues**: `Deque<Integer> stack = new ArrayDeque<>()`, never `Stack`.
- **Composite keys**: encode a cell as `r * cols + c` (an `int`) or `(long) r << 32 | c`, or use a record. `List.of(r, c)` works as a key but is slower.
- **Recursion depth**: the default thread stack (typically 512 KB to 1 MB) allows on the order of 10,000 frames, so very deep DFS can throw `StackOverflowError`; convert to an explicit stack.
- **Fast I/O** (for judges that read stdin): `BufferedReader` plus `split` or `StringTokenizer` for input, a `StringBuilder` or `PrintWriter` for output. `Scanner` and per-line `System.out.println` are slow on large inputs.

## Memory and the JVM

The JVM manages memory for you. Primitives and references in local variables live on the thread's stack; every object (including arrays, strings and boxed numbers) lives on the heap, and a tracing **garbage collector** frees objects once nothing reachable points to them. There's no `free`, `delete` or destructor, and cycles are collected fine. The default collector, G1, balances throughput and pause times; ZGC (`-XX:+UseZGC`) keeps pauses around a millisecond for large heaps. [OS & memory](/learn/os-memory#garbage-collection) explains how tracing collection works.

What that means in practice:

- **Objects have overhead.** Every object has a header of about 12–16 bytes. A `List<Integer>` of a million elements uses roughly five times the memory of an `int[]`, and a `HashMap` entry costs tens of bytes. Use primitive arrays for big numeric data.
- **Leaks still happen** through reachable objects: a static map that only grows, listeners never removed. GC frees unreachable objects, not forgotten ones.
- **Resources aren't memory.** Files and connections need `close()` (use try-with-resources); there's no deterministic destructor, and `finalize` is deprecated for removal.
- **Heap size is capped.** The JVM picks a maximum heap (by default a quarter of physical memory); exceeding it throws `OutOfMemoryError`. Set it with `-Xmx2g`, and the thread stack size with `-Xss`.
- **The JIT needs warm-up.** Code starts in an interpreter and is compiled to optimised machine code once it's hot ([JIT compilation and warm-up](/learn/os-memory#jit-compilation-and-warm-up)). The first runs of anything are slow, so naive timing with `System.nanoTime()` around one call measures the wrong thing; use JMH for benchmarks. Startup takes a noticeable fraction of a second, which is why Java suits long-running services better than tiny scripts.
- **Threads are real OS threads**, and Java 21 adds **virtual threads** (`Thread.ofVirtual().start(...)`, `Executors.newVirtualThreadPerTaskExecutor()`) that make blocking-style code cheap at high concurrency. `java.util.concurrent` has thread-safe collections, atomics and executors; [Concurrency](/learn/concurrency) covers the ideas.

## Coming from another language

### From Python

| Python | Java |
|---|---|
| `len(x)` | `arr.length`, `s.length()`, `list.size()` |
| `a // b`, `a % b` floor | `/` and `%` truncate toward zero; `Math.floorDiv`, `Math.floorMod` |
| Integers never overflow | `int` and `long` wrap silently; use `long`, `Math.addExact` or `BigInteger` |
| `a == b` on strings | `a.equals(b)`; `==` compares references |
| `x[-1]`, slicing | `x[x.length - 1]`; `Arrays.copyOfRange`, `substring`, `subList` (a view) |
| `d[k]` raises `KeyError` | `map.get(k)` returns `null`; unboxing it into `int` throws |
| `if items:` truthiness | `if (!items.isEmpty())`; only `boolean` is allowed in conditions |
| Tuples as dict keys | Records, an encoded `int`/`long`, or `List.of(a, b)` |
| `sorted(xs, key=f)` | `xs.sort(Comparator.comparing(f))`; `Arrays.sort(arr)` |
| `heapq` | `PriorityQueue` (also a min-heap) |
| `with open(...)` | try-with-resources |

### From C++

| C++ | Java |
|---|---|
| Value semantics, copies on assignment | Objects are always references; assignment copies the reference |
| `new`/`delete`, smart pointers, RAII | Garbage collector; try-with-resources for non-memory resources |
| Signed overflow is undefined | Overflow wraps, and the result is defined (but still wrong) |
| `vector<int>` | `int[]` (fixed) or `ArrayList<Integer>` (boxed) |
| `map`/`set` with `lower_bound` | `TreeMap`/`TreeSet` with `ceilingKey`/`ceiling` |
| `unordered_map` | `HashMap` |
| `priority_queue` is a max-heap | `PriorityQueue` is a min-heap |
| Templates, instantiated per type | Generics, erased; no primitives as type arguments |
| `const` | `final` (shallow) |
| Operator overloading, `a < b` on objects | `a.compareTo(b) < 0`, `a.equals(b)` |
| `std::string` is mutable | `String` is immutable; use `StringBuilder` |

### From JavaScript or TypeScript

| JavaScript | Java |
|---|---|
| One `number` type (double) | `int`, `long`, `double` are distinct; `7 / 2` is `3` |
| `===` | `==` for primitives, `equals` for objects |
| `[10, 9, 1].sort()` sorts as strings | `Arrays.sort` and `List.sort` sort numbers numerically |
| Objects as maps, `undefined` | `HashMap`; missing values are `null`, and using `null` throws `NullPointerException` |
| Closures capture any variable | Lambdas capture only effectively final locals |
| Structural types (TypeScript) | Nominal types: a class must declare `implements` |
| One thread, `async`/`await` | Real threads, `CompletableFuture`, virtual threads (Java 21) |
| Optional chaining `a?.b` | No equivalent; `Optional` or explicit `null` checks |
