---
title: Concurrency
summary: Threads and processes, race conditions, locks and atomics, deadlock, condition variables, producer-consumer, thread pools, async/await, Python's GIL and memory visibility.
related: os-memory, transactions, distributed-systems, language-gotchas
terms:
  - race condition #race-conditions
  - race conditions #race-conditions
  - data race #race-conditions
  - critical section #race-conditions
  - mutex #locks-and-atomics
  - compare-and-swap #locks-and-atomics
  - deadlock #deadlock
  - livelock #livelock-and-starvation
  - condition variable #condition-variables-and-semaphores
  - semaphore #condition-variables-and-semaphores
  - producer-consumer #producer-consumer
  - thread pool #thread-pools
  - event loop #async-await-and-event-loops
  - GIL #python-s-gil
  - happens-before #memory-visibility
  - goroutine #goroutines-and-m-n-scheduling
  - goroutines #goroutines-and-m-n-scheduling
  - M:N scheduling #goroutines-and-m-n-scheduling
  - virtual threads #goroutines-and-m-n-scheduling
  - green threads #goroutines-and-m-n-scheduling
  - priority inversion #priority-inversion-inheritance-and-ceilings
  - priority inheritance #priority-inversion-inheritance-and-ceilings
  - priority ceiling #priority-inversion-inheritance-and-ceilings
---

## Processes, threads and concurrency

**Concurrency** means a program has several tasks in progress at once, whose steps can interleave. **Parallelism** means steps actually run at the same instant on different cores. A single-core machine can be concurrent but not parallel; most concurrency bugs appear either way.

The operating system gives you two units of execution:

| | Process | Thread |
|---|---|---|
| Memory | Its own private address space | Shares the process's memory with its sibling threads |
| Cost to create | Higher (new address space, page tables) | Lower (a stack and a kernel scheduling entry) |
| Communication | Pipes, sockets, shared memory segments | Just read and write shared variables |
| Failure | A crash stays inside the process | A crash takes down every thread in the process |
| Switching | Slower (address space change, cache and TLB misses) | Faster |

Threads are cheap to talk between, and that is exactly the danger: any thread can touch any shared object at any time. Processes are isolated, which is safer but makes sharing explicit and more expensive. How the OS schedules and switches them is covered in [OS, memory & performance](/learn/os-memory).

## Race conditions

A **race condition** is a bug where the result depends on the timing of threads. The classic case is `count += 1`, which looks like one step but is three: read `count`, add one, write it back. If two threads interleave those steps, one update disappears.

```diagram
{"type":"grid","cells":[["read 5","","calc 6","","write 6",""],["","read 5","","calc 6","","write 6"],[5,5,5,5,6,6]],"rowLabels":["thread A","thread B","count"],"colLabels":[1,2,3,4,5,6],"highlight":[[2,5]],"caption":"Two increments, but count only goes from 5 to 6: B read before A wrote, so A's update is lost."}
```

A **critical section** is code that touches shared state and must not run in more than one thread at a time. Protect it, and the race is gone:

```python
import threading

count = 0
lock = threading.Lock()

def unsafe(n):
    global count
    for _ in range(n):
        count += 1                 # read, add, write: another thread can run in between

def safe(n):
    global count
    for _ in range(n):
        with lock:                 # only one thread at a time in the critical section
            count += 1

def run(worker, threads=4, n=200_000):
    global count
    count = 0
    ts = [threading.Thread(target=worker, args=(n,)) for _ in range(threads)]
    for t in ts: t.start()
    for t in ts: t.join()
    return count

print(run(unsafe), run(safe))      # unsafe is not guaranteed to reach 800000; safe always does
```

```java
static int count = 0;
static final Object lock = new Object();
static final AtomicInteger atomic = new AtomicInteger();

static void unsafe(int n) { for (int i = 0; i < n; i++) count++; }        // read, add, write
static void locked(int n) { for (int i = 0; i < n; i++) synchronized (lock) { count++; } }
static void viaAtomic(int n) { for (int i = 0; i < n; i++) atomic.incrementAndGet(); }

static void run(Runnable r, int threads) throws InterruptedException {
    List<Thread> ts = new ArrayList<>();
    for (int t = 0; t < threads; t++) { Thread th = new Thread(r); ts.add(th); th.start(); }
    for (Thread th : ts) th.join();
}

public static void main(String[] args) throws InterruptedException {
    run(() -> unsafe(200_000), 4);
    System.out.println(count);                 // usually less than 800000
    count = 0;
    run(() -> locked(200_000), 4);
    System.out.println(count);                 // 800000
    run(() -> viaAtomic(200_000), 4);
    System.out.println(atomic.get());          // 800000
}
```

