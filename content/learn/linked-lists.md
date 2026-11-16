---
title: Linked lists
summary: Nodes chained by pointers: costs compared with arrays, the dummy head, reversing, fast and slow pointers for middles and cycles, merging, and the hash map plus doubly linked list behind an LRU cache.
related: two-pointers, stacks-queues, caching, hashing, recursion-backtracking
terms:
  - linked list
  - linked lists
  - singly linked list #singly-and-doubly-linked
  - singly linked lists #singly-and-doubly-linked
  - doubly linked list #singly-and-doubly-linked
  - doubly linked lists #singly-and-doubly-linked
  - ListNode #what-a-linked-list-is
  - dummy head #the-dummy-head-node
  - dummy node #the-dummy-head-node
  - sentinel node #the-dummy-head-node
  - reverse a linked list #reversing-a-list
  - tortoise and hare #fast-and-slow-pointers
  - Floyd's cycle detection #fast-and-slow-pointers
  - merge two sorted lists #merging-two-sorted-lists
  - add two numbers #adding-two-numbers
  - reverse nodes in k-group #reversing-in-groups-of-k
  - intersection of two linked lists #intersection-of-two-lists
  - remove duplicates from sorted list #removing-duplicates-from-a-sorted-list
  - odd even linked list #odd-even-regrouping
---

## What a linked list is

A **linked list** is a chain of **nodes**. Each node holds a value and a pointer to the next node. You keep a reference to the first node, the **head**; the last node's `next` is `null`. Unlike an array, the nodes can live anywhere in memory, and the only way to reach the fifth node is to follow four pointers.

```diagram
{"type":"list","values":[1,2,3,4,5],"pointers":{"head":0},"caption":"A singly linked list 1 → 2 → 3 → 4 → 5. The last node's next pointer is null."}
```

Interview problems give you a node class like this one (LeetCode calls it `ListNode`):

```python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
```

```java
public class ListNode {
    // the payload stored in this node
    int val;
    // the following node, or null at the end of the list
    ListNode next;
    // constructor for a node with no successor yet
    ListNode(int val) { this.val = val; }
    // constructor that links straight to an existing next node
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
```

```cpp
struct ListNode {
    // the payload stored in this node
    int val;
    // the following node, or nullptr at the end of the list
    ListNode* next;
    // next defaults to nullptr, so a lone node ends the list
    ListNode(int v, ListNode* n = nullptr) : val(v), next(n) {}
};
```

An empty list is just `None` / `null` / `nullptr`, and walking a list is always the same loop: `while node: ...; node = node.next`.

### Singly and doubly linked

- A **singly linked list** has only `next` pointers. You can walk it forwards only.
- A **doubly linked list** also has a `prev` pointer in each node. You can walk both ways, and given a node you can unlink it in O(1), because you can reach its predecessor. The price is one more pointer per node and more pointers to keep consistent.

In the standard libraries, Java's `LinkedList` and C++'s `std::list` are doubly linked, and C++ also has the singly linked `std::forward_list`. Python has no linked list class (`collections.deque` is a list of fixed-size blocks, not a node per element), so you build your own when a problem calls for one.

## Costs compared with arrays

| Operation | Array (dynamic) | Singly linked list |
|---|---|---|
| Read or write the i-th element | **O(1)** | O(n): walk from the head |
| Insert or delete at the front | O(n): shift everything | **O(1)** |
| Insert or delete at the end | O(1) amortised | O(1) to insert with a tail pointer; O(n) to delete (you need the node before the tail) |
| Insert or delete next to a node you hold | O(n): shift | **O(1)**: relink two pointers |
| Search for a value | O(n) | O(n) |
| Extra memory | none per element | one pointer per node (two if doubly linked), plus allocation overhead |

The table makes linked lists look competitive, but in practice arrays usually win: their elements sit next to each other in memory, so the CPU cache loads many at once, while a linked list jumps around memory on every step. Linked lists earn their place when you hold references to nodes and need to remove or move them in O(1): LRU caches, the chains in a [hash table](/learn/hashing), free lists in memory allocators, and splicing whole lists together.

In interviews, though, linked list questions are about **pointer manipulation**: can you rewire nodes without losing any?

## The dummy head node

Many list operations need the node *before* the one you're changing. The head has no node before it, so code ends up with special cases: "if we're deleting the head…", "if the result list is still empty…".

