import { lp64 } from './cppCompat';
import { stripComments } from './java';
import { countLines, type Program, type Signature, type ValueType } from './types';

const CPP_TYPE: Record<ValueType, string> = {
  int: 'int',
  long: 'long long',
  double: 'double',
  bool: 'bool',
  string: 'string',
  char: 'char',
  'int[]': 'vector<int>',
  'long[]': 'vector<long long>',
  'double[]': 'vector<double>',
  'bool[]': 'vector<bool>',
  'string[]': 'vector<string>',
  'char[]': 'vector<char>',
  'int[][]': 'vector<vector<int>>',
  'string[][]': 'vector<vector<string>>',
  'char[][]': 'vector<vector<char>>',
  'list<int>': 'vector<int>',
  'list<string>': 'vector<string>',
  'list<list<int>>': 'vector<vector<int>>',
  'list<list<string>>': 'vector<vector<string>>',
  ListNode: 'ListNode*',
  TreeNode: 'TreeNode*',
};

/** How a parameter appears in the method signature (LeetCode conventions). */
function paramDecl(t: ValueType, name: string): string {
  const ty = CPP_TYPE[t];
  return ty.startsWith('vector<') ? `${ty}& ${name}` : `${ty} ${name}`;
}

const DEFAULT_RETURN: Partial<Record<ValueType, string>> = {
  int: '0',
  long: '0',
  double: '0.0',
  bool: 'false',
  char: "' '",
  string: '""',
  ListNode: 'nullptr',
  TreeNode: 'nullptr',
};

const LISTNODE_DOC = `/**
 * Definition for singly-linked list (already provided):
 * struct ListNode {
 *     int val; ListNode *next;
 *     ListNode() : val(0), next(nullptr) {}
 *     ListNode(int x) : val(x), next(nullptr) {}
 *     ListNode(int x, ListNode *next) : val(x), next(next) {}
 * };
 */
`;
const TREENODE_DOC = `/**
 * Definition for a binary tree node (already provided):
 * struct TreeNode {
 *     int val; TreeNode *left; TreeNode *right;
 *     TreeNode() : val(0), left(nullptr), right(nullptr) {}
 *     TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
 *     TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
 * };
 */
`;

export function cppStarter(sig: Signature): string {
  const params = sig.params.map((p) => paramDecl(p.type, p.name)).join(', ');
  const ret = sig.returns === 'void' ? 'void' : CPP_TYPE[sig.returns];
  const docs =
    (sig.params.some((p) => p.type === 'ListNode') || sig.returns === 'ListNode' ? LISTNODE_DOC : '') +
    (sig.params.some((p) => p.type === 'TreeNode') || sig.returns === 'TreeNode' ? TREENODE_DOC : '');
  const body =
    sig.returns === 'void'
      ? `        // modify ${sig.outputParam} in-place\n`
      : `        \n        return ${DEFAULT_RETURN[sig.returns] ?? '{}'};\n`;
  return `${docs}class Solution {\npublic:\n    ${ret} ${sig.fn}(${params}) {\n${body}    }\n};\n`;
}

/**
 * Header included at the top of every C++ program. In the browser it is also precompiled (PCH)
 * once per session so each compile only parses the user's code.
 */
export const CPP_PRELUDE_H = `#pragma once
#include <algorithm>
#include <any>
#include <array>
#include <bit>
#include <bitset>
#include <cassert>
#include <cctype>
#include <cfloat>
#include <charconv>
#include <chrono>
#include <cinttypes>
#include <climits>
#include <cmath>
#include <compare>
#include <complex>
#include <concepts>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <ctime>
#include <deque>
#include <expected>
#include <format>
#include <forward_list>
#include <functional>
#include <initializer_list>
#include <iomanip>
#include <iostream>
#include <iterator>
#include <limits>
#include <list>
#include <map>
#include <memory>
#include <numbers>
#include <numeric>
#include <optional>
#include <queue>
#include <random>
#include <ranges>
#include <ratio>
#include <regex>
#include <set>
#include <span>
#include <sstream>
#include <stack>
#include <stdexcept>
#include <string>
#include <string_view>
#include <tuple>
#include <type_traits>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <valarray>
#include <variant>
#include <vector>
#if __has_include(<print>)
#include <print>
#endif
using namespace std;
#ifdef _LIBCPP_VERSION
// GCC's libstdc++ (LeetCode) has these extensions; the browser's libc++ doesn't.
template <class T> constexpr T __gcd(T a, T b) { return std::gcd(a, b); }
template <class T> constexpr int __lg(T n) { return static_cast<int>(std::bit_width(static_cast<std::make_unsigned_t<T>>(n))) - 1; }
#endif
`;

const NODES = `
#ifndef LEARN_NODES
#define LEARN_NODES
struct ListNode {
    int val; ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};
struct TreeNode {
    int val; TreeNode *left; TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};
#endif
`;