```cpp
int count_ = 0;               // plain int: concurrent ++ is a data race (undefined behaviour)
mutex m;
atomic<int> atomicCount{0};

void unsafeWork(int n) { for (int i = 0; i < n; i++) count_++; }
void lockedWork(int n) { for (int i = 0; i < n; i++) { lock_guard<mutex> g(m); count_++; } }
void atomicWork(int n) { for (int i = 0; i < n; i++) atomicCount++; }  // atomic read-modify-write

void run(void (*f)(int), int threads, int n) {
    vector<thread> ts;
    for (int t = 0; t < threads; t++) ts.emplace_back(f, n);
    for (auto& t : ts) t.join();
}

int main() {
    run(unsafeWork, 4, 200000);
    cout << count_ << "\n";       // usually less than 800000
    count_ = 0;
    run(lockedWork, 4, 200000);
    cout << count_ << "\n";       // 800000
    run(atomicWork, 4, 200000);
    cout << atomicCount << "\n";  // 800000
}
```

The unsafe versions are worse than they look. On standard CPython the loop often *happens* to print the right answer, because the interpreter only switches threads at certain points; add a function call to the loop body and updates start vanishing. In C++, an optimising compiler may fold the loop into a single addition and hide the bug in one build but not another.

Two terms that are often mixed up:

- A **data race** is a low-level event: two threads access the same memory at the same time, at least one writes, and nothing orders them. In C++ it's undefined behaviour.
- A **race condition** is the broader logic bug. You can have one with no data race at all: **check-then-act** code like `if (!map.containsKey(k)) map.put(k, v)` races even on a thread-safe map, because another thread can insert between the check and the put. Use one atomic operation instead (`putIfAbsent`, `computeIfAbsent`, `dict.setdefault`). The same bug across processes, such as "check the username is free, then insert", needs a database constraint (see [Transactions & isolation](/learn/transactions)).

## Locks and atomics

A **mutex** (mutual exclusion lock) lets one thread at a time hold it; others block until it's released, and only the owner may release it. Always release on every path, including exceptions: Python's `with lock:`, Java's `synchronized` block or `lock()` with `try/finally`, C++'s `lock_guard` or `scoped_lock`.

- **Reentrant** locks can be taken again by the thread that already holds them: Java's `synchronized` and `ReentrantLock` are reentrant, while Python's `Lock` and C++'s `std::mutex` are not (use `RLock` or `recursive_mutex`, though needing one is often a design smell).
- **Read-write locks** (`ReentrantReadWriteLock`, `std::shared_mutex`) allow many readers or one writer. They help only when reads dominate and critical sections are long.

**Atomics** are variables whose operations the hardware performs indivisibly: `AtomicInteger`, `std::atomic<int>`. The building block is **compare-and-swap** (CAS): "set the value to `new` only if it's still `expected`", which reports whether it worked. Lock-free algorithms retry CAS in a loop. Atomics are great for counters, flags and single references; they don't make two separate variables change together, which still needs a lock.

| Tool | Use it for | Watch out for |
|---|---|---|
| Mutex | Protecting an invariant over several fields | Holding it during I/O or while calling unknown code |
| Read-write lock | Read-heavy data with longer reads | Writer starvation, extra overhead for short sections |
| Atomic | One counter, flag or pointer | Combining two atomics is not atomic |
| Concurrent collection | Shared maps and queues (`ConcurrentHashMap`, `queue.Queue`) | Check-then-act across two calls |

Keep critical sections short, and never hold a lock while doing a network call or calling back into code you don't control.

## Deadlock

A **deadlock** is a set of threads each waiting for a lock another one holds, so none can proceed. A bank transfer that locks the source account and then the destination deadlocks when two transfers go in opposite directions:

```text
Thread 1: transfer(alice, bob)        Thread 2: transfer(bob, alice)
  lock(alice)                           lock(bob)
  lock(bob)     <- waits for thread 2   lock(alice)   <- waits for thread 1
```

```diagram
{"type":"graph","nodes":["T1","alice","T2","bob"],"edges":[["T1","bob","waits for"],["bob","T2","held by"],["T2","alice","waits for"],["alice","T1","held by"]],"directed":true,"highlight":["T1","T2"],"caption":"The wait-for graph has a cycle: T1 waits for bob's lock, held by T2, which waits for alice's lock, held by T1."}
```

Deadlock needs all four **Coffman conditions** at once, so breaking any one prevents it:

| Condition | Meaning | How to break it |
|---|---|---|
| Mutual exclusion | Resources can't be shared | Use lock-free structures or immutable data |
| Hold and wait | A thread holds one lock while waiting for another | Acquire all locks at once (`std::scoped_lock(a, b)`) |
| No preemption | Locks can't be taken away | `tryLock` with a timeout, then release everything and retry |
| Circular wait | A cycle of waiting threads | **Lock ordering**: always acquire locks in one global order |

**Lock ordering** is the standard answer: lock the two accounts in order of account ID, whichever direction the money goes, and a cycle can't form. In production, a deadlock looks like a process using no CPU and making no progress; a thread dump (`jstack`, `py-spy dump`, `gdb`) shows each thread's stack and which lock it waits on.

## Livelock and starvation

In a **livelock**, threads aren't blocked but still make no progress, because each keeps reacting to the other: two threads that both `tryLock`, fail, back off and retry in lockstep, forever (like two people stepping aside in a corridor the same way). Adding **random jitter** to the backoff breaks the symmetry.

**Starvation** is when one thread never gets its turn: an unfair lock keeps going to others, a steady stream of readers keeps a writer out, or a low-priority thread never gets scheduled. Fair locks (`new ReentrantLock(true)`) and bounded waiting fix it at some cost to throughput. A cousin is **priority inversion**: a high-priority thread waits on a lock held by a low-priority thread that can't run.

### Priority inversion: inheritance and ceilings

The dangerous form of inversion needs three threads. Low-priority **L** takes a lock; high-priority **H** wakes and blocks on that lock; then medium-priority **M**, which doesn't need the lock at all, becomes runnable and preempts L. Now H, the most urgent thread, waits for M, for as long as M likes:

```text
step        1        2           3             4 ...
L       lock(r)   (preempted by M, can't release r)
H                 lock(r) blocks
M                            runs, runs, runs ...      H is stuck behind M
```

This is the 1997 Mars Pathfinder bug: a long-running medium-priority task kept a low-priority task from releasing a shared bus lock, a watchdog saw the high-priority task miss its deadline, and the lander kept resetting. It shows up in interviews on real-time and embedded systems, and as the follow-up to "what's priority inversion?". Two standard fixes:

- **Priority inheritance**: while H waits on a lock, the lock's holder L temporarily runs at H's priority. M can no longer preempt L, so L finishes its critical section, releases the lock, drops back to its own priority, and H runs. Inheritance is transitive: if L is itself waiting on a lock held by another thread, that thread inherits too. Pathfinder was fixed by turning this option on for the mutex, by a patch uploaded from Earth.
- **Priority ceiling**: each lock gets a **ceiling**, the highest priority of any thread that will ever take it. A thread holding the lock runs at the ceiling from the moment it acquires it (the "immediate ceiling" variant), so no thread that might want the lock can preempt it. It needs every lock's users known in advance, which real-time systems have, and in return it bounds H's wait to at most one lower-priority critical section and prevents deadlock among those locks.

| | Priority inheritance | Priority ceiling |
|---|---|---|
| Priority raised | Only when a higher-priority thread actually blocks | Every time the lock is taken |
| Needs to know lock users ahead | No | Yes, to set each ceiling |
| Worst-case wait for H | Can chain through several locks | At most one lower-priority critical section |
| Prevents deadlock | No | Yes (original protocol) |
| POSIX | `PTHREAD_PRIO_INHERIT` | `PTHREAD_PRIO_PROTECT` plus `pthread_mutexattr_setprioceiling` |

