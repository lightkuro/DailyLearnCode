---
title: Binary trees & traversals
summary: Nodes with up to two children, the four classic traversals, binary search trees, and the recursive patterns that solve most tree problems.
related: graphs, recursion-backtracking, heaps, tries
terms:
  - binary tree
  - binary trees
  - leaf node #vocabulary
  - tree height #vocabulary
  - preorder traversal #depth-first-preorder-inorder-postorder
  - inorder traversal #depth-first-preorder-inorder-postorder
  - postorder traversal #depth-first-preorder-inorder-postorder
  - level-order traversal #breadth-first-level-order
  - level order #breadth-first-level-order
  - binary search tree #binary-search-trees
  - BST #binary-search-trees
  - BSTs #binary-search-trees
  - balanced tree #balanced-trees
  - self-balancing #balanced-trees
  - lowest common ancestor #common-patterns
  - BST deletion #deleting-from-a-bst
  - in-order successor #deleting-from-a-bst
  - inorder successor #deleting-from-a-bst
  - Morris traversal #morris-inorder-traversal
  - BST floor #floor-and-ceiling
  - range sum of BST #range-queries-by-pruning
  - recover binary search tree #recovering-two-swapped-values
  - construct binary tree from preorder and inorder #from-preorder-and-inorder
  - sorted array to BST #balanced-bst-from-a-sorted-array
  - subtree of another tree #subtree-check-by-serialising
  - maximum sum BST #largest-bst-subtree-by-sum
  - binary tree cameras #binary-tree-cameras
  - rerooting #rerooting-an-answer-for-every-root
  - sum of distances in tree #rerooting-an-answer-for-every-root
  - recover a tree from preorder traversal #from-a-preorder-string-with-depth-markers
---

## What a binary tree is

A **binary tree** is a set of nodes where each node holds a value and points to at most two children, called *left* and *right*. One node, the **root**, has no parent; every other node has exactly one. Because there's exactly one path from the root to any node, a tree has no cycles: it's a connected graph with `n` nodes and `n - 1` edges.

Trees show up whenever data is hierarchical: file systems, the DOM, expression parsers, decision trees, database indexes (B-trees), and heaps. In interviews they're the most common way to test recursion.

```diagram
{"type":"tree","values":[8,3,10,1,6,null,14,null,null,4,7,13],"highlight":[8],"caption":"Root 8; leaves 1, 4, 7 and 13. LeetCode writes this tree as [8,3,10,1,6,null,14,null,null,4,7,13]."}
```

The list in the caption is **level order** with `null` for a missing child, and children of a missing node are skipped. It's how LeetCode prints every tree, so it's worth being able to read it.

## Vocabulary

- **Leaf**: a node with no children (1, 4, 7, 13 above).
- **Depth** of a node: edges from the root to it. The root has depth 0.
- **Height** of a tree: edges on the longest root-to-leaf path (3 above; some books count nodes instead, so check which a problem means).
- **Subtree**: a node plus everything below it. Every subtree is itself a binary tree, which is why recursion fits so well.
- **Full** tree: every node has 0 or 2 children. **Complete** tree: every level is full except maybe the last, which fills left to right (this is the shape a heap uses). **Perfect** tree: all leaves at the same depth, so it has `2^(h+1) - 1` nodes.

A tree with `n` nodes has height between `log₂ n` (balanced) and `n - 1` (a "stick" where every node has one child). That gap is the difference between O(log n) and O(n) operations.

## Representing a tree in code

Interview problems give you a node class like this one:

```python
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        # the value stored in this node
        self.val = val
        # left child, or None if there is none
        self.left = left
        # right child, or None if there is none
        self.right = right
```

```java
public class TreeNode {
    // the value stored in this node
    int val;
    // children are null when absent
    TreeNode left, right;
    TreeNode(int val) { this.val = val; }
}
```

```cpp
struct TreeNode {
    // the value stored in this node
    int val;
    // children are nullptr when absent
    TreeNode *left = nullptr, *right = nullptr;
    TreeNode(int v) : val(v) {}
};
```

An empty tree is just `None` / `null` / `nullptr`. Most bugs in tree code are a missing check for that case, so write it first.

## Depth-first: preorder, inorder, postorder

A depth-first traversal goes as deep as it can down one branch before backing up. The three orders differ only in *when* you visit the node relative to its children:

| Order | Visit | Typical use |
|---|---|---|
| Preorder | node, left, right | copy or serialise a tree, print a folder structure |
| Inorder | left, node, right | a BST in sorted order |
| Postorder | left, right, node | anything that needs the children's answers first: height, deleting, subtree sums |

```diagram
{"type":"tree","values":[1,2,3,4,5,null,6],"order":[4,2,5,1,3,6],"caption":"Inorder visits 4, 2, 5, 1, 3, 6: the badge is the visit number."}
```

For the same tree, preorder gives 1, 2, 4, 5, 3, 6 and postorder gives 4, 5, 2, 6, 3, 1. The recursive versions are three lines each; only the position of the "visit" line moves:

```python
def inorder(node, out):
    if node is None:
        return
    inorder(node.left, out)
    out.append(node.val)      # move this line up for preorder, down for postorder
    inorder(node.right, out)
```

```java
void inorder(TreeNode node, List<Integer> out) {
    if (node == null) return;
    inorder(node.left, out);
    out.add(node.val);        // move up for preorder, down for postorder
    inorder(node.right, out);
}
```

```cpp
void inorder(TreeNode* node, vector<int>& out) {
    if (!node) return;
    inorder(node->left, out);
    out.push_back(node->val); // move up for preorder, down for postorder
    inorder(node->right, out);
}
```

Each node is visited once, so a traversal is **O(n) time**. The recursion stack holds one frame per level, so space is **O(h)**: O(log n) for a balanced tree but O(n) for a stick. On very deep trees (tens of thousands of levels) recursion can overflow the stack; Python's default limit is about 1,000 frames. The fix is an explicit stack.

### Iterative inorder with a stack

```python
def inorder_iter(root):
    out, stack, node = [], [], root
    while stack or node:
        while node:               # go as far left as possible
            stack.append(node)
            node = node.left
        node = stack.pop()        # the leftmost unvisited node
        out.append(node.val)
        node = node.right         # then its right subtree
    return out
```

```java
// inorder without recursion: the stack holds nodes whose left side we're visiting
List<Integer> inorderIter(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode node = root;
    // keep going while there is a node to descend into or an ancestor waiting
    while (node != null || !stack.isEmpty()) {
        // go as far left as possible
        while (node != null) { stack.push(node); node = node.left; }
        // the leftmost unvisited node
        node = stack.pop();
        out.add(node.val);
        // then its right subtree
        node = node.right;
    }
    return out;
}
```

