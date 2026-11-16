---
title: OOP & design patterns
summary: Encapsulation, composition over inheritance, polymorphism, SOLID, the design patterns that come up most, dependency injection, and how to work through an object-oriented design interview like a parking lot.
related: testing-debugging, language-gotchas, api-design, system-design
terms:
  - encapsulation #the-core-ideas
  - polymorphism #polymorphism
  - composition over inheritance #inheritance-vs-composition
  - abstract class #interfaces-vs-abstract-classes
  - SOLID #solid
  - Liskov substitution principle #liskov-substitution
  - design patterns #design-patterns
  - strategy pattern #strategy
  - observer pattern #observer
  - factory pattern #factory
  - builder pattern #builder
  - decorator pattern #decorator
  - singleton #singleton
  - dependency injection #dependency-injection
  - object-oriented design #the-object-oriented-design-interview
---

## The core ideas

Object-oriented programming bundles **data with the code that operates on it**, so each object is responsible for keeping its own state valid. Four ideas are usually listed:

- **Encapsulation**: hide internal state and expose operations that keep it consistent.
- **Abstraction**: callers depend on *what* an object does, not *how*.
- **Inheritance**: a class reuses and extends another class's code and type.
- **Polymorphism**: one interface, many implementations, chosen at runtime.

**Encapsulation** is the one that pays off daily. A `BankAccount` with a private `balance` and a `withdraw(amount)` method that refuses to overdraw can never end up negative, however much code uses it. A public `balance` field, or a `setBalance` setter, lets any caller break that rule. Generating a getter and setter for every field is not encapsulation; exposing *behaviour* ("withdraw", "close account") instead of raw data is. A handy slogan is **tell, don't ask**: tell an object what to do rather than pulling its data out and deciding for it.

### Polymorphism

**Polymorphism** lets code written against a general type work with any specific type. Three kinds:

| Kind | How it works | Example |
|---|---|---|
| Subtype (dynamic dispatch) | The method that runs is chosen by the object's runtime class | `shape.area()` on a `Circle` or a `Square` |
| Parametric | Code is written once for any type | Java generics `List<T>`, C++ templates |
| Ad hoc (overloading) | Different functions share a name; chosen at compile time by argument types | `print(int)` vs `print(String)` |

Language details that trip people up: in Java every non-static, non-private, non-final method can be overridden; in C++ only `virtual` methods dispatch dynamically (mark overrides with `override` so the compiler checks them, and give polymorphic base classes a virtual destructor); in Python everything is dynamic, and **duck typing** means any object with the right methods works, inheritance or not. Overloads in Java and C++ are chosen by the *static* type of the argument, not its runtime type.

## Inheritance vs composition

**Inheritance** models an *is-a* relationship: a `SavingsAccount` is a `BankAccount`. The subclass gets the parent's code and can be used wherever the parent is expected. **Composition** models *has-a*: a `Car` has an `Engine` and delegates to it.

Inheritance is the tighter coupling of the two. A subclass depends on its parent's implementation details, not just its public contract, so harmless-looking changes to the parent can break it (the **fragile base class** problem). The textbook example: a `HashSet` subclass that counts insertions by overriding both `add` and `addAll` double-counts, because `HashSet.addAll` happens to call `add` internally. Hierarchies also explode when features combine: `EmailNotifier`, `SmsNotifier`, `LoggingEmailNotifier`, `RetryingLoggingSmsNotifier`…

| | Inheritance | Composition |
|---|---|---|
| Relationship | is-a | has-a / uses-a |
| Coupling | To the parent's implementation | Only to the part's interface |
| Change behaviour at runtime | No: fixed at compile time | Yes: swap the part |
| Combining features | One class per combination | Mix and match parts |
| Good for | True subtypes, frameworks designed for extension | Most code reuse |

Hence the classic advice: **favour composition over inheritance**. Inherit when the subclass really is a substitutable kind of the parent (see Liskov below) or a framework was designed to be extended that way; otherwise hold a reference to a collaborator and delegate.

## Interfaces vs abstract classes

Both define a type that other classes implement; they differ in what they can carry.

| | Interface | Abstract class |
|---|---|---|
| Purpose | A capability or contract (`Comparable`, `Runnable`) | A partial implementation shared by related classes |
| State | No instance fields (Java allows only constants) | Fields and constructors |
| Method bodies | Java 8+ allows `default` and `static` methods | Any mix of abstract and concrete methods |
| How many per class | Many | One (Java has single class inheritance) |