```cpp
pthread_mutexattr_t attr;
pthread_mutexattr_init(&attr);
// holder inherits priority of highest waiter
pthread_mutexattr_setprotocol(&attr, PTHREAD_PRIO_INHERIT);
pthread_mutex_t lock;
pthread_mutex_init(&lock, &attr);

pthread_mutexattr_t ceilAttr;
pthread_mutexattr_init(&ceilAttr);
// holder runs at priority 50 while it holds lock
pthread_mutexattr_setprotocol(&ceilAttr, PTHREAD_PRIO_PROTECT);
pthread_mutexattr_setprioceiling(&ceilAttr, 50);
pthread_mutex_t ceilLock;
pthread_mutex_init(&ceilLock, &ceilAttr);
```

The pitfall is assuming these come for free. Default mutexes in POSIX and most languages use neither protocol (Linux implements inheritance in its PI futexes, and the PREEMPT_RT kernel uses it for kernel locks); semaphores and condition variables have no owner, so there's nobody to boost; and priorities only mean something under a real-time scheduling policy such as `SCHED_FIFO`. The cheapest defence is design: keep critical sections short and avoid sharing locks between threads of very different priorities.

## Condition variables and semaphores

A lock says "one at a time"; sometimes you need "wait until something is true", such as "until the queue isn't empty".

A **condition variable** lets a thread sleep until another thread signals it. `wait()` atomically releases the mutex and sleeps; when woken, it reacquires the mutex before returning. The rules:

- Always hold the mutex when checking the condition and when waiting.
- **Wait in a loop**, re-checking the condition: wake-ups can be spurious, and another thread may have consumed the item first.
- Signal after changing the state. Use `notify_all` / `notifyAll` when different waiters wait for different conditions.

A **semaphore** holds a number of permits. `acquire` takes one, blocking while there are none; `release` returns one. With N permits it caps concurrency ("at most 10 calls to this API at once"); with 0 initial permits it works as a signal. Unlike a mutex, any thread may release it. Python has `threading.Semaphore` and `asyncio.Semaphore`, Java `java.util.concurrent.Semaphore`, and C++20 `std::counting_semaphore`.

## Producer-consumer

Many concurrent programs are **producer-consumer** pipelines: some threads create work, others process it, and a **bounded queue** sits between them. The bound matters: when consumers fall behind, producers block instead of filling memory. This is **backpressure**.

```diagram
{"type":"flow","nodes":[{"id":"p1","label":"Producer 1","kind":"service","col":0,"row":0},{"id":"p2","label":"Producer 2","kind":"service","col":0,"row":1},{"id":"q","label":"Bounded queue","sub":"capacity 10","kind":"queue","col":2,"row":0.5,"highlight":true},{"id":"c1","label":"Consumer 1","kind":"service","col":4,"row":0},{"id":"c2","label":"Consumer 2","kind":"service","col":4,"row":1}],"edges":[{"from":"p1","to":"q","label":"put: blocks if full"},{"from":"p2","to":"q"},{"from":"q","to":"c1","label":"take: blocks if empty"},{"from":"q","to":"c2"}]}
```

Python and Java ship blocking queues; in C++ you build one from a mutex and two condition variables, which is a common interview exercise:

```python
import queue, threading

q = queue.Queue(maxsize=10)          # bounded: put() blocks when full, get() when empty
DONE = object()                      # sentinel that tells the consumer to stop

def producer():
    for i in range(100):
        q.put(i)
    q.put(DONE)

def consumer(results):
    while (item := q.get()) is not DONE:
        results.append(item * item)

results = []
threads = [threading.Thread(target=producer), threading.Thread(target=consumer, args=(results,))]
for t in threads: t.start()
for t in threads: t.join()
print(sum(results))                  # 328350
```