const HARNESS = String.raw`
namespace learn_h {
struct J { int t = 0; bool b = false; std::string num, s; std::vector<J> a; }; // t: 0 null 1 bool 2 num 3 str 4 arr
struct Parser {
    const std::string& s; size_t i = 0;
    explicit Parser(const std::string& src) : s(src) {}
    void ws() { while (i < s.size() && isspace((unsigned char)s[i])) i++; }
    J val() {
        ws(); J j;
        char c = s[i];
        if (c == '[') {
            i++; j.t = 4; ws();
            if (s[i] == ']') { i++; return j; }
            while (true) { j.a.push_back(val()); ws(); char d = s[i++]; if (d == ']') return j; }
        }
        if (c == '"') { j.t = 3; j.s = str(); return j; }
        if (s.compare(i, 4, "null") == 0) { i += 4; return j; }
        if (s.compare(i, 4, "true") == 0) { i += 4; j.t = 1; j.b = true; return j; }
        if (s.compare(i, 5, "false") == 0) { i += 5; j.t = 1; return j; }
        size_t st = i;
        while (i < s.size() && strchr("+-0123456789.eE", s[i])) i++;
        j.t = 2; j.num = s.substr(st, i - st); return j;
    }
    std::string str() {
        i++; std::string out;
        while (true) {
            char c = s[i++];
            if (c == '"') return out;
            if (c == '\\') {
                char e = s[i++];
                if (e == 'n') out += '\n'; else if (e == 't') out += '\t'; else if (e == 'r') out += '\r';
                else if (e == 'b') out += '\b'; else if (e == 'f') out += '\f';
                else if (e == 'u') {
                    unsigned cp = (unsigned)strtoul(s.substr(i, 4).c_str(), nullptr, 16); i += 4;
                    if (cp < 0x80) out += (char)cp;
                    else if (cp < 0x800) { out += (char)(0xC0 | (cp >> 6)); out += (char)(0x80 | (cp & 0x3F)); }
                    else { out += (char)(0xE0 | (cp >> 12)); out += (char)(0x80 | ((cp >> 6) & 0x3F)); out += (char)(0x80 | (cp & 0x3F)); }
                } else out += e;
            } else out += c;
        }
    }
};

inline void from(const J& j, int& o) { o = (int)strtoll(j.num.c_str(), nullptr, 10); }
inline void from(const J& j, long long& o) { o = strtoll(j.num.c_str(), nullptr, 10); }
inline void from(const J& j, double& o) { o = strtod(j.num.c_str(), nullptr); }
inline void from(const J& j, bool& o) { o = j.b; }
inline void from(const J& j, std::string& o) { o = j.s; }
inline void from(const J& j, char& o) { o = j.s.empty() ? '\0' : j.s[0]; }
template <class T> void from(const J& j, std::vector<T>& o) {
    o.clear();
    for (const J& e : j.a) { T x{}; from(e, x); o.push_back(x); }
}
inline void from(const J& j, ListNode*& o) {
    ListNode head; ListNode* cur = &head;
    for (const J& e : j.a) { int v; from(e, v); cur->next = new ListNode(v); cur = cur->next; }
    o = head.next;
}
inline void from(const J& j, TreeNode*& o) {
    o = nullptr;
    if (j.a.empty() || j.a[0].t == 0) return;
    int v; from(j.a[0], v); o = new TreeNode(v);
    std::vector<TreeNode*> q{o}; size_t qi = 0, i = 1;
    while (i < j.a.size() && qi < q.size()) {
        TreeNode* n = q[qi++];
        if (i < j.a.size() && j.a[i].t != 0) { from(j.a[i], v); n->left = new TreeNode(v); q.push_back(n->left); } i++;
        if (i < j.a.size() && j.a[i].t != 0) { from(j.a[i], v); n->right = new TreeNode(v); q.push_back(n->right); } i++;
    }
}

inline void quote(std::string& b, const std::string& s) {
    b += '"';
    for (unsigned char c : s) {
        if (c == '"' || c == '\\') { b += '\\'; b += (char)c; }
        else if (c == '\n') b += "\\n";
        else if (c == '\t') b += "\\t";
        else if (c == '\r') b += "\\r";
        else if (c < 0x20) { char buf[8]; snprintf(buf, sizeof buf, "\\u%04x", c); b += buf; }
        else b += (char)c;
    }
    b += '"';
}
inline void to(std::string& b, int v) { b += std::to_string(v); }
inline void to(std::string& b, long long v) { b += std::to_string(v); }
inline void to(std::string& b, long v) { b += std::to_string(v); }
inline void to(std::string& b, unsigned v) { b += std::to_string(v); }
inline void to(std::string& b, unsigned long v) { b += std::to_string(v); }
inline void to(std::string& b, unsigned long long v) { b += std::to_string(v); }
inline void to(std::string& b, double v) {
    if (std::isnan(v) || std::isinf(v)) { b += "null"; return; }
    char buf[64]; snprintf(buf, sizeof buf, "%.12g", v); b += buf;
}
inline void to(std::string& b, bool v) { b += v ? "true" : "false"; }
inline void to(std::string& b, char v) { quote(b, std::string(1, v)); }
inline void to(std::string& b, const std::string& v) { quote(b, v); }
inline void to(std::string& b, const char* v) { quote(b, v ? std::string(v) : std::string()); }
inline void to(std::string& b, ListNode* n) {
    b += '['; int k = 0;
    while (n && k <= 200000) { if (k) b += ','; b += std::to_string(n->val); n = n->next; k++; }
    b += ']';
}
inline void to(std::string& b, TreeNode* root) {
    std::vector<TreeNode*> lv{root}; std::vector<std::string> out;
    for (size_t i = 0; i < lv.size(); i++) {
        TreeNode* n = lv[i];
        if (!n) out.push_back("null");
        else { out.push_back(std::to_string(n->val)); lv.push_back(n->left); lv.push_back(n->right); }
    }
    while (!out.empty() && out.back() == "null") out.pop_back();
    b += '['; for (size_t i = 0; i < out.size(); i++) { if (i) b += ','; b += out[i]; } b += ']';
}
template <class T> void to(std::string& b, const std::vector<T>& v) {
    b += '[';
    for (size_t i = 0; i < v.size(); i++) { if (i) b += ','; to(b, static_cast<T>(v[i])); }
    b += ']';
}
} // namespace learn_h

int main() {
    using namespace learn_h;
    std::string input((std::istreambuf_iterator<char>(std::cin)), std::istreambuf_iterator<char>());
    Parser P(input);
    J tests = P.val();
    for (size_t i = 0; i < tests.a.size(); i++) {
        const J& a = tests.a[i];
__CALL__
        std::string out; to(out, res);
        std::cout << "@@" << "__NONCE__" << " R " << i << " " << out << std::endl;
    }
    return 0;
}
`;

