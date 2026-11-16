---
title: OS, memory & performance
summary: Processes and virtual memory, the stack and the heap, system calls, file descriptors, leaks, garbage collection, RAII, CPU caches, latency numbers and how to profile before optimising.
related: concurrency, language-gotchas, big-o, arrays-strings, linked-lists
terms:
  - virtual memory #processes-and-virtual-memory
  - page fault #processes-and-virtual-memory
  - copy-on-write #processes-and-virtual-memory
  - stack overflow #the-stack-and-the-heap
  - system call #system-calls-and-context-switches
  - context switch #system-calls-and-context-switches
  - file descriptor #file-descriptors
  - memory leak #memory-leaks
  - garbage collection #garbage-collection
  - reference counting #garbage-collection
  - RAII #raii-and-smart-pointers
  - smart pointers #raii-and-smart-pointers
  - cache line #cpu-caches-and-locality
  - cache locality #cpu-caches-and-locality
  - profiling #profiling-before-optimising
  - zombie process #zombie-and-orphan-processes
  - zombie processes #zombie-and-orphan-processes
  - orphan process #zombie-and-orphan-processes
  - waitpid #zombie-and-orphan-processes
  - JIT #jit-compilation-and-warm-up
  - JIT compiler #jit-compilation-and-warm-up
  - just-in-time compilation #jit-compilation-and-warm-up
  - tiered compilation #jit-compilation-and-warm-up
  - deoptimization #jit-compilation-and-warm-up
  - deoptimisation #jit-compilation-and-warm-up
  - VSZ #virtual-size-vs-resident-memory
  - RSS #virtual-size-vs-resident-memory
  - resident set size #virtual-size-vs-resident-memory
  - thread stack size #thread-stack-sizes
  - time slice #time-slices-and-round-robin-scheduling
  - time quantum #time-slices-and-round-robin-scheduling
  - round-robin scheduling #time-slices-and-round-robin-scheduling
  - page cache #the-page-cache
  - fsync #the-page-cache
  - SIGTERM #signals-and-graceful-shutdown
  - SIGKILL #signals-and-graceful-shutdown
  - graceful shutdown #signals-and-graceful-shutdown
---

## Processes and virtual memory

A **process** is a running program: its code, memory, open files and one or more threads, all tracked by the kernel. What keeps processes apart is **virtual memory**: each one sees its own private address space and can't even name another process's memory.

The CPU's memory management unit (MMU) translates each virtual address to a physical one. Memory is managed in fixed-size **pages** (usually 4 KiB). Each process has a **page table** mapping its virtual pages to physical **frames**, and the CPU caches recent translations in the **TLB** (translation lookaside buffer).

```diagram
{"type":"flow","nodes":[{"id":"a0","label":"A: page 0","sub":"heap","kind":"box","col":0,"row":0},{"id":"a1","label":"A: page 1","sub":"libc code","kind":"box","col":0,"row":1},{"id":"b0","label":"B: page 0","sub":"libc code","kind":"box","col":0,"row":2},{"id":"b1","label":"B: page 1","sub":"rarely used data","kind":"box","col":0,"row":3},{"id":"f7","label":"Frame 7","kind":"box","col":3,"row":0},{"id":"f3","label":"Frame 3","sub":"shared, read-only","kind":"box","col":3,"row":1.5,"highlight":true},{"id":"disk","label":"Swap on disk","kind":"db","col":3,"row":3}],"edges":[{"from":"a0","to":"f7"},{"from":"a1","to":"f3"},{"from":"b0","to":"f3"},{"from":"b1","to":"disk","dashed":true,"label":"not in RAM"}],"caption":"Two processes' page tables. Shared library code sits in one physical frame mapped into both; a page that was swapped out lives on disk until it's touched again."}
```

What this buys you:

- **Isolation.** A bug in one process can't scribble over another.
- **Lazy allocation.** Asking for 1 GB reserves address space; physical frames are assigned only when a page is first touched.
- **Sharing.** Shared libraries are loaded into RAM once and mapped into every process that uses them. `mmap` maps a file into memory so reading it looks like reading an array.

When a program touches a page that isn't mapped yet, the CPU raises a **page fault** and the kernel steps in:

- **Minor fault**: the data is already in RAM (or the page just needs zero-filling), so the kernel only updates the page table. Cheap.
- **Major fault**: the page must be read from disk (swap or a memory-mapped file). Thousands of times slower than a RAM access.
- **Invalid access**: the address isn't mapped at all, or it's a write to read-only memory. The process gets a **segmentation fault**.

**Copy-on-write** is why `fork()` is fast. On Linux, a process using 2 GB that forks doesn't copy 2 GB: parent and child share every page, marked read-only, and a page is copied only when one of them writes to it. A fork followed by `exec` (how shells start programs) copies almost nothing.