```java
BlockingQueue<Integer> q = new ArrayBlockingQueue<>(10);  // put() blocks when full
final int DONE = -1;                                      // sentinel
long[] sum = {0};
Thread producer = new Thread(() -> {
    try {
        for (int i = 0; i < 100; i++) q.put(i);
        q.put(DONE);
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
Thread consumer = new Thread(() -> {
    try {
        for (int item; (item = q.take()) != DONE; ) sum[0] += (long) item * item;
    } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
producer.start(); consumer.start();
producer.join(); consumer.join();
System.out.println(sum[0]);                               // 328350
```

```cpp
class BoundedQueue {
    queue<int> items;
    size_t capacity;
    mutex m;
    condition_variable notFull, notEmpty;
public:
    explicit BoundedQueue(size_t cap) : capacity(cap) {}
    void put(int x) {
        unique_lock<mutex> lock(m);
        notFull.wait(lock, [&] { return items.size() < capacity; });  // re-checks after every wake-up
        items.push(x);
        notEmpty.notify_one();
    }
    int take() {
        unique_lock<mutex> lock(m);
        notEmpty.wait(lock, [&] { return !items.empty(); });
        int x = items.front(); items.pop();
        notFull.notify_one();
        return x;
    }
};

int main() {
    BoundedQueue q(10);
    const int DONE = -1;                       // sentinel
    long long sum = 0;
    thread producer([&] { for (int i = 0; i < 100; i++) q.put(i); q.put(DONE); });
    thread consumer([&] { for (int x; (x = q.take()) != DONE; ) sum += (long long)x * x; });
    producer.join(); consumer.join();
    cout << sum << "\n";                       // 328350
}
```

With several consumers, send one sentinel per consumer (or close the queue). The same shape, scaled up across machines, is a message queue (see [System design basics](/learn/system-design)).

## Thread pools

Creating a thread per task is wasteful: each thread costs a stack (often reserving 1 to 8 MB of virtual memory), kernel bookkeeping and creation time, and ten thousand threads spend more time switching than working. A **thread pool** keeps a fixed set of worker threads that take tasks from a queue: `ThreadPoolExecutor` in Java and Python's `concurrent.futures`. Submitting a task returns a **future** you can wait on for the result.

Sizing and pitfalls:

- **CPU-bound** work: about one thread per core; more only adds switching.
- **I/O-bound** work: more threads, roughly `cores × (1 + wait time / compute time)`, or use async I/O instead.
- **Bound the queue.** Java's `Executors.newFixedThreadPool` uses an unbounded queue, so a slow consumer grows memory until the process dies. Pick a rejection policy for when it's full.
- **Don't wait on a task from inside the same pool.** If every worker blocks waiting for subtasks that are stuck behind them in the queue, the pool deadlocks.
- Exceptions thrown in a task are stored in its future; if nobody calls `get()`, they disappear silently.

Java 21's **virtual threads** change the picture for I/O-bound servers: they're scheduled by the JVM onto a few OS threads, so a million blocked virtual threads are cheap. Create one per task rather than pooling them.

### Goroutines and M:N scheduling

How a language maps its threads onto OS threads decides how many you can afford:

| Model | Mapping | Examples | Trade-off |
|---|---|---|---|
| 1:1 | each language thread is one OS thread | Java platform threads, `std::thread`, Python `threading` | simple and uses every core, but each thread costs a fixed stack and kernel switches |
| M:1 | many **green threads** on one OS thread | early Java, Python greenlets (gevent) | cheap, but only one core, and one blocking call stalls them all |
| M:N | M lightweight tasks multiplexed onto N OS threads, N ≈ cores | Go goroutines, Java 21 virtual threads, Erlang processes | cheap *and* parallel; the runtime has to handle blocking calls |

**Goroutines** are Go's M:N tasks, started with `go f()`. A server can run hundreds of thousands of them because:

- **Small, growable stacks.** A goroutine starts with a 2 KB stack instead of the megabytes an OS thread reserves. Each function call checks for room; when the stack runs out, the runtime allocates one twice the size and copies the frames over, and the garbage collector shrinks stacks that are mostly unused. 100,000 idle goroutines take a few hundred MB at most.
- **Switches in user space.** Switching goroutines saves a few registers inside the runtime, with no system call, so it's far cheaper than an OS [context switch](/learn/os-memory#system-calls-and-context-switches).
- **The scheduler.** Go's runtime has `GOMAXPROCS` logical processors (default: the number of CPU cores), each with a run queue of goroutines, and an OS thread runs goroutines from one processor's queue. An idle processor **steals work** from another's queue.
- **Blocking is handled for you.** A goroutine waiting on the network is parked and its socket handed to the runtime's poller (`epoll`, `kqueue`), so the thread runs other goroutines. A blocking system call (file I/O, C code) ties up its thread, so the runtime moves the processor and its queue to another thread. Since Go 1.14, a goroutine stuck in a tight loop can be preempted, so it can't starve the others.