```cpp
// inorder without recursion: the stack holds nodes whose left side we're visiting
vector<int> inorderIter(TreeNode* root) {
    vector<int> out;
    stack<TreeNode*> st;
    TreeNode* node = root;
    // keep going while there is a node to descend into or an ancestor waiting
    while (node || !st.empty()) {
        // go as far left as possible
        while (node) { st.push(node); node = node->left; }
        // the leftmost unvisited node
        node = st.top(); st.pop();
        out.push_back(node->val);
        // then its right subtree
        node = node->right;
    }
    return out;
}
```

### Morris inorder traversal

Both versions above use O(h) extra space for the stack. **Morris traversal** gets inorder down to **O(1)** by borrowing the tree's own empty pointers. Before going into a node's left subtree, it finds the node's inorder predecessor (the rightmost node of the left subtree) and points that node's empty `right` back at the current node: a temporary **thread**. When the walk later follows the thread back up, the left side is finished, so it removes the thread, visits the node and goes right.

It comes up as the follow-up "now without a stack", most often for [recovering a BST](/learn/trees#recovering-two-swapped-values). Time is still O(n): each predecessor search walks down one left subtree's right edge, and every edge is walked at most a few times in total. The catch is that the tree is modified during the walk. If you return early, the threads stay behind, and nothing else may read the tree while the walk runs.

```python
def morris_inorder(root):
    # Thread rightmost node of left subtree back up to node
    # Return trip along thread = left side done, so remove thread and visit
    out = []
    node = root
    while node:
        # no left side, so visit and go right
        if node.left is None:
            out.append(node.val)
            node = node.right
            continue
        # predecessor (rightmost node of left subtree)
        pred = node.left
        while pred.right and pred.right is not node:
            pred = pred.right
        # first arrival, so leave thread and go left
        if pred.right is None:
            pred.right = node
            node = node.left
        # back along thread, so restore tree and visit
        else:
            pred.right = None
            out.append(node.val)
            node = node.right
    return out
```

```java
List<Integer> morrisInorder(TreeNode root) {
    // Thread rightmost node of left subtree back up to node
    // Return trip along thread = left side done, so remove thread and visit
    List<Integer> out = new ArrayList<>();
    TreeNode node = root;
    while (node != null) {
        // no left side, so visit and go right
        if (node.left == null) {
            out.add(node.val);
            node = node.right;
            continue;
        }
        // predecessor (rightmost node of left subtree)
        TreeNode pred = node.left;
        while (pred.right != null && pred.right != node) pred = pred.right;
        // first arrival, so leave thread and go left
        if (pred.right == null) {
            pred.right = node;
            node = node.left;
        }
        // back along thread, so restore tree and visit
        else {
            pred.right = null;
            out.add(node.val);
            node = node.right;
        }
    }
    return out;
}
```

```cpp
vector<int> morrisInorder(TreeNode* root) {
    // Thread rightmost node of left subtree back up to node
    // Return trip along thread = left side done, so remove thread and visit
    vector<int> out;
    TreeNode* node = root;
    while (node) {
        // no left side, so visit and go right
        if (!node->left) {
            out.push_back(node->val);
            node = node->right;
            continue;
        }
        // predecessor (rightmost node of left subtree)
        TreeNode* pred = node->left;
        while (pred->right && pred->right != node) pred = pred->right;
        // first arrival, so leave thread and go left
        if (!pred->right) {
            pred->right = node;
            node = node->left;
        }
        // back along thread, so restore tree and visit
        else {
            pred->right = nullptr;
            out.push_back(node->val);
            node = node->right;
        }
    }
    return out;
}
```

## Breadth-first: level order

Breadth-first search visits the tree level by level using a **queue**. Recording the queue's size at the start of each level lets you group nodes by depth, which is the trick behind "level averages", "right side view" and "zigzag order" problems.

```diagram
{"type":"tree","values":[3,9,20,null,null,15,7],"order":[3,9,20,15,7],"caption":"Level order: 3, then 9 and 20, then 15 and 7."}
```

```python
from collections import deque

def level_order(root):
    if root is None:
        return []
    levels, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):   # exactly the nodes on this level
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        levels.append(level)
    return levels
```

```java
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> levels = new ArrayList<>();
    // empty tree: no levels
    if (root == null) return levels;
    Queue<TreeNode> q = new ArrayDeque<>();
    q.add(root);
    // each pass of the outer loop handles exactly one level
    while (!q.isEmpty()) {
        List<Integer> level = new ArrayList<>();
        // the queue holds exactly this level's nodes right now
        for (int i = q.size(); i > 0; i--) {
            TreeNode node = q.poll();
            level.add(node.val);
            // children join the queue for the next level
            if (node.left != null) q.add(node.left);
            if (node.right != null) q.add(node.right);
        }
        // this level is finished
        levels.add(level);
    }
    return levels;
}
```

```cpp
vector<vector<int>> levelOrder(TreeNode* root) {
    vector<vector<int>> levels;
    // empty tree: no levels
    if (!root) return levels;
    queue<TreeNode*> q;
    q.push(root);
    // each pass of the outer loop handles exactly one level
    while (!q.empty()) {
        vector<int> level;
        // the queue holds exactly this level's nodes right now
        for (int i = q.size(); i > 0; i--) {
            TreeNode* node = q.front(); q.pop();
            level.push_back(node->val);
            // children join the queue for the next level
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        // this level is finished
        levels.push_back(level);
    }
    return levels;
}
```

BFS uses O(w) extra space, where `w` is the widest level (up to about n/2 in a complete tree). Use BFS when the question is about *levels* or the *nearest* something; use DFS when it's about *paths* or *subtrees*.

## Binary search trees

A **binary search tree (BST)** adds one rule: for every node, everything in its left subtree is smaller and everything in its right subtree is larger. That makes search work like binary search: compare with the node, then go left or right.

```diagram
{"type":"tree","values":[8,3,10,1,6,null,14,null,null,4,7,13],"highlight":[8,3,6,4],"caption":"Searching for 4: 8 → 3 → 6 → 4. Each step discards a whole subtree."}
```

- **Search, insert, delete** take O(h): O(log n) when balanced, O(n) in the worst case (insert 1, 2, 3, 4… and you get a stick).
- **Inorder traversal of a BST is sorted.** Many BST questions ("validate a BST", "k-th smallest", "two-sum in a BST") reduce to this fact.
- A classic trap when validating: checking only `left.val < node.val < right.val` isn't enough. Every node in the left *subtree* must be smaller, so pass down a `(low, high)` range instead.

### Deleting from a BST

Find the node as in search, then:

- **No children**: remove it (return `null` to its parent).
- **One child**: the child takes its place. Everything in that subtree is already on the correct side of the parent.
- **Two children**: you can't splice the node out, because two subtrees need one parent. Replace its value with its **in-order successor**, the smallest value in its right subtree (go right once, then left as far as possible). That value is larger than everything on the left and smaller than everything else on the right, so the BST rule still holds. Then delete the successor from the right subtree. It has no left child, so that deletion is one of the easy cases. The **in-order predecessor** (the largest value in the left subtree) works just as well.

```diagram
{"type":"tree","values":[8,3,10,1,6,null,14,null,null,4,7,13],"highlight":[3,4],"notes":{"3":"delete","4":"successor"},"caption":"Deleting 3, which has two children: its successor is 4 (right to 6, then left as far as possible). 4 moves up into 3's place and the old 4 leaf is removed."}
```

```python
def delete_node(root, key):
    if not root:
        return None
    if key < root.val:
        root.left = delete_node(root.left, key)
    elif key > root.val:
        root.right = delete_node(root.right, key)
    else:
        if not root.left:                # zero or one child: the child takes its place
            return root.right
        if not root.right:
            return root.left
        succ = root.right                # two children: the in-order successor is
        while succ.left:                 # the leftmost node of the right subtree
            succ = succ.left
        root.val = succ.val              # copy it up, then delete it below
        root.right = delete_node(root.right, succ.val)   # it has no left child: an easy case
    return root
```

```java
TreeNode deleteNode(TreeNode root, int key) {
    if (root == null) return null;
    if (key < root.val) {
        root.left = deleteNode(root.left, key);
    } else if (key > root.val) {
        root.right = deleteNode(root.right, key);
    } else {
        if (root.left == null) return root.right;   // zero or one child: the child moves up
        if (root.right == null) return root.left;
        TreeNode succ = root.right;      // two children: the in-order successor is
        while (succ.left != null) succ = succ.left; // the leftmost node of the right subtree
        root.val = succ.val;             // copy it up, then delete it below
        root.right = deleteNode(root.right, succ.val);  // it has no left child: an easy case
    }
    return root;
}
```

```cpp
TreeNode* deleteNode(TreeNode* root, int key) {
    if (!root) return nullptr;
    if (key < root->val) {
        root->left = deleteNode(root->left, key);
    } else if (key > root->val) {
        root->right = deleteNode(root->right, key);
    } else {
        if (!root->left || !root->right) {   // zero or one child: the child moves up
            TreeNode* child = root->left ? root->left : root->right;
            delete root;
            return child;
        }
        TreeNode* succ = root->right;    // two children: the in-order successor is
        while (succ->left) succ = succ->left;   // the leftmost node of the right subtree
        root->val = succ->val;           // copy it up, then delete it below
        root->right = deleteNode(root->right, succ->val);   // it has no left child
    }
    return root;
}
```

**O(h) time**: one walk down to the node and one more to its successor. The usual bugs are copying the successor's value up and then deleting the original key from the right subtree instead of the successor's value (the key isn't there, so the duplicate stays), and forgetting to assign the recursive result back to `root.left` or `root.right`, which leaves the parent pointing at the deleted node. Alternating between successor and predecessor keeps a tree that sees many deletions a little better balanced, but only a [balanced tree](/learn/trees#balanced-trees) guarantees O(log n).

### Floor and ceiling

The **floor** of `x` is the largest value `≤ x`; the **ceiling** is the smallest value `≥ x`. In a BST each is one walk down from the root, O(h). *Closest value in a BST*, *largest value smaller than x* and the library calls `TreeMap.floorKey` / `ceilingKey` all come down to this walk. For the floor, at each node:

- **Equal to `x`**: that's the answer.
- **Smaller than `x`**: it's a candidate. Record it and go **right**, the only place a closer candidate can be.
- **Larger than `x`**: the node and its whole right subtree are too big, so go **left**.

When the walk falls off the tree, the last recorded candidate is the floor (none if every value is above `x`). The ceiling is the mirror image: record nodes larger than `x` and go left. The usual bug is returning the first node below `x`: a larger value that is still `≤ x` can sit in its right subtree.

```diagram
{"type":"tree","values":[8,3,10,1,6,null,14,null,null,4,7,13],"highlight":[8,3,6,4],"notes":{"3":"candidate","4":"floor"},"caption":"Floor of 5: 8 is too big, 3 is a candidate, 6 is too big, 4 is a better candidate, then the walk ends. The floor is 4."}
```

```python
def bst_floor(root, x):
    # Walk one path from root, keeping best candidate so far
    # Node <= x is candidate, and any larger candidate sits to its right
    best = None
    node = root
    while node:
        if node.val == x:
            return node
        # candidate, so look right for one closer to x
        if node.val < x:
            best = node
            node = node.right
        # too big, so floor is in left subtree
        else:
            node = node.left
    return best
```

```java
TreeNode bstFloor(TreeNode root, int x) {
    // Walk one path from root, keeping best candidate so far
    // Node <= x is candidate, and any larger candidate sits to its right
    TreeNode best = null, node = root;
    while (node != null) {
        if (node.val == x) return node;
        // candidate, so look right for one closer to x
        if (node.val < x) {
            best = node;
            node = node.right;
        }
        // too big, so floor is in left subtree
        else node = node.left;
    }
    return best;
}
```

```cpp
TreeNode* bstFloor(TreeNode* root, int x) {
    // Walk one path from root, keeping best candidate so far
    // Node <= x is candidate, and any larger candidate sits to its right
    TreeNode *best = nullptr, *node = root;
    while (node) {
        if (node->val == x) return node;
        // candidate, so look right for one closer to x
        if (node->val < x) {
            best = node;
            node = node->right;
        }
        // too big, so floor is in left subtree
        else node = node->left;
    }
    return best;
}
```

### Range queries by pruning

*Range sum of BST* adds up every value in `[low, high]`. A full traversal is O(n), but BST order lets you skip whole subtrees:

- Node below `low`: its whole left subtree is below `low` too, so recurse **right** only.
- Node above `high`: recurse **left** only.
- Otherwise: count the node and recurse both ways.

Every node visited is either one of the `k` values in range or on the search path for `low` or for `high`, so the cost is **O(h + k)** instead of O(n). The same pruning counts or lists the values in a range, and *trim a BST* uses it to return the pruned child instead of a sum. Mixing up the two sides (`root.val < low` must go right) is the bug to check for.

```python
def range_sum_bst(root, low, high):
    # Skip each subtree that BST order puts outside [low, high]
    if root is None:
        return 0
    # root and whole left subtree below low
    if root.val < low:
        return range_sum_bst(root.right, low, high)
    # root and whole right subtree above high
    if root.val > high:
        return range_sum_bst(root.left, low, high)
    return (root.val + range_sum_bst(root.left, low, high)
            + range_sum_bst(root.right, low, high))
```

```java
int rangeSumBST(TreeNode root, int low, int high) {
    // Skip each subtree that BST order puts outside [low, high]
    if (root == null) return 0;
    // root and whole left subtree below low
    if (root.val < low) return rangeSumBST(root.right, low, high);
    // root and whole right subtree above high
    if (root.val > high) return rangeSumBST(root.left, low, high);
    return root.val + rangeSumBST(root.left, low, high) + rangeSumBST(root.right, low, high);
}
```

```cpp
int rangeSumBST(TreeNode* root, int low, int high) {
    // Skip each subtree that BST order puts outside [low, high]
    if (!root) return 0;
    // root and whole left subtree below low
    if (root->val < low) return rangeSumBST(root->right, low, high);
    // root and whole right subtree above high
    if (root->val > high) return rangeSumBST(root->left, low, high);
    return root->val + rangeSumBST(root->left, low, high) + rangeSumBST(root->right, low, high);
}
```

### Recovering two swapped values

*Recover binary search tree*: the values of exactly two nodes were swapped by mistake; fix the tree without changing its shape. Inorder of a BST is sorted, so traverse inorder and look for **drops**, places where a value is larger than the one after it.

- If the two swapped values were neighbours in sorted order, there's **one** drop, and its two nodes are the pair.
- Otherwise there are **two** drops. The first wrong node is the larger value at the first drop (it moved left); the second is the smaller value at the second drop (it moved right).

One rule covers both cases: `first` = the earlier node of the first drop, `second` = the later node of the last drop. Keep a `prev` pointer during the inorder walk, then swap the two values at the end.

```diagram
{"type":"array","values":[1,6,3,4,5,2,7],"highlight":[1,5],"pointers":{"first":1,"second":5},"caption":"Inorder after 2 and 6 were swapped. Drops at 6 > 3 and 5 > 2: first is 6 from the first drop, second is 2 from the second."}
```

```python
def recover_tree(root):
    # Swapped pair shows up as drops (prev > node) in inorder sequence
    # Neighbours swapped = one drop; otherwise two
    # First wrong node = prev at first drop; second = node at last drop
    first = second = prev = None
    stack, node = [], root
    while stack or node:
        while node:
            stack.append(node)
            node = node.left
        node = stack.pop()
        if prev and prev.val > node.val:
            # first drop fixes first; every drop updates second
            if first is None:
                first = prev
            second = node
        prev = node
        node = node.right
    first.val, second.val = second.val, first.val
```

```java
void recoverTree(TreeNode root) {
    // Swapped pair shows up as drops (prev > node) in inorder sequence
    // Neighbours swapped = one drop; otherwise two
    // First wrong node = prev at first drop; second = node at last drop
    TreeNode first = null, second = null, prev = null, node = root;
    Deque<TreeNode> stack = new ArrayDeque<>();
    while (node != null || !stack.isEmpty()) {
        while (node != null) {
            stack.push(node);
            node = node.left;
        }
        node = stack.pop();
        if (prev != null && prev.val > node.val) {
            // first drop fixes first; every drop updates second
            if (first == null) first = prev;
            second = node;
        }
        prev = node;
        node = node.right;
    }
    int tmp = first.val;
    first.val = second.val;
    second.val = tmp;
}
```

```cpp
void recoverTree(TreeNode* root) {
    // Swapped pair shows up as drops (prev > node) in inorder sequence
    // Neighbours swapped = one drop; otherwise two
    // First wrong node = prev at first drop; second = node at last drop
    TreeNode *first = nullptr, *second = nullptr, *prev = nullptr, *node = root;
    stack<TreeNode*> st;
    while (node || !st.empty()) {
        while (node) {
            st.push(node);
            node = node->left;
        }
        node = st.top();
        st.pop();
        if (prev && prev->val > node->val) {
            // first drop fixes first; every drop updates second
            if (!first) first = prev;
            second = node;
        }
        prev = node;
        node = node->right;
    }
    swap(first->val, second->val);
}
```

**O(n) time** and O(h) space for the stack; swapping in Morris inorder makes it O(1) space, which is the usual follow-up. The bug to avoid is stopping at the first drop and swapping its two nodes: that only works when the swapped values were neighbours.

## Balanced trees

A **balanced tree** keeps its height at O(log n) by restructuring itself (rotations) on insert and delete. You rarely implement one in an interview, but you use them all the time:

- **Red-black trees** back Java's `TreeMap`/`TreeSet` and C++'s `std::map`/`std::set`: ordered keys with O(log n) operations, plus floor/ceiling and range queries that a hash map can't do.
- **AVL trees** are stricter (faster lookups, slower updates).
- **B-trees** have many children per node so each node fills a disk page; databases use them for indexes.

Python has no built-in ordered map; `sortedcontainers.SortedList` or a heap usually fills the gap.

## Building and serialising trees

Traversal orders also work in reverse: from the right sequences you can rebuild a tree, and a traversal with null markers turns a tree into a string you can compare or store.

### From preorder and inorder

*Construct binary tree from preorder and inorder traversal.* Preorder lists each root before its subtrees, so `preorder[0]` is the root. Find that value in inorder: everything to its left is the left subtree, everything to its right is the right subtree. Recurse on each side with the next preorder value as its root.

```diagram
{"type":"tree","values":[3,9,20,null,null,15,7],"highlight":[3],"caption":"Preorder [3, 9, 20, 15, 7], inorder [9, 3, 15, 20, 7]. 3 is the root; 9 sits left of it in inorder, and 15, 20, 7 sit right."}
```

Two details make it O(n) instead of O(n²): a hash map from value to inorder index, so each root is found in O(1) instead of by a scan, and one index that moves through preorder instead of slicing arrays. Because preorder lists the whole left subtree before the right one, building the left side first uses up the preorder values in exactly the right order.

```python
def build_tree(preorder, inorder):
    # preorder gives roots in order; root's inorder spot splits left from right
    # Values must be distinct
    # value to inorder index, so each split is O(1)
    pos = {val: i for i, val in enumerate(inorder)}
    # next preorder index (next root to place)
    nxt = 0

    def build(lo, hi):
        nonlocal nxt
        # empty inorder range = no subtree
        if lo > hi:
            return None
        root = TreeNode(preorder[nxt])
        nxt += 1
        mid = pos[root.val]
        # preorder lists whole left subtree first, so build left first
        root.left = build(lo, mid - 1)
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(inorder) - 1)
```

```java
// value to inorder index, so each split is O(1)
Map<Integer, Integer> pos = new HashMap<>();
// next preorder index (next root to place)
int next = 0;

TreeNode buildTree(int[] preorder, int[] inorder) {
    // preorder gives roots in order; root's inorder spot splits left from right
    // Values must be distinct
    for (int i = 0; i < inorder.length; i++) pos.put(inorder[i], i);
    return build(preorder, 0, inorder.length - 1);
}

TreeNode build(int[] preorder, int lo, int hi) {
    // empty inorder range = no subtree
    if (lo > hi) return null;
    TreeNode root = new TreeNode(preorder[next++]);
    int mid = pos.get(root.val);
    // preorder lists whole left subtree first, so build left first
    root.left = build(preorder, lo, mid - 1);
    root.right = build(preorder, mid + 1, hi);
    return root;
}
```

```cpp
TreeNode* build(const vector<int>& preorder, unordered_map<int, int>& pos,
                int& next, int lo, int hi) {
    // empty inorder range = no subtree
    if (lo > hi) return nullptr;
    TreeNode* root = new TreeNode(preorder[next++]);
    int mid = pos[root->val];
    // preorder lists whole left subtree first, so build left first
    root->left = build(preorder, pos, next, lo, mid - 1);
    root->right = build(preorder, pos, next, mid + 1, hi);
    return root;
}

TreeNode* buildTree(const vector<int>& preorder, const vector<int>& inorder) {
    // preorder gives roots in order; root's inorder spot splits left from right
    // Values must be distinct
    // value to inorder index, so each split is O(1)
    unordered_map<int, int> pos;
    for (int i = 0; i < (int)inorder.size(); i++) pos[inorder[i]] = i;
    // next preorder index (next root to place)
    int next = 0;
    return build(preorder, pos, next, 0, inorder.size() - 1);
}
```

The values must be **distinct**: with duplicates, the root's position in inorder is ambiguous. Postorder plus inorder works the same way, reading postorder from the back and building the **right** subtree first. Preorder plus postorder isn't enough in general: a node with one child gives the same sequences whether that child is on the left or the right.

### Balanced BST from a sorted array

*Convert sorted array to binary search tree*: make the middle value the root, then build the left half into the left subtree and the right half into the right. At every node the two halves differ in size by at most one, so the result is **height-balanced**, with height ⌊log₂ n⌋. It runs in O(n) time with O(log n) recursion depth. Pass index bounds rather than slices: slicing copies, which turns it into O(n log n).

```python
def sorted_array_to_bst(nums):
    # Middle value as root splits rest into halves of equal size (or 1 apart)
    # Pass indices, not slices, keeping it O(n)
    def build(lo, hi):
        if lo > hi:
            return None
        mid = (lo + hi) // 2
        root = TreeNode(nums[mid])
        root.left = build(lo, mid - 1)
        root.right = build(mid + 1, hi)
        return root

    return build(0, len(nums) - 1)
```

```java
TreeNode sortedArrayToBST(int[] nums) {
    // Middle value as root splits rest into halves of equal size (or 1 apart)
    return build(nums, 0, nums.length - 1);
}

TreeNode build(int[] nums, int lo, int hi) {
    if (lo > hi) return null;
    // middle, written to avoid int overflow
    int mid = lo + (hi - lo) / 2;
    TreeNode root = new TreeNode(nums[mid]);
    root.left = build(nums, lo, mid - 1);
    root.right = build(nums, mid + 1, hi);
    return root;
}
```

```cpp
TreeNode* build(const vector<int>& nums, int lo, int hi) {
    if (lo > hi) return nullptr;
    // middle, written to avoid int overflow
    int mid = lo + (hi - lo) / 2;
    TreeNode* root = new TreeNode(nums[mid]);
    root->left = build(nums, lo, mid - 1);
    root->right = build(nums, mid + 1, hi);
    return root;
}

TreeNode* sortedArrayToBST(const vector<int>& nums) {
    // Middle value as root splits rest into halves of equal size (or 1 apart)
    return build(nums, 0, nums.size() - 1);
}
```

A sorted linked list converts the same way, finding each middle with fast and slow pointers (see [linked lists](/learn/linked-lists)).

### Subtree check by serialising

*Subtree of another tree*: is `sub` identical to some subtree of `root`? Comparing `sub` with the subtree at every node is O(m · n). The faster route serialises both trees in preorder, writing a marker for every null child, and checks whether `sub`'s string occurs inside `root`'s.

The null markers matter. Without them, different shapes give the same string: a root 1 with a left child 2 and a root 1 with a right child 2 both read `1, 2`. With them, a preorder string describes exactly one tree, and every subtree's string is a contiguous piece of the whole tree's string. Put a separator in front of each value as well, or the value `2` would match inside `12`.

```python
def is_subtree(root, sub_root):
    # Preorder with null markers describes one tree only
    # So sub_root is subtree exactly when its string occurs in root's
    def serialise(node, out):
        # null marker keeps shapes apart
        if node is None:
            out.append("#")
            return
        # comma in front stops 2 matching inside 12
        out.append("," + str(node.val))
        serialise(node.left, out)
        serialise(node.right, out)

    big, small = [], []
    serialise(root, big)
    serialise(sub_root, small)
    return "".join(small) in "".join(big)
```

```java
boolean isSubtree(TreeNode root, TreeNode subRoot) {
    // Preorder with null markers describes one tree only
    // So subRoot is subtree exactly when its string occurs in root's
    StringBuilder big = new StringBuilder(), small = new StringBuilder();
    serialise(root, big);
    serialise(subRoot, small);
    return big.indexOf(small.toString()) >= 0;
}

void serialise(TreeNode node, StringBuilder out) {
    // null marker keeps shapes apart
    if (node == null) {
        out.append('#');
        return;
    }
    // comma in front stops 2 matching inside 12
    out.append(',').append(node.val);
    serialise(node.left, out);
    serialise(node.right, out);
}
```

```cpp
void serialise(TreeNode* node, string& out) {
    // null marker keeps shapes apart
    if (!node) {
        out += '#';
        return;
    }
    // comma in front stops 2 matching inside 12
    out += ',' + to_string(node->val);
    serialise(node->left, out);
    serialise(node->right, out);
}

bool isSubtree(TreeNode* root, TreeNode* subRoot) {
    // Preorder with null markers describes one tree only
    // So subRoot is subtree exactly when its string occurs in root's
    string big, small;
    serialise(root, big);
    serialise(subRoot, small);
    return big.find(small) != string::npos;
}
```

Building the strings is O(m + n). Python's `in` is fast in practice; Java's `indexOf` and C++'s `find` can take O(m · n) in the worst case, and KMP makes the search O(m + n) for sure. The same serialisation is the usual answer to *serialize and deserialize binary tree*, and with each subtree's string as a hash key it finds *duplicate subtrees*.

### From a preorder string with depth markers

*Recover a tree from preorder traversal*: the input is a preorder listing in which each value is preceded by as many dashes as its depth, like `"1-2--3--4-5--6--7"`. If a node has one child, it's the left one. Rebuild the tree.

Preorder lists each node right after its parent's earlier children are fully listed, so you only ever need the **current root-to-node path**. Keep it as a stack:

1. Read the dashes (the depth `d`) and the number.
2. Pop the stack until it holds exactly `d` nodes. They are the ancestors at depths `0..d−1`, and the top is the parent.
3. Attach the new node as the parent's left child if that's empty, otherwise as its right child. Push it.

```diagram
{"type":"tree","values":[1,2,5,3,4,6,7],"order":[1,2,3,4,5,6,7],"caption":"\"1-2--3--4-5--6--7\". When 5 (depth 1) arrives, the path is 1, 2, 4; popping down to one node leaves 1, so 5 becomes 1's right child."}
```

```python
def recover_from_preorder(traversal):
    # Dashes before value = its depth; preorder lists each parent before children
    # Node at depth d hangs under path[d - 1], so pop path to length d first
    # Parent's first child goes left, second goes right
    # path (stack of nodes from root down to last placed node)
    path = []
    i = 0
    while i < len(traversal):
        depth = 0
        while traversal[i] == "-":
            depth += 1
            i += 1
        start = i
        while i < len(traversal) and traversal[i].isdigit():
            i += 1
        node = TreeNode(int(traversal[start:i]))
        # leave only ancestors at depths 0..depth-1
        while len(path) > depth:
            path.pop()
        if path:
            parent = path[-1]
            if parent.left is None:
                parent.left = node
            else:
                parent.right = node
        path.append(node)
    # bottom of stack is root
    return path[0]
```

```java
TreeNode recoverFromPreorder(String traversal) {
    // Dashes before value = its depth; preorder lists each parent before children
    // Node at depth d hangs under path[d - 1], so pop path to length d first
    // Parent's first child goes left, second goes right
    // path (stack of nodes from root down to last placed node)
    Deque<TreeNode> path = new ArrayDeque<>();
    int i = 0, n = traversal.length();
    while (i < n) {
        int depth = 0;
        while (traversal.charAt(i) == '-') {
            depth++;
            i++;
        }
        int val = 0;
        while (i < n && Character.isDigit(traversal.charAt(i))) {
            val = val * 10 + (traversal.charAt(i++) - '0');
        }
        TreeNode node = new TreeNode(val);
        // leave only ancestors at depths 0..depth-1
        while (path.size() > depth) path.pop();
        if (!path.isEmpty()) {
            TreeNode parent = path.peek();
            if (parent.left == null) parent.left = node;
            else parent.right = node;
        }
        path.push(node);
    }
    // bottom of stack is root
    return path.peekLast();
}
```

```cpp
TreeNode* recoverFromPreorder(const string& traversal) {
    // Dashes before value = its depth; preorder lists each parent before children
    // Node at depth d hangs under path[d - 1], so pop path to length d first
    // Parent's first child goes left, second goes right
    // path (stack of nodes from root down to last placed node)
    vector<TreeNode*> path;
    size_t i = 0, n = traversal.size();
    while (i < n) {
        size_t depth = 0;
        while (traversal[i] == '-') {
            depth++;
            i++;
        }
        int val = 0;
        while (i < n && isdigit(traversal[i])) val = val * 10 + (traversal[i++] - '0');
        TreeNode* node = new TreeNode(val);
        // leave only ancestors at depths 0..depth-1
        while (path.size() > depth) path.pop_back();
        if (!path.empty()) {
            TreeNode* parent = path.back();
            if (!parent->left) parent->left = node;
            else parent->right = node;
        }
        path.push_back(node);
    }
    // bottom of stack is root
    return path[0];
}
```

**O(n)** time, O(h) space for the path. Pitfalls: values with **more than one digit** (read the whole number, not one character), popping to the wrong length (the stack must hold `d` nodes, not `d + 1`), and returning the top of the stack instead of the bottom. The same "stack of the current path" idea parses indented outlines and file listings (*longest absolute file path* counts tabs instead of dashes).

## Common patterns

Most tree problems are one of these shapes:

1. **Return a value up the tree (postorder).** Ask each child for its answer, combine, return. Height is `1 + max(height(left), height(right))`; diameter, balanced-check and max path sum are the same idea with a little extra state.
2. **Pass information down (preorder).** Carry the path so far, a running sum, or a `(low, high)` range into the recursive call: path sum, validate BST, good nodes.
3. **Level by level (BFS).** Anything mentioning levels, depth from the top, or the closest node.
4. **Two trees at once.** Recurse on matching pairs: same tree, symmetric tree, merge trees.
5. **Lowest common ancestor.** In a plain binary tree, a node is the LCA if `p` and `q` are found in different subtrees (or it is one of them). In a BST, walk down from the root: the first node whose value lies between `p` and `q` is the answer.

```diagram
{"type":"tree","values":[3,5,1,6,2,0,8,null,null,7,4],"highlight":[5,4,7],"notes":{"5":"LCA"},"caption":"The lowest common ancestor of 7 and 4 is 5: the deepest node with both below it."}
```

## Returning state up the tree

Pattern 1 above returns one number per subtree. Harder problems return a small bundle of facts, or one state out of a fixed set, and each node decides from its children's answers. It's still one postorder pass: O(n) time, O(h) stack.

### Largest BST subtree by sum

*Maximum sum BST in binary tree*: the tree isn't a BST, but some of its subtrees are; return the largest sum of keys in any of them (0 if every one is negative, since an empty tree counts). Checking each subtree separately is O(n²). Instead each call returns four facts about its subtree: **is it a BST, its minimum, its maximum, its sum**.

1. Recurse into both children first.
2. The node roots a BST when both children do and `left max < node.val < right min`. Comparing with the children's values alone isn't enough; the whole left subtree must be smaller.
3. If so, its minimum is the left minimum (or the node's own value when the left side is empty), its maximum likewise on the right, and its sum is `left sum + val + right sum`. Update the best answer.
4. If not, return "not a BST". No ancestor can be a BST either, so the other three values no longer matter.

The empty subtree returns "BST, min +∞, max −∞, sum 0". Those bounds make any parent's comparison pass, so leaves and one-child nodes need no special code.

```python
def max_sum_bst(root):
    # Postorder returns (is_bst, min, max, sum) for each subtree
    # Node roots BST if both sides do and left max < val < right min
    best = 0

    def walk(node):
        nonlocal best
        # empty = BST whose bounds pass any check (min inf, max -inf)
        if node is None:
            return True, inf, -inf, 0
        l_bst, l_min, l_max, l_sum = walk(node.left)
        r_bst, r_min, r_max, r_sum = walk(node.right)
        if l_bst and r_bst and l_max < node.val < r_min:
            total = l_sum + node.val + r_sum
            best = max(best, total)
            # min/max fall back to node.val when one side is empty
            return True, min(l_min, node.val), max(r_max, node.val), total
        # not BST, so no ancestor can be either
        return False, 0, 0, 0

    walk(root)
    return best
```

```java
int best = 0;

int maxSumBST(TreeNode root) {
    // Postorder returns {isBst, min, max, sum} for each subtree
    // Node roots BST if both sides do and left max < val < right min
    walk(root);
    return best;
}

int[] walk(TreeNode node) {
    // empty = BST whose bounds pass any check (min MAX, max MIN)
    if (node == null) return new int[]{1, Integer.MAX_VALUE, Integer.MIN_VALUE, 0};
    int[] l = walk(node.left), r = walk(node.right);
    if (l[0] == 1 && r[0] == 1 && l[2] < node.val && node.val < r[1]) {
        int total = l[3] + node.val + r[3];
        best = Math.max(best, total);
        // min/max fall back to node.val when one side is empty
        return new int[]{1, Math.min(l[1], node.val), Math.max(r[2], node.val), total};
    }
    // not BST, so no ancestor can be either
    return new int[]{0, 0, 0, 0};
}
```

```cpp
struct Info { bool bst; int lo, hi, sum; };

Info walk(TreeNode* node, int& best) {
    // empty = BST whose bounds pass any check (lo INT_MAX, hi INT_MIN)
    if (!node) return {true, INT_MAX, INT_MIN, 0};
    Info l = walk(node->left, best), r = walk(node->right, best);
    if (l.bst && r.bst && l.hi < node->val && node->val < r.lo) {
        int total = l.sum + node->val + r.sum;
        best = max(best, total);
        // lo/hi fall back to node->val when one side is empty
        return {true, min(l.lo, node->val), max(r.hi, node->val), total};
    }
    // not BST, so no ancestor can be either
    return {false, 0, 0, 0};
}

int maxSumBST(TreeNode* root) {
    // Postorder returns {bst, lo, hi, sum} for each subtree
    // Node roots BST if both sides do and left hi < val < right lo
    int best = 0;
    walk(root, best);
    return best;
}
```

Return a size instead of a sum and the same code finds the *largest BST subtree* by node count.

### Binary tree cameras

*Binary tree cameras*: a camera on a node watches its parent, itself and its children. Find the fewest cameras that watch every node. The greedy insight: **never put a camera on a leaf**. The leaf's parent watches the leaf too, and more besides. So decide bottom-up, in postorder, with each node reporting one of three states to its parent:

| State | Meaning | When |
|---|---|---|
| `NEEDS` | not watched yet | neither child has a camera, and neither needs one |
| `CAMERA` | has a camera | at least one child is `NEEDS` |
| `COVERED` | watched, no camera | a child has a camera |

Check the rules in that order: an uncovered child forces a camera here, because this node is the last one that can watch it. A missing child reports `COVERED`: it needs nothing and watches nothing. Finally the root has no parent, so if it reports `NEEDS`, add one more camera.

```diagram
{"type":"tree","values":[1,2,null,3,null,4,null,null,5],"highlight":[1,4],"notes":{"5":"NEEDS","4":"CAMERA","3":"COVERED","2":"NEEDS","1":"CAMERA"},"caption":"Leaf 5 needs a watcher, so 4 takes a camera. 3 is covered, 2 is not, so 1 takes the second camera. Two cameras in total."}
```

```python
def min_camera_cover(root):
    # Postorder; each node reports its state to parent
    # Leaves never get camera; their parent does, covering more nodes
    # NEEDS (not covered yet), CAMERA (has one), COVERED (no camera, but watched)
    NEEDS, CAMERA, COVERED = 0, 1, 2
    cameras = 0

    def state(node):
        nonlocal cameras
        # missing child needs nothing and covers nothing
        if node is None:
            return COVERED
        left, right = state(node.left), state(node.right)
        # uncovered child, so only camera here can cover it
        if left == NEEDS or right == NEEDS:
            cameras += 1
            return CAMERA
        if left == CAMERA or right == CAMERA:
            return COVERED
        # leave it to parent
        return NEEDS

    # root has no parent to cover it
    if state(root) == NEEDS:
        cameras += 1
    return cameras
```

```java
// NEEDS (not covered yet), CAMERA (has one), COVERED (no camera, but watched)
static final int NEEDS = 0, CAMERA = 1, COVERED = 2;
int cameras = 0;

int minCameraCover(TreeNode root) {
    // Postorder; each node reports its state to parent
    // Leaves never get camera; their parent does, covering more nodes
    // root has no parent to cover it
    if (state(root) == NEEDS) cameras++;
    return cameras;
}

int state(TreeNode node) {
    // missing child needs nothing and covers nothing
    if (node == null) return COVERED;
    int left = state(node.left), right = state(node.right);
    // uncovered child, so only camera here can cover it
    if (left == NEEDS || right == NEEDS) {
        cameras++;
        return CAMERA;
    }
    if (left == CAMERA || right == CAMERA) return COVERED;
    // leave it to parent
    return NEEDS;
}
```

```cpp
// NEEDS (not covered yet), CAMERA (has one), COVERED (no camera, but watched)
enum State { NEEDS, CAMERA, COVERED };

State state(TreeNode* node, int& cameras) {
    // missing child needs nothing and covers nothing
    if (!node) return COVERED;
    State left = state(node->left, cameras), right = state(node->right, cameras);
    // uncovered child, so only camera here can cover it
    if (left == NEEDS || right == NEEDS) {
        cameras++;
        return CAMERA;
    }
    if (left == CAMERA || right == CAMERA) return COVERED;
    // leave it to parent
    return NEEDS;
}

int minCameraCover(TreeNode* root) {
    // Postorder; each node reports its state to parent
    // Leaves never get camera; their parent does, covering more nodes
    int cameras = 0;
    // root has no parent to cover it
    if (state(root, cameras) == NEEDS) cameras++;
    return cameras;
}
```

The two classic bugs are treating a missing child as `NEEDS`, which puts a camera on every leaf, and forgetting the final check on the root.

## Rerooting: an answer for every root

Some questions want an answer for every node as if that node were the root. *Sum of distances in tree* gives an undirected tree of `n` nodes and asks, for each node, the total distance to all the others. A BFS from every node is O(n²). **Rerooting** finds all `n` answers in O(n) with two passes:

1. **Root the tree at 0 and go children first.** Compute `size[v]`, the number of nodes in `v`'s subtree, and `ans[0]`, the sum of all depths. The edge above `v` lies on the path from 0 to each of the `size[v]` nodes below it, so `ans[0]` is the sum of `size[v]` over every `v` except the root.
2. **Go parents first and move the root across each edge.** Moving it from parent `p` to child `c` brings the `size[c]` nodes in `c`'s subtree one step closer and pushes the other `n − size[c]` one step farther: `ans[c] = ans[p] − size[c] + (n − size[c]) = ans[p] + n − 2 · size[c]`.

```diagram
{"type":"graph","nodes":["0","1","2","3","4","5"],"edges":[["0","1"],["0","2"],["2","3"],["2","4"],["2","5"]],"layout":"layers","notes":{"0":"8","1":"12","2":"6","3":"10","4":"10","5":"10"},"caption":"n = 6. Rooted at 0 the total is 8. Moving to 2 (size 4): 8 + 6 − 8 = 6. Moving from 2 to 3 (size 1): 6 + 6 − 2 = 10."}
```

```python
def sum_of_distances_in_tree(n, edges):
    # Pass 1 (children first) finds size[v] and ans[0]
    # Pass 2 (parents first) moves root across each edge
    # Root moving to child brings size[child] nodes 1 closer, n - size[child] 1 farther
    adj = [[] for _ in range(n)]
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)
    # BFS order from 0, so each parent comes before its children
    parent = [-1] * n
    order = [0]
    for v in order:
        for u in adj[v]:
            if u != parent[v]:
                parent[u] = v
                order.append(u)
    size = [1] * n
    ans = [0] * n
    # children first
    for v in reversed(order[1:]):
        size[parent[v]] += size[v]
        # edge above v lies on path from 0 to each of size[v] nodes
        ans[0] += size[v]
    # parents first
    for v in order[1:]:
        ans[v] = ans[parent[v]] + n - 2 * size[v]
    return ans
```

```java
int[] sumOfDistancesInTree(int n, int[][] edges) {
    // Pass 1 (children first) finds size[v] and ans[0]
    // Pass 2 (parents first) moves root across each edge
    // Root moving to child brings size[child] nodes 1 closer, n - size[child] 1 farther
    List<List<Integer>> adj = new ArrayList<>();
    for (int i = 0; i < n; i++) adj.add(new ArrayList<>());
    for (int[] e : edges) {
        adj.get(e[0]).add(e[1]);
        adj.get(e[1]).add(e[0]);
    }
    // BFS order from 0, so each parent comes before its children
    int[] parent = new int[n], order = new int[n];
    parent[0] = -1;
    int filled = 1;
    for (int i = 0; i < n; i++) {
        int v = order[i];
        for (int u : adj.get(v)) {
            if (u != parent[v]) {
                parent[u] = v;
                order[filled++] = u;
            }
        }
    }
    int[] size = new int[n], ans = new int[n];
    Arrays.fill(size, 1);
    // children first
    for (int i = n - 1; i > 0; i--) {
        int v = order[i];
        size[parent[v]] += size[v];
        // edge above v lies on path from 0 to each of size[v] nodes
        ans[0] += size[v];
    }
    // parents first
    for (int i = 1; i < n; i++) {
        int v = order[i];
        ans[v] = ans[parent[v]] + n - 2 * size[v];
    }
    return ans;
}
```

```cpp
vector<int> sumOfDistancesInTree(int n, const vector<vector<int>>& edges) {
    // Pass 1 (children first) finds size[v] and ans[0]
    // Pass 2 (parents first) moves root across each edge
    // Root moving to child brings size[child] nodes 1 closer, n - size[child] 1 farther
    vector<vector<int>> adj(n);
    for (auto& e : edges) {
        adj[e[0]].push_back(e[1]);
        adj[e[1]].push_back(e[0]);
    }
    // BFS order from 0, so each parent comes before its children
    vector<int> parent(n, -1), order = {0};
    for (size_t i = 0; i < order.size(); i++) {
        int v = order[i];
        for (int u : adj[v]) {
            if (u != parent[v]) {
                parent[u] = v;
                order.push_back(u);
            }
        }
    }
    vector<int> size(n, 1), ans(n, 0);
    // children first
    for (int i = n - 1; i > 0; i--) {
        int v = order[i];
        size[parent[v]] += size[v];
        // edge above v lies on path from 0 to each of size[v] nodes
        ans[0] += size[v];
    }
    // parents first
    for (int i = 1; i < n; i++) {
        int v = order[i];
        ans[v] = ans[parent[v]] + n - 2 * size[v];
    }
    return ans;
}
```

**O(n) time and space.** The code takes a BFS order once and walks it backwards for the first pass and forwards for the second, so a 30,000-node path can't overflow the recursion stack. The pattern works whenever moving the root across one edge changes the answer by an amount you can compute from subtree data such as sizes or sums. *Minimum edge reversals so every node is reachable* is another problem built on it.

## Pitfalls and complexity

| Operation | Balanced | Worst case (stick) |
|---|---|---|
| Any traversal | O(n) time, O(log n) stack | O(n) time, O(n) stack |
| BST search / insert / delete | O(log n) | O(n) |
| BFS queue | O(n) at the widest level | O(1) per level |

- Handle the empty tree (`root` is null) before anything else.
- Decide whether "height" counts edges or nodes and stay consistent.
- Recursion depth: in Python, a 10⁵-node stick will hit the recursion limit; use an explicit stack or `sys.setrecursionlimit`.
- When a function must return two things (say, the height *and* whether the subtree is balanced), return a pair or use a sentinel like `-1` for "unbalanced" rather than recomputing heights, which turns O(n) into O(n²).