A **dummy node** (also called a **sentinel node** or **dummy head**) is an extra node placed in front of the real head. Now every real node has a predecessor, the special cases disappear, and you return `dummy.next` at the end, which is correct even if the original head was removed.

You'll see it in the merge and remove-from-the-end code below. The rule of thumb: **if the head might change, start with a dummy.**

## Reversing a list

Reversing is the most common building block. Walk the list with two pointers: `prev` (the part already reversed) and `curr` (the rest). At each step, flip `curr.next` to point back at `prev`. The one trap is that flipping the pointer loses the rest of the list, so **save `curr.next` first**.

```diagram
{"type":"list","rows":[{"label":"start: curr","values":[1,2,3,4,5],"pointers":{"curr":0}},{"label":"after 2 steps: prev","values":[2,1],"pointers":{"prev":0}},{"label":"after 2 steps: curr","values":[3,4,5],"pointers":{"curr":0}},{"label":"after 3 steps: prev","values":[3,2,1],"pointers":{"prev":0}},{"label":"after 3 steps: curr","values":[4,5],"pointers":{"curr":0}},{"label":"done: prev","values":[5,4,3,2,1],"pointers":{"prev":0}}],"caption":"Each step moves one node from the front of the rest (curr) to the front of the reversed part (prev). When curr runs out, prev is the new head."}
```

The recursive version reverses everything after the head, then hooks the head onto the end: the old `head.next` is now the last node of the reversed part, so `head.next.next = head`.

```python
def reverse_list(head):
    prev, curr = None, head
    while curr:
        nxt = curr.next          # save the rest before overwriting the pointer
        curr.next = prev         # flip this node
        prev, curr = curr, nxt   # step forward
    return prev                  # the old tail is the new head

def reverse_list_rec(head):
    if head is None or head.next is None:
        return head
    new_head = reverse_list_rec(head.next)   # reverse everything after head
    head.next.next = head                    # the node after head now points back to it
    head.next = None
    return new_head
```

```java
ListNode reverseList(ListNode head) {
    ListNode prev = null, curr = head;
    while (curr != null) {
        ListNode nxt = curr.next;    // save the rest before overwriting the pointer
        curr.next = prev;            // flip this node
        prev = curr;                 // step forward
        curr = nxt;
    }
    return prev;                     // the old tail is the new head
}

ListNode reverseListRec(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverseListRec(head.next);   // reverse everything after head
    head.next.next = head;                          // the node after head now points back to it
    head.next = null;
    return newHead;
}
```

```cpp
ListNode* reverseList(ListNode* head) {
    ListNode *prev = nullptr, *curr = head;
    while (curr) {
        ListNode* nxt = curr->next;  // save the rest before overwriting the pointer
        curr->next = prev;           // flip this node
        prev = curr;                 // step forward
        curr = nxt;
    }
    return prev;                     // the old tail is the new head
}

ListNode* reverseListRec(ListNode* head) {
    if (!head || !head->next) return head;
    ListNode* newHead = reverseListRec(head->next);  // reverse everything after head
    head->next->next = head;                         // the node after head now points back to it
    head->next = nullptr;
    return newHead;
}
```