**C++** has no `interface` keyword: a class whose methods are all pure virtual (`virtual double area() const = 0;`) plays that role, and multiple inheritance is allowed. **Python** uses `abc.ABC` with `@abstractmethod` (the class can't be instantiated until every abstract method is implemented), or `typing.Protocol` for structural typing, where a type checker accepts any class with matching methods.

Rule of thumb: start with an interface; add an abstract base class only when several implementations genuinely share code and state.

## SOLID

**SOLID** is five design principles for keeping classes easy to change. They're guidelines, not laws, and interviews usually want one sentence and one example for each.

| Principle | Rule | Smell | Fix |
|---|---|---|---|
| **S**ingle responsibility | A class has one reason to change | `Invoice` computes totals, renders a PDF and emails it | Split into `Invoice`, `InvoiceRenderer`, `InvoiceMailer` |
| **O**pen/closed | Open for extension, closed for modification | A `switch (type)` on fee rules, repeated in five places | One `FeeStrategy` class per rule; new rule = new class |
| **L**iskov substitution | Subtypes work anywhere the base type does | `Square extends Rectangle` breaks `setWidth` | Don't make it a subtype; share an interface instead |
| **I**nterface segregation | Clients don't depend on methods they don't use | `Machine` with `print`, `scan`, `fax`; a basic printer throws on `fax` | Separate `Printer`, `Scanner`, `Fax` interfaces |
| **D**ependency inversion | Depend on abstractions, not concrete classes | `OrderService` does `new StripeClient()` | Depend on a `PaymentGateway` interface; inject the implementation |

### Single responsibility

"Reason to change" means a person or team who might ask for a change. If finance changes the tax rules and marketing changes the email template, and both edits land in the same class, they'll collide and break each other.

### Open/closed

When adding a payment method means editing a long `if/else` chain in tested code, every addition risks the old cases. With polymorphism, the new case is a new class and the old code stays untouched. The strategy example below is exactly this.

### Liskov substitution

The **Liskov substitution principle** says code written for a base type must keep working when handed any subtype. Mathematically a square *is* a rectangle, but if `Rectangle` has `setWidth` and `setHeight`, a `Square` that keeps its sides equal breaks this caller:

```text
void stretch(Rectangle r) { r.setWidth(5); r.setHeight(4); assert r.area() == 20; }   // a Square gives 16
```

A subtype may not demand more from callers (stronger preconditions) or promise less (weaker postconditions). Java's unmodifiable lists, which implement `List` but throw on `add`, are a well-known compromise of this principle.

### Interface segregation

Small, focused interfaces mean implementers don't stub out methods with "not supported" and callers don't depend on things they never call. It's single responsibility applied to interfaces.

### Dependency inversion

High-level policy (take an order, charge it, ship it) shouldn't depend on low-level details (one particular payment provider's SDK). Both depend on an abstraction, `PaymentGateway`, owned by the high-level code. This is what makes dependency injection (below) and fast unit tests possible.

## Design patterns

A **design pattern** is a named, reusable solution to a recurring design problem. The names matter as much as the code: "put a decorator around it" communicates a whole design in five words. The classic catalogue (the "Gang of Four" book, 1994) groups them as creational, structural and behavioural.

| Pattern | Kind | Problem it solves | Everyday example |
|---|---|---|---|
| Strategy | Behavioural | Swap an algorithm at runtime | `Comparator` passed to `sort` |
| Observer | Behavioural | Notify many listeners of an event | UI event listeners, webhooks |
| Factory | Creational | Hide which concrete class gets created | `List.of(…)`, `Integer.valueOf` |
| Builder | Creational | Construct objects with many optional parts | `HttpRequest.newBuilder()` |
| Decorator | Structural | Add behaviour by wrapping, same interface | `BufferedReader` around a `Reader` |
| Adapter | Structural | Make an existing class fit an expected interface | `Arrays.asList` over an array |
| Singleton | Creational | Exactly one instance, globally reachable | A process-wide config (often a smell) |