If the pages that processes actively use exceed RAM, the system **thrashes**: it spends its time moving pages to and from disk. On Linux, running out completely wakes the **OOM killer**, which kills a process to free memory.

### Virtual size vs resident memory

`ps`, `top` and `/proc/<pid>/status` report two very different sizes for a process:

- **VSZ** (virtual size, `VmSize`) is all the address space the process has mapped: heap, every thread's stack, shared libraries, memory-mapped files, and ranges reserved but never touched.
- **RSS** (**resident set size**, `VmRSS`) is the part that sits in physical RAM right now.

VSZ is often many times RSS, and that's normal. Lazy allocation means a reservation costs address space, not RAM: a JVM reserves its whole maximum heap at startup, each thread reserves its full stack, glibc's `malloc` reserves 64 MiB for each extra arena it creates for busy threads, and Go and sanitizer builds reserve huge ranges up front. A 64-bit address space is so large that none of this matters until pages are touched.

```python
import mmap

def mem():
    # VmSize = VSZ, VmRSS = RSS (both in kB)
    fields = dict(line.split(":", 1) for line in open("/proc/self/status"))
    return fields["VmSize"].strip(), fields["VmRSS"].strip()

print(mem())                      # ('35552 kB', '11284 kB')
# reserve 1 GiB, touch nothing
buf = mmap.mmap(-1, 1 << 30)
print(mem())                      # ('1084128 kB', '11484 kB')  VSZ +1 GiB, RSS flat
# touch one byte per 4 KiB page of first 100 MiB
for off in range(0, 100 << 20, 4096):
    buf[off] = 1
print(mem())                      # ('1084128 kB', '113884 kB')  RSS +100 MiB
```