Both are **O(n) time**. The iterative version uses O(1) space; the recursive one uses O(n) stack, which can overflow on long lists (Python's default limit is about 1,000 frames). Reversal is a step in many harder problems: *reverse a sublist from position m to n*, *reverse nodes in k-groups* ([below](/learn/linked-lists#reversing-in-groups-of-k)), *palindrome linked list* (reverse the second half and compare) and *reorder list* (find the middle, reverse the second half, interleave).

### Reversing in groups of k

*Reverse nodes in k-group* reverses each run of `k` nodes and leaves a final run shorter than `k` in its original order. It's a favourite hard question because it stacks three things you already know: a dummy head, a k-step walk, and the reversal loop above. For each block:

1. From `before` (the node just before the block; the dummy at first), walk `k` steps to `kth`. If the list runs out first, stop: the short tail stays as it is.
2. Save `first = before.next` and `after = kth.next`.
3. Reverse the block with the usual loop, but start `prev` at `after` instead of `null`. The block's old first node then points at the rest of the list, so the far end is already connected.
4. Connect the near end: `before.next = kth`. The old `first` is now the block's last node, so it becomes `before` for the next block.

```diagram
{"type":"list","rows":[{"label":"start, k = 2","values":["D",1,2,3,4,5],"pointers":{"before":0,"kth":2}},{"label":"block 1 done","values":["D",2,1,3,4,5],"pointers":{"before":2,"kth":4}},{"label":"block 2 done","values":["D",2,1,4,3,5],"pointers":{"before":4}}],"caption":"After each block, the old first node (1, then 3) is the new before. Only 5 is left, fewer than k, so it stays put."}
```

```python
def reverse_k_group(head, k):
    # Check k nodes exist ahead, reverse that block, reconnect both ends
    # Short last block stays as it is
    dummy = ListNode(0, head)
    # node just before current block
    before = dummy
    while True:
        # walk k nodes ahead; None = fewer than k left
        kth = before
        for _ in range(k):
            kth = kth.next
            if kth is None:
                return dummy.next
        first, after = before.next, kth.next
        # reverse block; first node ends up pointing at after
        prev, curr = after, first
        while curr is not after:
            nxt = curr.next
            curr.next = prev
            prev, curr = curr, nxt
        # kth now leads block, first is its tail
        before.next = kth
        before = first
```

```java
ListNode reverseKGroup(ListNode head, int k) {
    // Check k nodes exist ahead, reverse that block, reconnect both ends
    // Short last block stays as it is
    ListNode dummy = new ListNode(0, head);
    // node just before current block
    ListNode before = dummy;
    while (true) {
        // walk k nodes ahead; null = fewer than k left
        ListNode kth = before;
        for (int i = 0; i < k; i++) {
            kth = kth.next;
            if (kth == null) return dummy.next;
        }
        ListNode first = before.next, after = kth.next;
        // reverse block; first node ends up pointing at after
        ListNode prev = after, curr = first;
        while (curr != after) {
            ListNode nxt = curr.next;
            curr.next = prev;
            prev = curr;
            curr = nxt;
        }
        // kth now leads block, first is its tail
        before.next = kth;
        before = first;
    }
}
```

```cpp
ListNode* reverseKGroup(ListNode* head, int k) {
    // Check k nodes exist ahead, reverse that block, reconnect both ends
    // Short last block stays as it is
    ListNode dummy(0, head);
    // node just before current block
    ListNode* before = &dummy;
    while (true) {
        // walk k nodes ahead; nullptr = fewer than k left
        ListNode* kth = before;
        for (int i = 0; i < k; i++) {
            kth = kth->next;
            if (!kth) return dummy.next;
        }
        ListNode *first = before->next, *after = kth->next;
        // reverse block; first node ends up pointing at after
        ListNode *prev = after, *curr = first;
        while (curr != after) {
            ListNode* nxt = curr->next;
            curr->next = prev;
            prev = curr;
            curr = nxt;
        }
        // kth now leads block, first is its tail
        before->next = kth;
        before = first;
    }
}
```

Every node is walked twice, once by the k-step check and once by the reversal: **O(n) time, O(1) space**. The usual bugs are reversing before checking that `k` nodes exist (the short last block then has to be reversed back) and forgetting `before.next = kth`, which leaves the previous block pointing at the old first node, now the block's tail, and drops the rest of the block.

## Fast and slow pointers

Two pointers walk the list at different speeds: **slow** moves one node per step, **fast** moves two.

**Finding the middle.** When fast reaches the end, slow has gone half as far, so it's at the middle. With the loop condition `while fast and fast.next`, a list of even length gives the *second* of the two middle nodes. Start fast one node ahead if you want the first.

**Detecting a cycle.** If the last node points back into the list, a plain walk never ends. With fast and slow pointers, fast enters the cycle first and then gains one node on slow every step, so it must land on slow eventually. If there's no cycle, fast reaches `null`. This is **Floyd's cycle detection**, nicknamed the **tortoise and hare**. It uses O(1) space, where the obvious alternative (a hash set of visited nodes) uses O(n).

**Finding where the cycle starts.** After they meet, move one pointer back to the head and advance both **one** step at a time. They meet again exactly at the start of the cycle.

```diagram
{"type":"list","values":[1,2,3,4,5,6],"cycleTo":2,"pointers":{"head":0,"meet":4},"highlight":[2],"caption":"Slow and fast first meet at 5, after 4 moves. The cycle starts at 3: two steps from the head and two steps on from 5, so pointers started at both places reach it together."}
```

Why it works: say the head is `a` steps from the cycle's start, the meeting point is `b` steps into the cycle, and the cycle has length `c`. When they meet, slow has walked `a + b` and fast has walked twice that, `2(a + b)`. Fast's extra distance, `a + b`, is a whole number of laps, a multiple of `c`. So walking `a` more steps from the meeting point brings you to `b + a`, which is a multiple of `c` steps into the cycle: back at the start. Meanwhile a pointer from the head also needs exactly `a` steps to get there.

```python
def middle_node(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow                  # the second middle if the length is even

def detect_cycle(head):
    """The node where the cycle starts, or None if there is no cycle."""
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:         # they met inside the cycle
            slow = head          # restart one pointer from the head
            while slow is not fast:
                slow = slow.next
                fast = fast.next
            return slow          # both are at the start of the cycle
    return None
```

```java
ListNode middleNode(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
    }
    return slow;                 // the second middle if the length is even
}

ListNode detectCycle(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) {
        slow = slow.next;
        fast = fast.next.next;
        if (slow == fast) {      // they met inside the cycle
            slow = head;         // restart one pointer from the head
            while (slow != fast) {
                slow = slow.next;
                fast = fast.next;
            }
            return slow;         // both are at the start of the cycle
        }
    }
    return null;
}
```

```cpp
ListNode* middleNode(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
    }
    return slow;                 // the second middle if the length is even
}

ListNode* detectCycle(ListNode* head) {
    ListNode *slow = head, *fast = head;
    while (fast && fast->next) {
        slow = slow->next;
        fast = fast->next->next;
        if (slow == fast) {      // they met inside the cycle
            slow = head;         // restart one pointer from the head
            while (slow != fast) {
                slow = slow->next;
                fast = fast->next;
            }
            return slow;         // both are at the start of the cycle
        }
    }
    return nullptr;
}
```

Compare nodes by **identity** (`is` in Python, `==` on references in Java, pointer equality in C++), not by value: two different nodes can hold the same value. The same idea finds cycles in anything that maps a value to a "next" value: *happy number*, and *find the duplicate number* in an array where `nums[i]` is treated as a next pointer.

## Intersection of two lists

Two singly linked lists can merge at some node and share every node after it, a Y shape. *Intersection of two linked lists* asks for that node, or `null` if they never meet. A hash set of list A's nodes answers it in O(m) extra space; two pointers need O(1).

Say the part only in A is `a` nodes long, the part only in B is `b` nodes, and the shared tail is `c` nodes. Start a pointer at each head, move both one step at a time, and when a pointer runs off the end, restart it at the **other** list's head. Pointer A covers `a + c` nodes, then `b` more to get back to the join; pointer B covers `b + c`, then `a`. Both totals are `a + c + b`, so they reach the join on the same step. If the lists never meet, both walk `a + b` nodes and reach `null` on the same step, which ends the loop with the right answer.

```diagram
{"type":"list","rows":[{"label":"A","values":[4,1,8,4,5],"highlight":[2,3,4]},{"label":"B","values":[5,6,1,8,4,5],"highlight":[3,4,5]}],"caption":"a = 2, b = 3, and the shared tail 8, 4, 5 has c = 3. Each pointer walks 2 + 3 + 3 nodes, so both land on 8 together. The two 1s are different nodes."}
```

```python
def get_intersection_node(head_a, head_b):
    # Each pointer walks its own list, then other one
    # Both walk a + c + b nodes, so they reach join together
    # No join = both reach None together
    a, b = head_a, head_b
    while a is not b:
        # end of list = restart at other head
        a = a.next if a else head_b
        b = b.next if b else head_a
    return a
```

```java
ListNode getIntersectionNode(ListNode headA, ListNode headB) {
    // Each pointer walks its own list, then other one
    // Both walk a + c + b nodes, so they reach join together
    // No join = both reach null together
    ListNode a = headA, b = headB;
    while (a != b) {
        // end of list = restart at other head
        a = (a != null) ? a.next : headB;
        b = (b != null) ? b.next : headA;
    }
    return a;
}
```

```cpp
ListNode* getIntersectionNode(ListNode* headA, ListNode* headB) {
    // Each pointer walks its own list, then other one
    // Both walk a + c + b nodes, so they reach join together
    // No join = both reach nullptr together
    ListNode *a = headA, *b = headB;
    while (a != b) {
        // end of list = restart at other head
        a = a ? a->next : headB;
        b = b ? b->next : headA;
    }
    return a;
}
```

**O(m + n) time, O(1) space.** Compare nodes by identity, never by value: in the example both lists hold a 1 before the join, but they're different nodes. A common bug is switching lists when `a.next` is null instead of when `a` itself is null. The pointer then never takes the `null` step, and if the lists don't meet, the loop runs forever. The other O(1)-space method measures both lengths, advances the longer list's pointer by the difference, then walks both together until they meet.

## Merging two sorted lists

To **merge two sorted lists** into one, keep a `tail` pointer to the end of the result. Repeatedly attach the smaller of the two front nodes and advance in that list. When one list runs out, attach the rest of the other in one step. A dummy node means the "result is still empty" case never needs its own code.

```python
def merge_two_lists(a, b):
    dummy = tail = ListNode()
    while a and b:
        if a.val <= b.val:       # <= keeps equal values in their original order
            tail.next = a
            a = a.next
        else:
            tail.next = b
            b = b.next
        tail = tail.next
    tail.next = a or b           # attach whatever is left
    return dummy.next
```

```java
ListNode mergeTwoLists(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) {    // <= keeps equal values in their original order
            tail.next = a;
            a = a.next;
        } else {
            tail.next = b;
            b = b.next;
        }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;   // attach whatever is left
    return dummy.next;
}
```

```cpp
ListNode* mergeTwoLists(ListNode* a, ListNode* b) {
    ListNode dummy(0);
    ListNode* tail = &dummy;
    while (a && b) {
        if (a->val <= b->val) {  // <= keeps equal values in their original order
            tail->next = a;
            a = a->next;
        } else {
            tail->next = b;
            b = b->next;
        }
        tail = tail->next;
    }
    tail->next = a ? a : b;      // attach whatever is left
    return dummy.next;
}
```

**O(n + m) time, O(1) extra space**: no new nodes, just relinking. Two related problems build on it. *Sort list* is merge sort on a linked list (split at the middle with fast and slow pointers, sort each half, merge), which is O(n log n) without random access. *Merge k sorted lists* repeatedly takes the smallest front node from a min-heap, in O(N log k) for N nodes in total (see [heaps](/learn/heaps)).

## Adding two numbers

*Add two numbers*: two non-negative integers are stored as linked lists of digits, **least significant digit first** (342 is `2 → 4 → 3`). Return their sum in the same form. It's grade-school addition: add digit by digit and carry.

1. Start with a [dummy head](/learn/linked-lists#the-dummy-head-node) for the result, a `tail` pointer and `carry = 0`.
2. While either list still has digits **or the carry is non-zero**: add the two current digits (0 for a list that has run out) and the carry, append `total % 10`, and keep `total / 10` as the new carry.
3. Return `dummy.next`.

```diagram
{"type":"list","rows":[{"label":"a","values":[2,4,3]},{"label":"b","values":[5,6,4]},{"label":"sum","values":[7,0,8],"highlight":[1]}],"caption":"342 + 465 = 807, digits stored backwards: 2 + 5 = 7, 4 + 6 = 10 (write 0, carry 1), 3 + 4 + 1 = 8."}
```

```python
def add_two_numbers(a, b):               # digits stored least significant first
    dummy = tail = ListNode()
    carry = 0
    while a or b or carry:               # carry: one more digit may be left at the end
        total = carry + (a.val if a else 0) + (b.val if b else 0)
        carry, digit = divmod(total, 10)
        tail.next = ListNode(digit)
        tail = tail.next
        a = a.next if a else None
        b = b.next if b else None
    return dummy.next
```

```java
ListNode addTwoNumbers(ListNode a, ListNode b) {   // digits stored least significant first
    ListNode dummy = new ListNode(0), tail = dummy;
    int carry = 0;
    while (a != null || b != null || carry != 0) {  // carry: one more digit may be left
        int total = carry + (a != null ? a.val : 0) + (b != null ? b.val : 0);
        carry = total / 10;
        tail.next = new ListNode(total % 10);
        tail = tail.next;
        if (a != null) a = a.next;
        if (b != null) b = b.next;
    }
    return dummy.next;
}
```

```cpp
ListNode* addTwoNumbers(ListNode* a, ListNode* b) {   // least significant digit first
    ListNode dummy(0);
    ListNode* tail = &dummy;
    int carry = 0;
    while (a || b || carry) {                // carry: one more digit may be left
        int total = carry + (a ? a->val : 0) + (b ? b->val : 0);
        carry = total / 10;
        tail->next = new ListNode(total % 10);
        tail = tail->next;
        if (a) a = a->next;
        if (b) b = b->next;
    }
    return dummy.next;
}
```

**O(max(m, n)) time**; the only extra space is the output list. Pitfalls:

- **The final carry.** `99 + 1` needs a new node at the end (`9 → 9` plus `1` gives `0 → 0 → 1`), which is why the loop also runs while `carry` is non-zero.
- **Different lengths.** Keep going on the longer list, treating the missing digits as 0.
- **Converting to integers.** It overflows `long` for 100-digit lists in Java and C++, and it skips the point of the exercise.

*Add two numbers II* stores the **most** significant digit first. Either reverse both lists (above), add, and reverse the result, or push each list's digits onto a stack and build the answer by prepending nodes as you pop.

## Removing the n-th node from the end

You can't index from the end of a singly linked list, but two pointers with a fixed gap can. Start `fast` and `slow` at a dummy node, move `fast` `n` steps ahead, then move both until `fast` is on the last node. `slow` is now just before the node to remove. The dummy covers the case where the node to remove is the head.

```diagram
{"type":"list","rows":[{"label":"gap of n = 2","values":["D",1,2,3,4,5],"pointers":{"slow":0,"fast":2}},{"label":"fast on the last","values":["D",1,2,3,4,5],"pointers":{"slow":3,"fast":5},"highlight":[4]},{"label":"after removal","values":["D",1,2,3,5]}],"caption":"Removing the 2nd node from the end: once fast is on the last node, slow is on 3, the node before 4. Then slow.next = slow.next.next."}
```

```python
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n):           # open a gap of n nodes
        fast = fast.next
    while fast.next:             # move both until fast is on the last node
        fast = fast.next
        slow = slow.next
    slow.next = slow.next.next   # slow is just before the target
    return dummy.next
```

```java
ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head), fast = dummy, slow = dummy;
    for (int i = 0; i < n; i++) fast = fast.next;   // open a gap of n nodes
    while (fast.next != null) {                     // move both until fast is on the last node
        fast = fast.next;
        slow = slow.next;
    }
    slow.next = slow.next.next;                     // slow is just before the target
    return dummy.next;
}
```

```cpp
ListNode* removeNthFromEnd(ListNode* head, int n) {
    ListNode dummy(0, head);
    ListNode *fast = &dummy, *slow = &dummy;
    for (int i = 0; i < n; i++) fast = fast->next;  // open a gap of n nodes
    while (fast->next) {                            // move both until fast is on the last node
        fast = fast->next;
        slow = slow->next;
    }
    slow->next = slow->next->next;                  // slow is just before the target
    return dummy.next;
}
```

One pass, O(1) space. The alternative (count the length, then walk `length - n` steps) is also O(n) and perfectly acceptable; the gap trick is what interviewers often hope to see. In C++, `delete` the removed node if your code owns the list's memory.

## Removing duplicates from a sorted list

*Remove duplicates from sorted list* keeps one copy of each value. In a sorted list equal values sit next to each other, so a single pointer is enough. At each node, if the next node holds the same value, unlink it (`curr.next = curr.next.next`) and **stay** on `curr`, because another copy may follow. Otherwise move on.

```python
def delete_duplicates(head):
    # Sorted, so copies of each value sit together
    curr = head
    while curr and curr.next:
        # copy ahead = unlink it; stay put, since more copies may follow
        if curr.next.val == curr.val:
            curr.next = curr.next.next
        else:
            curr = curr.next
    return head
```

```java
ListNode deleteDuplicates(ListNode head) {
    // Sorted, so copies of each value sit together
    ListNode curr = head;
    while (curr != null && curr.next != null) {
        // copy ahead = unlink it; stay put, since more copies may follow
        if (curr.next.val == curr.val) curr.next = curr.next.next;
        else curr = curr.next;
    }
    return head;
}
```

```cpp
ListNode* deleteDuplicates(ListNode* head) {
    // Sorted, so copies of each value sit together
    ListNode* curr = head;
    while (curr && curr->next) {
        // copy ahead = unlink and free it; stay put, since more copies may follow
        if (curr->next->val == curr->val) {
            ListNode* copy = curr->next;
            curr->next = copy->next;
            delete copy;
        } else {
            curr = curr->next;
        }
    }
    return head;
}
```

**O(n) time, O(1) space.** The first copy of each value is kept, so the head never changes and no dummy is needed. The classic bug is advancing `curr` right after unlinking: a run of three copies then keeps two. *Remove duplicates from sorted list II* is harder: it deletes **every** node whose value repeats, first copy included. The head can then disappear, so it needs a dummy node and a `prev` pointer that only moves past values seen exactly once.

## Odd-even regrouping

*Odd even linked list*: put all nodes at odd positions (1st, 3rd, ...) first, then all nodes at even positions, keeping the relative order within each group, in O(1) extra space. `1 → 2 → 3 → 4 → 5` becomes `1 → 3 → 5 → 2 → 4`.

Peel the list into **two interleaved chains** in one walk. `odd` and `even` are the tails of the two chains, and they leapfrog: the node after `even` is the next odd node, and the node after that is the next even node. At the end, hang the even chain after the last odd node.

1. `odd = head`, `even = head.next`, and save `evenHead = even`.
2. While `even` and `even.next` exist: `odd.next = even.next`, advance `odd`; `even.next = odd.next`, advance `even`.
3. `odd.next = evenHead`.

```diagram
{"type":"list","rows":[{"label":"start","values":[1,2,3,4,5],"pointers":{"odd":0,"even":1}},{"label":"odd chain","values":[1,3,5],"pointers":{"odd":2}},{"label":"even chain","values":[2,4],"pointers":{"evenHead":0}},{"label":"joined","values":[1,3,5,2,4]}],"caption":"Each step relinks one odd and one even node. When even runs out, odd is the last odd node, and the saved even head goes after it."}
```

```python
def odd_even_list(head):
    # Peel list into two chains (odd positions, even positions) in one walk
    # Each step links odd to node after even, then even to node after that
    # Finally hang even chain after last odd node
    if not head:
        return head
    odd, even = head, head.next
    # saved, since even chain's start is lost once odd links past it
    even_head = even
    # need even.next too, as it becomes next odd node
    while even and even.next:
        odd.next = even.next
        odd = odd.next
        even.next = odd.next
        even = even.next
    odd.next = even_head
    return head
```

```java
ListNode oddEvenList(ListNode head) {
    // Peel list into two chains (odd positions, even positions) in one walk
    // Each step links odd to node after even, then even to node after that
    // Finally hang even chain after last odd node
    if (head == null) return head;
    ListNode odd = head, even = head.next;
    // saved, since even chain's start is lost once odd links past it
    ListNode evenHead = even;
    // need even.next too, as it becomes next odd node
    while (even != null && even.next != null) {
        odd.next = even.next;
        odd = odd.next;
        even.next = odd.next;
        even = even.next;
    }
    odd.next = evenHead;
    return head;
}
```

```cpp
ListNode* oddEvenList(ListNode* head) {
    // Peel list into two chains (odd positions, even positions) in one walk
    // Each step links odd to node after even, then even to node after that
    // Finally hang even chain after last odd node
    if (!head) return head;
    ListNode* odd = head;
    ListNode* even = head->next;
    // saved, since even chain's start is lost once odd links past it
    ListNode* evenHead = even;
    // need even->next too, as it becomes next odd node
    while (even && even->next) {
        odd->next = even->next;
        odd = odd->next;
        even->next = odd->next;
        even = even->next;
    }
    odd->next = evenHead;
    return head;
}
```

**O(n)** time, O(1) space: no node is created or copied. The usual bugs are forgetting to **save the even head** (once `odd.next` skips over it, nothing points to it any more), a loop condition that only checks `even.next` (crashes when `even` is null on odd-length lists), and returning the wrong head (it's still `head`). *Partition list* (values below `x` first) uses the same two-chain idea, with two dummy heads instead of leapfrogging.

## LRU cache: hash map + doubly linked list

An **LRU cache** holds at most `capacity` items, and when it's full it evicts the **least recently used** one. The classic interview version asks for `get` and `put` in **O(1)**. (For why caches evict this way, and the alternatives, see [caching](/learn/caching).)

No single structure does both jobs, so combine two:

- A **hash map** from key to node finds any entry in O(1).
- A **doubly linked list** keeps the entries in order of use: most recent at the front, least recent at the back. Because each node knows its `prev`, any node can be unlinked and moved to the front in O(1).

```diagram
{"type":"list","rows":[{"label":"before get(2)","values":["head",3,1,2,"tail"],"highlight":[3]},{"label":"after get(2)","values":["head",2,3,1,"tail"],"highlight":[1]},{"label":"after put(4), full","values":["head",4,2,3,"tail"],"highlight":[1]}],"caption":"Capacity 3, most recent first. get(2) moves 2 to the front. put(4) adds 4 at the front and evicts 1, the node just before the tail."}
```

- `get(key)`: look up the node; if it exists, move it to the front and return its value.
- `put(key, value)`: if the key exists, unlink its old node. Insert a new node at the front. If the cache is now over capacity, unlink the node before the tail and delete its key from the map.

Sentinel `head` and `tail` nodes (dummies at both ends) mean every real node has neighbours on both sides, so unlinking never checks for `null`. Each node stores its **key** as well as its value, because eviction starts from the node and must then remove the key from the map. The C++ version uses `std::list`, which is itself a doubly linked list: `splice` moves a node to the front in O(1) without invalidating iterators.

```python
class Node:
    def __init__(self, key=0, val=0):
        self.key, self.val = key, val
        self.prev = self.next = None

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.map = {}                              # key -> node
        self.head, self.tail = Node(), Node()      # sentinels; most recent is head.next
        self.head.next, self.tail.prev = self.tail, self.head

    def _remove(self, node):
        node.prev.next, node.next.prev = node.next, node.prev

    def _add_front(self, node):
        node.prev, node.next = self.head, self.head.next
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        if key not in self.map:
            return -1
        node = self.map[key]
        self._remove(node)                         # used now: move it to the front
        self._add_front(node)
        return node.val

    def put(self, key, value):
        if key in self.map:
            self._remove(self.map[key])
        node = Node(key, value)
        self.map[key] = node
        self._add_front(node)
        if len(self.map) > self.capacity:
            lru = self.tail.prev                   # least recently used
            self._remove(lru)
            del self.map[lru.key]                  # this is why nodes store their key
```

```java
class LRUCache {
    private static class Node {
        int key, val;
        Node prev, next;
        Node(int key, int val) { this.key = key; this.val = val; }
    }

    private final int capacity;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels

    public LRUCache(int capacity) {
        this.capacity = capacity;
        head.next = tail;
        tail.prev = head;
    }

    private void remove(Node node) {
        node.prev.next = node.next;
        node.next.prev = node.prev;
    }

    private void addFront(Node node) {
        node.prev = head;
        node.next = head.next;
        head.next.prev = node;
        head.next = node;
    }

    public int get(int key) {
        Node node = map.get(key);
        if (node == null) return -1;
        remove(node);                  // used now: move it to the front
        addFront(node);
        return node.val;
    }

    public void put(int key, int value) {
        Node old = map.get(key);
        if (old != null) remove(old);
        Node node = new Node(key, value);
        map.put(key, node);
        addFront(node);
        if (map.size() > capacity) {
            Node lru = tail.prev;      // least recently used
            remove(lru);
            map.remove(lru.key);       // this is why nodes store their key
        }
    }
}
```

```cpp
class LRUCache {
    int capacity;
    list<pair<int, int>> items;                               // (key, value), most recent first
    unordered_map<int, list<pair<int, int>>::iterator> pos;   // key -> its node in items
public:
    LRUCache(int capacity) : capacity(capacity) {}

    int get(int key) {
        auto it = pos.find(key);
        if (it == pos.end()) return -1;
        items.splice(items.begin(), items, it->second);       // used now: move it to the front
        return it->second->second;
    }

    void put(int key, int value) {
        auto it = pos.find(key);
        if (it != pos.end()) items.erase(it->second);
        items.emplace_front(key, value);
        pos[key] = items.begin();
        if ((int)pos.size() > capacity) {
            pos.erase(items.back().first);                    // this is why nodes store their key
            items.pop_back();                                 // least recently used
        }
    }
};
```

Libraries can do this for you: Python's `OrderedDict` (`move_to_end`, `popitem(last=False)`) and Java's `LinkedHashMap` with access order and `removeEldestEntry`. Mention them, but expect to be asked for the hand-built version.

## Pitfalls

- **Losing the rest of the list.** Before you overwrite `node.next`, save it if you still need it. Draw the three or four pointers involved and update them in an order where nothing is lost.
- **Null checks.** Before `node.next.next`, make sure `node.next` exists. The fast pointer needs `fast and fast.next`, in that order.
- **Empty and one-node lists.** Run every solution in your head on `[]` and `[1]`, and on removing the head.
- **Forgetting the dummy.** If the head can change, a dummy node removes a whole class of bugs.
- **Cycles you created by accident.** After reversing or reordering, make sure the new tail's `next` is `null`, or printing the list loops forever.
- **Comparing values instead of nodes** when checking whether two pointers meet.
- **Recursion depth.** Recursive list code uses one stack frame per node; prefer the iterative version for long lists.