Others worth recognising: **State** (an object changes behaviour with its state: vending machines, elevators), **Template method** (a base class fixes an algorithm's steps and subclasses fill some in), **Command** (an action as an object, enabling undo and queues) and **Iterator**.

### Strategy

The **strategy pattern** defines a family of interchangeable algorithms behind one interface and lets the caller pick one. Here the checkout doesn't know or care how parking fees are calculated:

```diagram
{"type":"flow","nodes":[{"id":"checkout","label":"Checkout","sub":"charge(minutes)","kind":"service","col":0,"row":0.5},{"id":"fee","label":"FeeStrategy","sub":"interface: fee(minutes)","kind":"box","col":2,"row":0.5,"highlight":true},{"id":"hourly","label":"HourlyFee","kind":"box","col":4,"row":0},{"id":"flat","label":"FlatFee","kind":"box","col":4,"row":1}],"edges":[{"from":"checkout","to":"fee","label":"has a"},{"from":"hourly","to":"fee","label":"implements"},{"from":"flat","to":"fee","label":"implements"}]}
```

```python
from abc import ABC, abstractmethod

class FeeStrategy(ABC):
    @abstractmethod
    def fee(self, minutes: int) -> int: ...          # price in cents

class HourlyFee(FeeStrategy):
    def __init__(self, cents_per_hour: int):
        self.rate = cents_per_hour

    def fee(self, minutes: int) -> int:
        return (minutes + 59) // 60 * self.rate       # every started hour counts

class FlatFee(FeeStrategy):
    def __init__(self, cents: int):
        self.cents = cents

    def fee(self, minutes: int) -> int:
        return self.cents

class Checkout:
    def __init__(self, strategy: FeeStrategy):       # injected: Checkout doesn't know which one
        self.strategy = strategy

    def charge(self, minutes: int) -> int:
        return self.strategy.fee(minutes)

print(Checkout(HourlyFee(250)).charge(90))   # 500
print(Checkout(FlatFee(1000)).charge(90))    # 1000
```

```java
interface FeeStrategy {
    int fee(int minutes);                             // price in cents
}

class HourlyFee implements FeeStrategy {
    private final int rate;
    HourlyFee(int centsPerHour) { this.rate = centsPerHour; }
    public int fee(int minutes) { return (minutes + 59) / 60 * rate; }  // every started hour counts
}

class FlatFee implements FeeStrategy {
    private final int cents;
    FlatFee(int cents) { this.cents = cents; }
    public int fee(int minutes) { return cents; }
}

class Checkout {
    private final FeeStrategy strategy;
    Checkout(FeeStrategy strategy) { this.strategy = strategy; }  // injected
    int charge(int minutes) { return strategy.fee(minutes); }
}

// new Checkout(new HourlyFee(250)).charge(90)  -> 500
// new Checkout(new FlatFee(1000)).charge(90)   -> 1000
// new Checkout(m -> 0).charge(90)              -> 0: a lambda is a strategy too
```

```cpp
struct FeeStrategy {
    virtual ~FeeStrategy() = default;                 // deleting through a base pointer needs this
    virtual int fee(int minutes) const = 0;           // price in cents
};

struct HourlyFee : FeeStrategy {
    int rate;
    explicit HourlyFee(int centsPerHour) : rate(centsPerHour) {}
    int fee(int minutes) const override { return (minutes + 59) / 60 * rate; }
};

struct FlatFee : FeeStrategy {
    int cents;
    explicit FlatFee(int c) : cents(c) {}
    int fee(int) const override { return cents; }
};

class Checkout {
    unique_ptr<FeeStrategy> strategy;
public:
    explicit Checkout(unique_ptr<FeeStrategy> s) : strategy(move(s)) {}  // injected
    int charge(int minutes) const { return strategy->fee(minutes); }
};

// Checkout(make_unique<HourlyFee>(250)).charge(90)  -> 500
// Checkout(make_unique<FlatFee>(1000)).charge(90)   -> 1000
```

In languages with first-class functions, a strategy is often just a function (`sorted(items, key=…)`, a Java lambda, a C++ `std::function`). Reach for the class version when the strategy has configuration or several methods.

### Observer

In the **observer pattern**, a subject keeps a list of listeners and notifies each one when something happens, without knowing what they do. Placing an order can trigger an email, an analytics event and a stock update while `OrderService` knows only a `listener.onOrderPlaced(order)` method.

```diagram
{"type":"flow","nodes":[{"id":"orders","label":"OrderService","sub":"subject","kind":"service","col":0,"row":1},{"id":"email","label":"EmailSender","kind":"box","col":2,"row":0},{"id":"stats","label":"Analytics","kind":"box","col":2,"row":1},{"id":"stock","label":"Inventory","kind":"box","col":2,"row":2}],"edges":[{"from":"orders","to":"email","label":"onOrderPlaced"},{"from":"orders","to":"stats","label":"onOrderPlaced"},{"from":"orders","to":"stock","label":"onOrderPlaced"}],"caption":"Listeners subscribe to the subject; adding a fourth reaction to an order doesn't touch OrderService."}
```

Pitfalls: listeners that are never unsubscribed keep objects alive (a classic memory leak), one slow or throwing listener can block the rest, and notification order is easy to depend on by accident. Across services the same idea becomes publish-subscribe messaging.

### Factory

A **factory** decides which concrete class to create, so callers depend only on the interface: `Notifier.forChannel("sms")` returns an `SmsNotifier`. **Static factory methods** (`List.of`, `Integer.valueOf`, `Optional.empty`) can have descriptive names, return cached instances or a subtype, which constructors can't. An *abstract factory* creates whole families of related objects (all the widgets for one UI theme).

### Builder

A **builder** assembles an object step by step, which beats a constructor with ten parameters, half of them optional and several of the same type:

```text
HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("https://api.example.com/orders"))
    .header("Accept", "application/json")
    .timeout(Duration.ofSeconds(5))
    .GET()
    .build();                 // validates once, returns an immutable object
```

Python rarely needs builders, because keyword arguments with defaults (and `dataclasses`) solve the same problem.

### Decorator

A **decorator** wraps an object in another object with the *same interface* that adds behaviour before or after delegating. Because each wrapper is also a `PriceSource`, they stack in any order, which is how you add caching, retries, logging or metrics without touching the original class.

```diagram
{"type":"flow","nodes":[{"id":"client","label":"Caller","kind":"client","col":0},{"id":"retry","label":"RetryingPriceSource","kind":"box","col":1},{"id":"cache","label":"CachingPriceSource","kind":"box","col":2},{"id":"http","label":"HttpPriceSource","sub":"the real work","kind":"service","col":3,"highlight":true}],"edges":[{"from":"client","to":"retry","label":"getPrice"},{"from":"retry","to":"cache","label":"getPrice"},{"from":"cache","to":"http","label":"on a miss"}],"caption":"Every box implements PriceSource, so the caller can't tell how many wrappers there are."}
```

Java's I/O classes are built this way: `new BufferedReader(new InputStreamReader(new FileInputStream(path)))`. Python's `@decorator` syntax applies the same idea to functions.

### Adapter

An **adapter** converts one interface into the one the caller expects. Wrap a third-party payment SDK in a `StripePaymentGateway implements PaymentGateway` and the rest of the code never sees the SDK's types; switching providers means writing one new adapter. Decorator keeps the interface and adds behaviour; adapter changes the interface and keeps the behaviour.

### Singleton

A **singleton** guarantees one instance of a class with a global access point (`Config.getInstance()`). It's the most criticised pattern, because it's really a global variable:

- **Hidden dependencies**: a method's signature doesn't reveal that it reads the singleton.
- **Hard to test**: tests can't substitute a fake, and state leaks from one test to the next.
- **Concurrency**: lazy initialisation needs care (in Java, double-checked locking requires a `volatile` field; an `enum` singleton or a static holder class is simpler).

Usually the better design is to create one instance at startup and pass it to whoever needs it. "Only one instance in this application" is then a wiring decision, not something baked into the class. Dependency injection containers call this *singleton scope*.

## Dependency injection

**Dependency injection** (DI) means an object receives its collaborators from outside instead of creating or looking them up itself. `Checkout` above takes its `FeeStrategy` as a constructor argument rather than calling `new HourlyFee(250)` internally.

- **Constructor injection** is the default: dependencies are explicit in the signature, can be `final`, and the object is never half-built.
- All the wiring happens in one place at startup (the **composition root**), typically `main` or the framework's configuration.
- **Containers** such as Spring, Guice and Dagger automate the wiring for large applications; small programs do fine wiring by hand.

The payoff is flexibility and testability: production code passes a real `StripePaymentGateway`, tests pass a fake that records charges, and swapping providers touches one line. The cost is indirection: it's harder to see what actually runs, especially with container "magic". See [Testing & debugging](/learn/testing-debugging) for how DI makes test doubles possible.

## The object-oriented design interview

An **object-oriented design** (OOD) interview asks you to model a system in classes: a parking lot, an elevator, a library, a vending machine, a chess game. There's no single right answer; interviewers watch how you structure the problem. A reliable process:

1. **Clarify requirements and scope.** Ask questions and write down the use cases you'll support. Explicitly park the rest.
2. **Find the core objects.** Nouns in the requirements suggest classes; verbs suggest methods. Give each class one clear responsibility.
3. **Define relationships**: has-a, is-a, uses. Sketch a class diagram.
4. **Write key method signatures** and walk through each main use case against the design.
5. **Use patterns where they solve a real problem** (strategy for pricing rules, state for an elevator), not to show off.
6. **Discuss extensibility, concurrency and testing**: what changes if a new vehicle type arrives, two cars race for one spot, or tests need to control time?

### Example: a parking lot

Requirements after clarifying: several levels; spots of three sizes (motorcycle, compact, large); a vehicle fits a spot of its size or bigger; entry issues a ticket; exit charges by duration, with pricing that may change; show free spots per level. Out of scope: reservations and monthly passes.

```diagram
{"type":"flow","nodes":[{"id":"gate","label":"Gate","sub":"entry / exit","kind":"client","col":0,"row":1},{"id":"lot","label":"ParkingLot","sub":"park(), leave()","kind":"service","col":1,"row":1,"highlight":true},{"id":"level","label":"Level","sub":"findFreeSpot(size)","kind":"box","col":2,"row":0},{"id":"assign","label":"SpotAssignmentStrategy","sub":"interface","kind":"box","col":2,"row":1},{"id":"fee","label":"FeeStrategy","sub":"interface","kind":"box","col":2,"row":2},{"id":"spot","label":"ParkingSpot","sub":"id, size, vehicle?","kind":"box","col":3,"row":0},{"id":"ticket","label":"Ticket","sub":"id, spot, entry time","kind":"box","col":3,"row":1},{"id":"pay","label":"PaymentGateway","sub":"adapter over provider","kind":"external","col":3,"row":2},{"id":"vehicle","label":"Vehicle","sub":"plate, size","kind":"box","col":4,"row":0}],"edges":[{"from":"gate","to":"lot","label":"park / leave"},{"from":"lot","to":"level","label":"has many"},{"from":"level","to":"spot","label":"has many"},{"from":"spot","to":"vehicle","label":"holds 0..1"},{"from":"lot","to":"assign","label":"uses"},{"from":"lot","to":"fee","label":"uses"},{"from":"lot","to":"ticket","label":"issues"},{"from":"ticket","to":"spot","dashed":true},{"from":"lot","to":"pay","label":"charges"}],"caption":"ParkingLot is the entry point; the rules that change (spot choice, pricing, payment provider) sit behind interfaces."}
```

```text
class ParkingLot
    park(vehicle) -> Ticket        # SpotAssignmentStrategy picks a spot; record the entry time
    leave(ticket) -> int           # free the spot, price it with FeeStrategy, charge via PaymentGateway
class Level          spots; findFreeSpot(size) -> ParkingSpot or none; freeCount(size)
class ParkingSpot    id, size, vehicle; isFree(), assign(vehicle), release()
class Vehicle        plate, size   # a size enum, not a subclass per vehicle type
class Ticket         id, vehicle, spot, entryTime
interface SpotAssignmentStrategy   find(levels, size) -> ParkingSpot or none
interface FeeStrategy              fee(size, minutes) -> cents
interface PaymentGateway           charge(cents, method)
```

Points worth saying out loud:

- **`Vehicle` has a size instead of `Car`/`Truck` subclasses**, because the subclasses would add no behaviour. Don't create inheritance for data.
- **Pricing and spot choice are strategies**, so "weekend rates" or "fill the ground floor first" are new classes, not edits (open/closed).
- **Concurrency**: two gates may assign the same spot. Make `assign` atomic (a lock per level, or a compare-and-set on the spot), or let a database unique constraint decide if the state lives there.
- **Testing**: inject a clock into `ParkingLot` so a test can "wait" three hours instantly.
- **Extension**: EV charging spots become a spot feature plus a strategy that prefers them for electric vehicles.

## Interview questions and pitfalls

- *"Composition or inheritance?"* Composition by default; inheritance for genuine, substitutable is-a relationships.
- *"Interface vs abstract class?"* Contract versus shared partial implementation; a class can implement many interfaces but extend one class.
- *"Explain Liskov with an example."* Square and Rectangle, or a read-only list that throws on `add`.
- *"Why is a singleton considered an anti-pattern?"* Global mutable state, hidden dependencies, hard to test; prefer one instance created at startup and injected.
- *"Decorator vs adapter?"* Same interface plus behaviour, versus a different interface with the same behaviour.
- Pitfalls: patterns for their own sake, interfaces with one implementation "just in case", deep hierarchies, god classes that do everything, getters and setters for every field, and jumping into code before clarifying requirements in an OOD interview.