export const CPP_PRELUDE_FILE = 'learn_prelude.h';

export function cppProgram(sig: Signature, userCode: string, nonce: string): Program {
  // `long` is 64-bit on LeetCode (64-bit Linux) but 32-bit in wasm32: see cppCompat.ts.
  const code = lp64(userCode.replace(/\r\n?/g, '\n').replace(/\s+$/, '') + '\n');
  const ownNodes = /\b(struct|class)\s+(ListNode|TreeNode)\b/.test(stripComments(code));
  const head = `#include "${CPP_PRELUDE_FILE}"\n${ownNodes ? '' : NODES}`;
  const userLineOffset = countLines(head) - 1;
  const userLineCount = countLines(code) - 1;
  const decls = sig.params.map((p, i) => `        ${CPP_TYPE[p.type]} p${i}{}; from(a.a[${i}], p${i});`);
  const argList = sig.params.map((_, i) => `p${i}`).join(', ');
  let call: string;
  if (sig.returns === 'void') {
    const idx = sig.params.findIndex((p) => p.name === sig.outputParam);
    call = `        Solution sol; sol.${sig.fn}(${argList});\n        auto& res = p${idx};`;
  } else {
    call = `        Solution sol; auto res = sol.${sig.fn}(${argList});`;
  }
  const harness = HARNESS.replace('__NONCE__', nonce).replace('__CALL__', [...decls, call].join('\n'));
  return {
    lang: 'cpp',
    source: head + code + harness,
    files: { [CPP_PRELUDE_FILE]: CPP_PRELUDE_H, 'bits/stdc++.h': `#pragma once\n#include "../${CPP_PRELUDE_FILE}"\n` },
    userLineOffset,
    userLineCount,
  };
}

/** Compiler flags shared by the browser (clang/wasm) and native validation (g++). LeetCode compiles C++23 at -O2. */
export const CPP_STD_FLAGS = ['-std=c++23', '-O2'];

/**
 * LeetCode runs C++ under sanitizers, so an out-of-range index or signed int overflow is a runtime error rather
 * than a silently wrong answer. Without a sanitizer runtime, these make the program trap instead:
 * container bounds checks (libc++ hardening / libstdc++ assertions) and trapping signed overflow.
 */
export const CPP_CHECK_FLAGS_CLANG = ['-D_LIBCPP_HARDENING_MODE=_LIBCPP_HARDENING_MODE_FAST', '-fsanitize=signed-integer-overflow', '-fsanitize-trap=signed-integer-overflow'];
export const CPP_CHECK_FLAGS_GCC = ['-D_GLIBCXX_ASSERTIONS', '-fsanitize=signed-integer-overflow', '-fsanitize-trap=signed-integer-overflow'];