The pitfall is alerting or sizing on VSZ: it says almost nothing about memory pressure. Watch RSS (or the container's cgroup memory usage, which is what the OOM killer acts on). RSS has its own catch: shared library pages count in every process that maps them, so summing RSS across processes overcounts; **PSS** (proportional set size, in `/proc/<pid>/smaps_rollup`) splits shared pages between their users. Pages swapped out leave RSS, so a swapping process can look smaller than it is.

### Zombie and orphan processes

When a process exits, the kernel frees its memory and files but keeps a small entry in the process table: its PID and **exit status**, waiting for the parent to collect them. Collecting them is called **reaping**, and the parent does it with `wait()` or `waitpid()`.

- A **zombie** is a child that has exited but hasn't been reaped yet. `ps` shows it as `Z` or `<defunct>`. It uses no CPU or memory beyond that entry, and `kill` can't remove it, because it's already dead. A few are harmless; a parent that never calls `wait` accumulates them until the system runs out of PIDs and can't start new processes.
- An **orphan** is a child whose parent exited first. The kernel re-parents it to PID 1 (`init` or `systemd`, or a designated "subreaper"), which reaps it when it exits. Orphans are normal: it's how daemons detach.

```python
import os, time

pid = os.fork()
if pid == 0:                         # in the child
    os._exit(3)                      # exit at once with status 3
time.sleep(5)                        # meanwhile `ps` lists the child as <defunct> (state Z)
_, status = os.waitpid(pid, 0)       # reap it: read the status, the kernel frees the entry
print(os.waitstatus_to_exitcode(status))   # 3
```

Ways to avoid zombies:

- **Wait for every child** you start: `waitpid` in C, `subprocess.run` or `Popen.wait()` in Python, `Process.waitFor()` in Java.
- **Reap in a `SIGCHLD` handler**, calling `waitpid(-1, &status, WNOHANG)` in a loop, because several exits can arrive as one signal. Setting `SIGCHLD` to `SIG_IGN` tells the kernel to reap children automatically.
- **Containers**: your program often runs as PID 1, which inherits every orphan. If it never calls `wait`, zombies pile up; run a small init such as `tini` (`docker run --init`).

To get rid of zombies that already exist, make their parent reap them, or kill the parent: the zombies become orphans, and PID 1 reaps them.

## The stack and the heap

Each thread has a **stack**: a contiguous region where every function call pushes a **frame** holding its arguments, local variables and return address. Returning pops the frame. Allocation is just moving a pointer, so it's extremely fast, and memory is freed automatically when the function returns.

```diagram
{"type":"array","values":["fib(1)","fib(2)","fib(3)","main()"],"vertical":true,"highlight":[0],"indices":false,"caption":"The call stack while computing fib(3): each call pushes a frame, and the top frame belongs to the function running now."}
```

The **heap** is the pool for memory whose size or lifetime isn't tied to one function call: `new`, `malloc`, and every object in Python and Java. It's slower (the allocator has to find a free block and keep bookkeeping) and it must be freed by someone: the programmer in C, a destructor in C++, the garbage collector in Java and Python.

| | Stack | Heap |
|---|---|---|
| What lives there | Frames: locals, arguments, return addresses | Dynamically allocated objects |
| Lifetime | Until the function returns | Until freed or garbage-collected |
| Allocation cost | A pointer bump | An allocator call |
| Size | Small and fixed per thread (8 MiB for Linux's main thread by default, often 1 MiB elsewhere) | Up to available memory |
| Typical failure | **Stack overflow** from deep or infinite recursion | Leaks, fragmentation, use-after-free |

In Python, every value is a heap object and locals hold references. In Java, primitives and references live in the frame and objects on the heap. C++ lets you choose: `Point p;` is on the stack, `make_unique<Point>()` on the heap.

A **stack overflow** happens when recursion goes too deep: Python raises `RecursionError` at about 1,000 frames by default, Java throws `StackOverflowError`, and C++ usually crashes with a segmentation fault. For inputs that can be deep (a linked list of 10⁵ nodes, a degenerate tree), use an explicit stack or iteration instead of recursion.

### Thread stack sizes

The main thread and the threads you create don't get the same stack. On Linux the main thread's stack grows on demand up to `ulimit -s` (8 MiB by default). Every other thread gets a **fixed-size** stack, reserved when the thread is created and never grown, and its default **thread stack size** depends on the platform:

| Platform or runtime | Main thread | Other threads |
|---|---|---|
| Linux, glibc | 8 MiB (`ulimit -s`), grows | Same as `ulimit -s` (usually 8 MiB), fixed |
| Linux, musl (Alpine images) | 8 MiB, grows | 128 KiB |
| macOS | 8 MiB | 512 KiB |
| Windows | 1 MiB (set in the executable) | 1 MiB |
| JVM (64-bit Linux) | `-Xss`, 1 MiB | `-Xss`, 1 MiB |
| Go goroutines | Start at a few KiB and grow, up to 1 GB | Same |

That's why **deep recursion crashes in threads first**: a recursive DFS that passes locally in `main` overflows inside a thread pool worker, a web request handler, or the same code in an Alpine container. In C and C++ an overflow is a segmentation fault with no useful message.

Fixes, best first:

1. **Make it iterative** with an explicit stack on the heap. Depth then costs heap memory, which is plentiful.
2. **Ask for a bigger stack** when creating the thread: Java's `Thread` constructor takes a `stackSize`, POSIX threads take `pthread_attr_setstacksize` (C++'s `std::thread` has no option), and Python has `threading.stack_size(n)` before starting the thread. Competitive programmers run their recursive solution in a thread with a large stack for exactly this reason.
3. **Raise the default**: `-Xss` for the JVM, `ulimit -s` for the main thread.

```java
static int depth(int n) {
    return n == 0 ? 0 : 1 + depth(n - 1);
}

static void runWithStack(long stackBytes) throws InterruptedException {
    // stackSize is a hint, but HotSpot honours it (0 = default -Xss)
    Thread t = new Thread(null, () -> {
        try {
            System.out.println(depth(1_000_000));
        } catch (StackOverflowError e) {
            System.out.println("StackOverflowError");
        }
    }, "deep", stackBytes);
    t.start();
    t.join();
}

// runWithStack(0)          prints StackOverflowError (1 MiB default)
// runWithStack(512L << 20) prints 1000000
```

A big stack is only reserved address space ([VSZ, not RSS](/learn/os-memory#virtual-size-vs-resident-memory)), so RAM is used only for the depth actually reached.

## System calls and context switches

User programs run in **user mode** and can't touch hardware directly. To open a file, send a packet, allocate pages or start a process, they make a **system call** (`read`, `write`, `openat`, `mmap`, `fork`, `execve`, `epoll_wait`), which switches the CPU into **kernel mode**, runs kernel code and switches back. A cheap system call costs on the order of 100 ns to 1 µs, far more than a function call.

That cost is why I/O is **buffered**: writing a file one byte per `write()` call is dramatically slower than filling a 64 KiB buffer and writing it once. Python's file objects, Java's `BufferedWriter` and C++ streams all buffer for you (and `flush` forces the buffer out).

```bash
strace -c python3 script.py          # count system calls by type
strace -f -e trace=openat,read -p 4242   # watch one running process (and its threads)
```

A **context switch** is the kernel pausing one thread and resuming another, saving and restoring their registers. It happens when a thread blocks (on I/O, a lock, `sleep`) or its time slice runs out. The direct cost is a few microseconds; the indirect cost is often larger, because the new thread finds the caches full of someone else's data, and switching processes also flushes TLB entries. This is why thousands of busy threads perform worse than a few threads with a work queue (see [Concurrency](/learn/concurrency)).

### Time slices and round-robin scheduling

**Round-robin scheduling** is the textbook way to share a CPU: runnable threads wait in a queue, the one at the front runs for at most one **time slice** (or **time quantum**) `q`, and if it hasn't blocked or finished by then a timer interrupt preempts it and it goes to the back of the queue. Choosing `q` is a trade-off between responsiveness and overhead, and it's a favourite OS quiz question.

With `n` runnable threads and a context switch costing `s`:

- **Overhead**: each slice of useful work costs one switch, so the fraction of CPU lost is `s / (q + s)`.
- **Response time**: a thread that becomes runnable may wait for everyone ahead of it, up to `(n − 1) · (q + s)`.

| Slice `q` (switch `s` = 0.1 ms, `n` = 10) | CPU lost to switching | Worst wait for a turn |
|---|---|---|
| 0.1 ms | 50% | 1.8 ms |
| 1 ms | about 9% | 9.9 ms |
| 10 ms | about 1% | 90.9 ms |
| 100 ms | 0.1% | about 0.9 s |

- **Too short** and the CPU spends its time switching, and every switch also cools the caches (the indirect cost, often bigger than `s`).
- **Too long** and round robin degenerates into first-come, first-served: a keypress or a short request waits behind long CPU-bound jobs, and the system feels sluggish.
- The classic rule of thumb is a slice much longer than a switch, and long enough that most CPU bursts (say 80%) finish within one slice, so threads usually block for I/O on their own before being preempted.

Real schedulers refine this rather than using one fixed `q`: Linux's EEVDF scheduler (the default since kernel 6.6) gives each thread a slice of a few milliseconds and picks the thread that is most behind its fair share, and interactive threads that mostly sleep get the CPU quickly when they wake. Server throughput settings lean toward longer slices; desktops toward shorter ones.

## File descriptors

On Unix-like systems, a **file descriptor** is a small integer that indexes the process's table of open resources: files, sockets, pipes, even timers and `epoll` instances. Every process starts with 0 (stdin), 1 (stdout) and 2 (stderr), and `open` returns the lowest free number.

Each process has a limit on open descriptors (the soft limit is often 1,024 by default; servers raise it). A **descriptor leak** (opening files or sockets and never closing them, typically on an error path) eventually makes every `open` and `accept` fail with **"Too many open files"** (`EMFILE`), usually days after deployment.

```bash
ulimit -n                     # this shell's soft limit on open descriptors
ls /proc/4242/fd | wc -l      # how many process 4242 has open right now
lsof -p 4242                  # what they are: files, sockets, pipes
```

The fix is to close resources on every path, which RAII and `with` blocks (below) make automatic.

## The page cache

Ordinary file I/O doesn't go straight to the disk. The kernel keeps recently used file pages in otherwise idle RAM, the **page cache**, and `read` and `write` go through it:

- **Reads**: on a miss, the kernel reads the pages from disk (and usually some following ones, guessing you'll read on: **readahead**), keeps them, and copies them to your buffer. Reading the same file again is a hit served from RAM. That's why the second run of a build, a `grep -r` or a database query is much faster than the first, and why benchmarks must say whether they were "cold" or "warm".
- **Writes**: `write` copies your data into the page cache, marks those pages **dirty** and returns. Kernel threads write dirty pages back to disk later, typically within about 30 seconds. So a successful `write` means "the kernel has it", not "it's on disk": a power loss or kernel crash can still lose it (a crash of only your process can't).
- `mmap`ed files are the same pages, mapped straight into the process.

To make data **durable**, call **`fsync`** (or `fdatasync`), which blocks until the file's dirty pages, and the device's own write cache, are on stable storage. It's slow (around a millisecond on an SSD, more on a disk), which is why databases batch many commits into one `fsync` (group commit). Language buffers sit one level above this: `flush` moves your program's buffer into the page cache; only `fsync` reaches the disk.

```python
import os

def append_durably(path, line):
    with open(path, "a") as f:
        f.write(line + "\n")
        # Python's buffer into page cache
        f.flush()
        # page cache to disk; returns once device confirms
        os.fsync(f.fileno())
```

To be crash-safe when creating or renaming a file, `fsync` the directory too, since the directory entry is data of its own.

The page cache is why `free` seems to say a healthy server is out of memory:

```bash
free -h
#                total        used        free      shared  buff/cache   available
# Mem:            15Gi       4.1Gi       312Mi        16Mi        11Gi        11Gi
```

`free` is RAM nobody uses at all, and it's *supposed* to be small: idle RAM is wasted RAM. `buff/cache` is mostly the page cache, which the kernel drops instantly when a program needs memory (clean pages are just discarded; dirty ones are written first). The number to watch is **`available`**: an estimate of how much programs can still get without swapping. A database that bypasses the page cache with `O_DIRECT` keeps its own cache instead (the buffer pool in the [caching layers](/learn/caching) table).

## Signals and graceful shutdown

A **signal** is a small asynchronous notification the kernel delivers to a process: `kill -TERM 4242`, Ctrl+C in a terminal (`SIGINT`), a child exiting (`SIGCHLD`), a write to a closed pipe (`SIGPIPE`). For most signals a process can install a handler, ignore it, or keep the default action (usually: terminate). Two matter most for stopping a process:

| | `SIGTERM` (15) | `SIGKILL` (9) |
|---|---|---|
| Meaning | "Please shut down" | "Die now" |
| Can be caught or ignored | Yes | No: the kernel removes the process |
| Cleanup runs | Whatever the handler does | Nothing: no handlers, `finally` blocks or destructors |
| Sent by | `kill <pid>` (the default), `systemctl stop`, `docker stop`, Kubernetes pod deletion | `kill -9`, the OOM killer, orchestrators after the grace period |
| Exit status seen by a shell | Whatever the program exits with (143 if it doesn't catch it) | 137 (128 + 9) |

Orchestrators combine them: `docker stop` sends `SIGTERM`, waits 10 seconds, then sends `SIGKILL`; Kubernetes waits `terminationGracePeriodSeconds` (30 by default). A **graceful shutdown** handler uses that window to stop cleanly:

1. **Stop taking new work**: stop accepting connections, fail the readiness check so the load balancer stops sending traffic, stop pulling from the queue.
2. **Finish in-flight work** (requests, the current job), with a deadline shorter than the grace period.
3. **Flush and release**: flush buffers and logs, commit offsets, close database connections and files.
4. **Exit 0.**

The handler itself should do almost nothing: it runs between two arbitrary instructions of your program, so it only sets a flag (or writes to a pipe), and the main loop notices and does the real work. In C, only async-signal-safe functions may be called inside a handler; `printf` and `malloc` aren't.

```python
import signal, threading, time

stopping = threading.Event()

def on_term(signum, frame):
    # only set flag; main loop does real cleanup
    stopping.set()

signal.signal(signal.SIGTERM, on_term)
signal.signal(signal.SIGINT, on_term)

# stop taking new work once flag is set
while not stopping.is_set():
    # stand-in for handling one request
    time.sleep(0.1)

# finish in-flight work, flush, close, then exit 0
print("draining and closing connections")
```

Common pitfalls: a container whose shell-form `CMD` makes `/bin/sh` PID 1, so `SIGTERM` never reaches your program and every stop waits for the `SIGKILL` (use the exec form, `CMD ["python", "app.py"]`, or `docker run --init`); a PID 1 that has no handler, because the kernel ignores signals with default actions for PID 1; and relying on cleanup that `SIGKILL` (or a power cut) will skip. Anything that must survive a hard kill needs to be durable already, not saved on the way out.

## Memory leaks

A **memory leak** is memory a program no longer needs but never gives back. The process's resident memory (RSS) grows steadily until it slows down under garbage-collection pressure or is killed for running out of memory.

- **In C and C++**, a leak is memory that's allocated and never freed, usually because an early `return` or an exception skipped the `delete`. **Valgrind** and **AddressSanitizer** (with LeakSanitizer) find them.
- **Garbage-collected languages leak too**, through objects that are still *reachable* but never used again: a cache or map that only grows, event listeners that are never unregistered, a static list that collects requests, a closure that captures a large object, `ThreadLocal` values on pooled threads.

Find them by comparing heap snapshots over time (Java heap dumps, Python's `tracemalloc`, browser heap snapshots). Fix them with bounded caches (size limits, eviction, TTLs), weak references for caches keyed by objects, and explicit unregistering. A cache warming up levels off; a leak keeps growing.

## Garbage collection

**Garbage collection** reclaims heap memory that the program can no longer reach. There are two main approaches.

**Reference counting** stores a count on every object of how many references point at it. When the count drops to zero, the object is freed immediately. CPython works this way, which is why a file opened in a function is usually closed as soon as the function returns. The costs: every assignment updates a counter, and **cycles are never freed**. If A refers to B and B refers back to A, both counts stay at 1 forever. CPython therefore adds a cycle detector (the `gc` module) that periodically looks for groups of objects only reachable from each other, concentrating on recently created objects. C++'s `shared_ptr` and Swift also count references but have no cycle detector, so cycles must be broken with weak references.

**Tracing collectors** (the JVM, Go, JavaScript engines, .NET) start from the **roots** (thread stacks, static fields, registers), mark everything reachable, and reclaim everything else. Cycles are no problem: unreachable is unreachable.

```diagram
{"type":"graph","nodes":["roots","A","B","C","D","E"],"edges":[["roots","A"],["A","B"],["A","C"],["D","E"],["E","D"]],"directed":true,"highlight":["roots","A","B","C"],"caption":"Tracing from the roots reaches A, B and C. D and E point at each other, so their reference counts never hit zero, but no root reaches them: a tracing GC frees them."}
```

Most tracing collectors are **generational**, based on the observation that most objects die young. The JVM splits the heap into a **young generation**, collected often and quickly by copying the few survivors out, and an **old generation** for long-lived objects, collected less often. The default collector, G1, aims for a pause-time target; ZGC and Shenandoah do almost all their work concurrently with the application and keep pauses around a millisecond or below.

| | Reference counting | Tracing (generational) |
|---|---|---|
| When memory is freed | Immediately, at count zero | In batches, when a collection runs |
| Cycles | Leak without a separate cycle detector | Collected normally |
| Overhead | On every reference change | Proportional to live objects, plus pauses |
| Predictability | Deterministic for acyclic data | Pauses at times you don't choose |
| Used by | CPython, Swift, `shared_ptr` | JVM, Go, V8, .NET |

GC removes use-after-free and double-free bugs, but not leaks of reachable objects, and it doesn't close files or sockets on time. Don't rely on finalisers (`__del__`; Java's `finalize` is deprecated for removal); use the explicit patterns below.

## RAII and smart pointers

**RAII** (resource acquisition is initialisation) is the core C++ idiom: tie each resource to an object, acquire it in the constructor and release it in the destructor. Destructors run whenever an object goes out of scope, including when an exception unwinds the stack, so the release can't be forgotten. `std::vector` frees its buffer, `std::fstream` closes its file, `std::lock_guard` unlocks its mutex.

Garbage-collected languages get the same guarantee for non-memory resources with explicit blocks: Python's `with` and Java's try-with-resources.

```python
class Connection:
    def __init__(self, name):
        self.name = name
        print("open", name)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        print("close", self.name)     # runs however the block exits
        return False                  # don't swallow the exception

def handle():
    with Connection("db") as conn:
        raise ValueError("query failed")

try:
    handle()
except ValueError as e:
    print("caught:", e)
# open db / close db / caught: query failed
```

```java
static class Connection implements AutoCloseable {
    final String name;
    Connection(String name) { this.name = name; System.out.println("open " + name); }
    @Override public void close() { System.out.println("close " + name); }  // runs however the block exits
}

static void handle() {
    try (Connection conn = new Connection("db")) {
        throw new IllegalStateException("query failed");
    }
}

public static void main(String[] args) {
    try { handle(); }
    catch (IllegalStateException e) { System.out.println("caught: " + e.getMessage()); }
    // open db / close db / caught: query failed
}
```

```cpp
class Connection {
    string name;
public:
    explicit Connection(string n) : name(move(n)) { cout << "open " << name << "\n"; }
    ~Connection() { cout << "close " << name << "\n"; }   // runs when the object goes out of scope
    Connection(const Connection&) = delete;               // one owner: no accidental copies
    Connection& operator=(const Connection&) = delete;
};

void handle() {
    Connection conn("db");
    throw runtime_error("query failed");                  // stack unwinding calls ~Connection()
}

int main() {
    try { handle(); }
    catch (const runtime_error& e) { cout << "caught: " << e.what() << "\n"; }
    // open db / close db / caught: query failed
}
```

**Smart pointers** apply RAII to heap memory, so modern C++ code almost never calls `new` or `delete` directly:

| Type | Ownership | Notes |
|---|---|---|
| `unique_ptr<T>` | Exactly one owner | Move-only, no overhead over a raw pointer; the default choice. Create with `make_unique` |
| `shared_ptr<T>` | Shared; freed when the last owner goes | Atomic reference count in a control block; `make_shared` allocates both at once |
| `weak_ptr<T>` | None: observes a `shared_ptr` | Breaks cycles (a child's pointer back to its parent); call `lock()` to use it |
| `T*` or `T&` | None | Fine for non-owning access, as long as the owner outlives it |

Two `shared_ptr`s pointing at each other leak like any reference cycle, which is what `weak_ptr` is for. The **rule of zero**: if every member manages itself (vectors, strings, smart pointers), a class needs no destructor or copy and move operations of its own.

## CPU caches and locality

A main-memory access takes around 100 ns, during which a modern core could have executed hundreds of instructions. CPUs hide this with a hierarchy of small, fast caches:

```diagram
{"type":"flow","nodes":[{"id":"core","label":"Core","sub":"registers","kind":"box","col":0},{"id":"l1","label":"L1 cache","sub":"~1 ns, tens of KiB","kind":"cache","col":1},{"id":"l2","label":"L2 cache","sub":"~4 ns, ~1 MiB","kind":"cache","col":2},{"id":"l3","label":"L3 cache","sub":"~10-20 ns, shared, MiBs","kind":"cache","col":3},{"id":"ram","label":"RAM","sub":"~100 ns, GBs","kind":"db","col":4},{"id":"ssd","label":"NVMe SSD","sub":"~20-100 µs, TBs","kind":"db","col":5}],"edges":[{"from":"core","to":"l1"},{"from":"l1","to":"l2"},{"from":"l2","to":"l3"},{"from":"l3","to":"ram"},{"from":"ram","to":"ssd","dashed":true}],"caption":"Each level is bigger and slower than the one before. Figures are rough orders of magnitude and vary by CPU."}
```

Memory moves between RAM and cache in **cache lines** of 64 bytes on most CPUs. Reading one `int` pulls in the 15 next to it for free, and the hardware **prefetcher** notices sequential access and fetches the next lines before you ask. So code is fast when it has good **cache locality**:

- **Spatial locality**: using data near what you just used (walking an array in order).
- **Temporal locality**: reusing the same data soon (a small hot working set).

This is why **arrays beat linked lists** in practice even when both are O(n). An array is one contiguous block; a linked list's nodes are scattered around the heap, so each step can be a cache miss, and every node carries a pointer and allocator overhead. Summing 10 million integers on one x86 machine:

```text
std::vector<int>                        ~7 ms
std::list<int>, nodes allocated in order    ~40 ms
linked list with nodes shuffled in memory   ~1,750 ms
```

The same effect shows up in 2D arrays: in C, C++ and Java each row is stored contiguously, so looping row by row was about 10× faster than column by column on a 4,000 × 4,000 grid. In Java, an `int[]` is contiguous but an `ArrayList<Integer>` holds pointers to boxed objects; in Python, a list holds pointers too (NumPy arrays are contiguous). See [Arrays & strings](/learn/arrays-strings) and [Linked lists](/learn/linked-lists) for the data-structure side.

A concurrency twist: **false sharing**. Two threads writing *different* variables that happen to share a cache line force that line to bounce between their cores, which can make "independent" counters very slow. Padding or aligning hot per-thread data to separate lines fixes it.

## Latency numbers

Knowing rough magnitudes lets you sanity-check a design in your head. These are approximate and vary by hardware; the ratios are what matter.

| Operation | Rough time | If L1 took 1 second |
|---|---|---|
| L1 cache hit | ~1 ns | 1 s |
| Branch mispredict | ~3–5 ns | 4 s |
| L2 cache hit | ~4 ns | 4 s |
| Uncontended mutex lock/unlock | ~20 ns | 20 s |
| Main memory access | ~100 ns | under 2 min |
| System call | ~0.1–1 µs | 2–17 min |
| Context switch | ~2–5 µs | about an hour |
| NVMe SSD random read | ~20–100 µs | 6–28 hours |
| Round trip within a data centre | ~0.1–0.5 ms | 1–6 days |
| Hard disk seek | ~5–10 ms | 2–4 months |
| Round trip across an ocean | ~70–150 ms | 2–5 years |

Memory is ~100× slower than cache, and disk and network are thousands to millions of times slower than memory, so batching, caching and avoiding round trips beat micro-optimising arithmetic.

## Profiling before optimising

Programmers are notoriously bad at guessing where time goes. **Profiling** measures it, so the work goes where it helps. A sound process:

1. **Define the goal and metric**: p99 latency of an endpoint, throughput, peak memory. "Faster" isn't a goal.
2. **Reproduce with a realistic workload** and record a baseline.
3. **Profile** to find where time or memory actually goes.
4. **Fix the biggest item**, then measure again. Keep the change only if the numbers improved.

**Sampling profilers** record the stack many times a second (`perf`, `py-spy`, async-profiler, Java Flight Recorder); **deterministic profilers** like Python's `cProfile` record every call but slow the program down. Results are usually drawn as a **flame graph**: each bar is a function, its width is its share of samples (not time order), and callees sit on top of callers, so wide bars are where to look.

```bash
py-spy record -o profile.svg --pid 4242     # flame graph of a running Python process
perf record -g ./server && perf report      # sample a native program with call stacks
python3 -m cProfile -s cumtime script.py    # per-function totals
```

Check **wall-clock time against CPU time**. If a request takes 800 ms of wall time but 20 ms of CPU, the program is *waiting* (database, network, locks), and a CPU profile won't show it; look at traces or off-CPU profiles instead.

**Amdahl's law** limits what any fix can do: if a part takes a fraction *p* of the runtime and you speed it up *s* times, the overall speedup is `1 / ((1 - p) + p / s)`. Making a part that takes 10% of the time infinitely fast saves at most 10%. The biggest wins usually come from a better algorithm (see [Big-O & complexity](/learn/big-o)), fewer round trips, or less I/O, not from tweaking arithmetic.

Benchmarking pitfalls: measuring debug builds, ignoring JIT warm-up (next section), letting the compiler delete code whose result is unused (use a harness such as JMH or Google Benchmark), and reporting one run instead of a distribution.

### JIT compilation and warm-up

Java, JavaScript, C# and PyPy don't run your code at full speed from the start. A **just-in-time (JIT) compiler** turns hot code into machine code *while the program runs*, and modern runtimes do it in tiers (**tiered compilation**):

1. **Interpreter.** Starts instantly but runs bytecode many times slower than compiled code. Meanwhile it records a **profile**: how often each method and loop runs, which branches are taken, which concrete types show up at each call.
2. **Baseline compiler.** Once a method is warm (thousands of calls or loop iterations; the thresholds vary), it's compiled quickly with few optimisations.
3. **Optimising compiler.** Hot code is compiled again using the profile: it inlines the callee it has seen, removes checks and unrolls loops. These optimisations are **speculative**: they assume the profile stays true ("this call always receives an `ArrayList`").
4. **Deoptimisation.** When an assumption breaks (a new type arrives, a never-taken branch is taken), the runtime discards the optimised code, rebuilds that frame's state for the interpreter and carries on there. The method may be recompiled later with the updated profile.

```diagram
{"type":"flow","nodes":[{"id":"bc","label":"Bytecode","kind":"box","col":0},{"id":"in","label":"Interpreter","sub":"slow, records profiles","kind":"service","col":1},{"id":"c1","label":"Baseline JIT","sub":"fast to compile","kind":"service","col":2},{"id":"c2","label":"Optimising JIT","sub":"speculative, fastest code","kind":"service","col":3,"highlight":true}],"edges":[{"from":"bc","to":"in"},{"from":"in","to":"c1","label":"warm"},{"from":"c1","to":"c2","label":"hot"},{"from":"c2","to":"in","label":"deoptimise","dashed":true}],"caption":"Tiered compilation: code moves up the tiers as it gets hotter, and falls back to the interpreter when a speculative assumption fails."}
```

Concretely: the JVM's HotSpot goes interpreter → C1 → C2; V8 (Chrome, Node.js) goes Ignition → Sparkplug → Maglev → TurboFan; .NET also compiles in tiers; CPython 3.13 and later ship an experimental JIT that is off by default. A long-running loop can switch to compiled code in the middle of the loop, which is called **on-stack replacement**.

Why it matters for benchmarks: the first runs measure the interpreter and the compiler, not your algorithm.

- **Warm up first.** Run the code many times before timing it, then time many runs and report the distribution. JMH does this for Java (warm-up iterations, separate JVM forks); in JavaScript, call the function in a loop before measuring.
- **Warm up on realistic inputs.** If warm-up sees only one type or one branch, the measured phase may trigger deoptimisation; and a microbenchmark that only ever sees one type gets inlining that production code won't.
- **Use the results** (JMH's `Blackhole`, Google Benchmark's `DoNotOptimize`), or the optimiser deletes the work you meant to measure.
- **Treat cold start as its own metric.** Command-line tools, serverless functions and short batch jobs may finish before warm-up does. Ahead-of-time compilation (GraalVM Native Image), class-data sharing and keeping processes alive all help.
- C++ and Rust compile ahead of time, so there's no JIT warm-up, but the first iterations still pay for cold caches, page faults and untrained branch predictors. Discard them too.

## Interview questions and pitfalls

- *"What happens when a program reads an address whose page isn't in RAM?"* A page fault: the kernel loads or zero-fills the page, updates the page table, and resumes the instruction.
- *"Why doesn't `fork()` of a 2 GB process need 2 GB more?"* Copy-on-write.
- *"Stack vs heap?"* Automatic, fast, small and per-thread versus manual or GC-managed, flexible and shared.
- *"Can a Java program leak memory?"* Yes: anything reachable but unused, such as a map that only grows.
- *"How does CPython free a cycle?"* Not by reference counting: the periodic cycle collector finds it.
- *"Why is iterating an array faster than a linked list?"* Contiguous memory, cache lines and prefetching.
- *"A process shows 30 GB VSZ but 400 MB RSS. Leak?"* No: VSZ counts reserved address space; RSS is what's in RAM.
- *"`free` shows 300 MB free on a 16 GB box. Problem?"* Look at `available`: the page cache gives memory back on demand.
- *"`SIGTERM` vs `SIGKILL`?"* The first can be caught for a graceful shutdown; the second can't be caught at all.
- Pitfalls: optimising without measuring, unbounded caches, forgetting to close sockets on error paths, deep recursion on large inputs, and averaging latencies instead of looking at percentiles.