Java's **virtual threads** work the same way: the JVM mounts a virtual thread on a carrier thread (a small pool, one per core) and unmounts it when it blocks on I/O, saving its stack frames on the heap. The Java 21 catch is **pinning**: blocking while inside a `synchronized` block keeps the carrier thread occupied. Java 24 fixed this; on 21, prefer `ReentrantLock` around blocking calls.

In interviews this comes up as "how do you serve 100,000 concurrent connections?". One goroutine or virtual thread per connection, written as plain blocking code, is a good answer; [async/await](/learn/concurrency#async-await-and-event-loops) reaches the same scale by making every wait an explicit `await`. The pitfalls:

- **Cheap isn't free.** Spawning one task per incoming item without a limit still runs out of memory or overwhelms a database. Bound the concurrency with a semaphore or a worker pool.
- **Goroutine leaks.** A goroutine blocked forever on a channel nobody writes to is never collected. Give every goroutine a way to finish (close the channel, cancel a `context`).
- **Races are still races.** M:N tasks run in parallel on several OS threads, so shared state needs locks or channels (`go test -race` finds many races).
- **CPU-bound work** gains nothing past the number of cores.

## Async/await and event loops

An **event loop** runs many tasks on a single thread. Each task runs until it reaches an `await` on something that isn't ready (a socket read, a timer), then hands control back to the loop, which resumes another task whose I/O has completed. The OS tells the loop which sockets are ready (`epoll` on Linux, `kqueue` on macOS, IOCP on Windows). JavaScript (browsers and Node.js) is built on this model; Python has `asyncio`, and C#, Rust and Kotlin have their own versions.

```diagram
{"type":"grid","cells":[["run","await db","await db","run","",""],["","run","await http","await http","run",""],["","","run","await timer","await timer","run"]],"rowLabels":["task A","task B","task C"],"colLabels":["t1","t2","t3","t4","t5","t6"],"highlight":[[0,0],[1,1],[2,2],[0,3],[1,4],[2,5]],"caption":"One thread, three tasks: exactly one runs at a time, and every switch happens at an await while the others wait on I/O."}
```

| | Threads | async/await |
|---|---|---|
| Switching | Preemptive: the OS can switch anywhere | Cooperative: only at `await` |
| Cost per task | A stack and a kernel thread | A small heap object |
| Good for | CPU work on several cores, blocking libraries | Thousands of concurrent network waits |
| Typical bug | Data races on shared state | A blocking call that freezes every task |

The async pitfalls:

- **One blocking call stalls everything.** `time.sleep`, a synchronous HTTP client or a heavy computation inside a coroutine freezes the whole loop. Use the async version (`await asyncio.sleep`), or push the work to a thread or process pool (`asyncio.to_thread`).
- **Forgetting `await`** creates a coroutine that never runs (Python warns), or a promise whose error nobody sees (JavaScript).
- **Races still exist.** No two lines run at the same instant, but state can change across an `await`: read a balance, `await` a network call, write the balance back, and another task may have changed it in between.

## Python's GIL

CPython (the standard Python interpreter) has a **global interpreter lock** (the **GIL**): only one thread executes Python bytecode at a time. The GIL is released while a thread waits for I/O and inside many C extensions (NumPy, compression, hashing large buffers).

- **I/O-bound threads work fine**: while one thread waits on the network, another runs.
- **CPU-bound pure-Python threads don't speed up.** Use `multiprocessing` or `ProcessPoolExecutor` (separate processes, each with its own GIL), or move the hot loop into native code.
- **The GIL does not make your code thread-safe.** It protects the interpreter's internals, not your invariants. `count += 1` is several bytecodes, and a switch can happen between them, so you still need locks.

A **free-threaded** CPython build without the GIL exists (PEP 703): experimental in 3.13 and officially supported from 3.14, but a separate, optional build rather than the default. Code that relied on the GIL to hide races breaks there.

## Memory visibility

Even with no lost updates, one thread may simply *not see* another's write. Compilers keep values in registers and reorder instructions, CPUs reorder memory operations, and each core has its own caches. Without synchronisation, nothing promises that a write ever becomes visible to another thread, or in what order.

The fix is the same in every language: a flag shared between threads must be a synchronised type.

```python
import threading, time

stop = threading.Event()               # a thread-safe flag

def worker():
    spins = 0
    while not stop.is_set():
        spins += 1
    print("worker stopped")

t = threading.Thread(target=worker)
t.start()
time.sleep(0.1)
stop.set()                             # the worker is guaranteed to see this
t.join()
```

```java
public class Stop {
    private static volatile boolean stopped = false;  // without volatile, the loop may never see the write

    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            long spins = 0;
            while (!stopped) spins++;
            System.out.println("worker stopped");
        });
        worker.start();
        Thread.sleep(100);
        stopped = true;                               // visible to the worker's next read
        worker.join();
    }
}
```

```cpp
atomic<bool> stopped{false};           // a plain bool here would be a data race: undefined behaviour

int main() {
    thread worker([] {
        long spins = 0;
        while (!stopped.load()) spins++;
        cout << "worker stopped\n";
    });
    this_thread::sleep_for(chrono::milliseconds(100));
    stopped.store(true);               // visible to the worker's next load
    worker.join();
}
```

Remove `volatile` from the Java version and it typically spins forever: the JIT compiler hoists the read out of the loop.

**Java** defines visibility with **happens-before** rules. If action A happens-before B, B sees A's effects. The main edges: unlocking a monitor happens-before every later lock of it; a `volatile` write happens-before every later read of that field; `Thread.start()` happens-before the new thread's actions; a thread's actions happen-before another thread returns from `join()` on it. `volatile` gives visibility and ordering but **not atomicity**: `volatile int count; count++` still loses updates. It's also why double-checked locking needs a `volatile` field.

**C++** makes any data race on a non-atomic variable undefined behaviour. `std::atomic` operations default to `memory_order_seq_cst`, the easiest model to reason about; weaker orders (`acquire`, `release`, `relaxed`) are for experts. C++'s `volatile` is for memory-mapped hardware, not threads.

## Immutability and other strategies

The easiest shared state to get right is state that never changes. An **immutable** object can be read by any number of threads without locks: Java's `String` and records with final fields, Python's tuples and frozensets (as long as what they contain is also immutable), `const` objects in C++. To "change" one, build a new version and publish it with a single atomic reference swap.

| Strategy | Idea | Example |
|---|---|---|
| Immutability | Nothing to protect | Config objects, value types, persistent collections |
| Confinement | Only one thread ever touches the data | Per-thread buffers, `ThreadLocal`, one-owner actors |
| Message passing | Share by communicating, not by sharing memory | Queues between threads, Go channels, actors |
| Synchronisation | Guard shared mutable state | Locks, atomics, concurrent collections |

Prefer the strategies near the top of the table: every piece of shared mutable state is a place for a race.

## Interview questions and pitfalls

- *"Mutex vs semaphore?"* A mutex has one owner who must release it; a semaphore has N permits and anyone can release.
- *"How do you prevent deadlock?"* Global lock ordering, acquire-all-at-once, or `tryLock` with timeouts; and keep locks out of code paths that call other locked code.
- *"Is `volatile` enough for a counter?"* No: visibility without atomicity. Use `AtomicInteger` or a lock.
- *"Threads or async for 10,000 open connections?"* Async I/O (or virtual threads); OS threads per connection waste memory and switching time.
- *"Why didn't threads speed up my Python code?"* The GIL; use processes for CPU-bound work.
- Pitfalls: check-then-act, `if` instead of `while` around `wait()`, forgetting to release a lock on an exception, holding a lock during I/O, `sleep()` used to "fix" a race in tests, and unbounded queues.
