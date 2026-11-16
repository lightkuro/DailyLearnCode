import { JAVA_GUARD_CLASSES, instrumentJava } from './javaGuard';
import { countLines, type Program, type Signature, type ValueType } from './types';

const JAVA_TYPE: Record<ValueType, string> = {
  int: 'int',
  long: 'long',
  double: 'double',
  bool: 'boolean',
  string: 'String',
  char: 'char',
  'int[]': 'int[]',
  'long[]': 'long[]',
  'double[]': 'double[]',
  'bool[]': 'boolean[]',
  'string[]': 'String[]',
  'char[]': 'char[]',
  'int[][]': 'int[][]',
  'string[][]': 'String[][]',
  'char[][]': 'char[][]',
  'list<int>': 'List<Integer>',
  'list<string>': 'List<String>',
  'list<list<int>>': 'List<List<Integer>>',
  'list<list<string>>': 'List<List<String>>',
  ListNode: 'ListNode',
  TreeNode: 'TreeNode',
};

const CONV: Record<ValueType, string> = {
  int: 'toInt',
  long: 'toLong',
  double: 'toDouble',
  bool: 'toBool',
  string: 'toStr',
  char: 'toChar',
  'int[]': 'toIntArr',
  'long[]': 'toLongArr',
  'double[]': 'toDoubleArr',
  'bool[]': 'toBoolArr',
  'string[]': 'toStrArr',
  'char[]': 'toCharArr',
  'int[][]': 'toIntArr2',
  'string[][]': 'toStrArr2',
  'char[][]': 'toCharArr2',
  'list<int>': 'toIntList',
  'list<string>': 'toStrList',
  'list<list<int>>': 'toIntList2',
  'list<list<string>>': 'toStrList2',
  ListNode: 'toListNode',
  TreeNode: 'toTree',
};

const DEFAULT_RETURN: Partial<Record<ValueType, string>> = {
  int: '0',
  long: '0',
  double: '0.0',
  bool: 'false',
  char: "' '",
};

const LISTNODE_DOC = `/**
 * Definition for singly-linked list (already provided):
 * class ListNode {
 *     int val; ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */
`;
const TREENODE_DOC = `/**
 * Definition for a binary tree node (already provided):
 * class TreeNode {
 *     int val; TreeNode left; TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
 * }
 */
`;

export function javaStarter(sig: Signature): string {
  const params = sig.params.map((p) => `${JAVA_TYPE[p.type]} ${p.name}`).join(', ');
  const ret = sig.returns === 'void' ? 'void' : JAVA_TYPE[sig.returns];
  const docs =
    (sig.params.some((p) => p.type === 'ListNode') || sig.returns === 'ListNode' ? LISTNODE_DOC : '') +
    (sig.params.some((p) => p.type === 'TreeNode') || sig.returns === 'TreeNode' ? TREENODE_DOC : '');
  const body =
    sig.returns === 'void'
      ? `        // modify ${sig.outputParam} in-place\n`
      : `        \n        return ${DEFAULT_RETURN[sig.returns] ?? 'null'};\n`;
  return `${docs}class Solution {\n    public ${ret} ${sig.fn}(${params}) {\n${body}    }\n}\n`;
}

const PRELUDE = `import java.util.*;
import java.util.function.*;
import java.util.stream.*;
import java.math.*;
import java.io.*;
`;

const NODES = `
class ListNode {
    int val; ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}
class TreeNode {
    int val; TreeNode left; TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}
`;

const HARNESS = String.raw`
@SuppressWarnings("unchecked")
public class Main {
    static final String NONCE = "__NONCE__";
    static final int OFFSET = __OFFSET__;
    static final int USER_LINES = __USER_LINES__;
    static final boolean NODE_RET = __NODE_RET__;

    // ---------- tiny JSON reader ----------
    static String js; static int jp;
    static Object parse(String s) { js = s; jp = 0; Object v = val(); return v; }
    static void ws() { while (jp < js.length() && Character.isWhitespace(js.charAt(jp))) jp++; }
    static Object val() {
        ws();
        char c = js.charAt(jp);
        if (c == '[') {
            jp++; List<Object> out = new ArrayList<>(); ws();
            if (js.charAt(jp) == ']') { jp++; return out; }
            while (true) { out.add(val()); ws(); char d = js.charAt(jp++); if (d == ']') return out; }
        }
        if (c == '"') return str();
        if (js.startsWith("null", jp)) { jp += 4; return null; }
        if (js.startsWith("true", jp)) { jp += 4; return Boolean.TRUE; }
        if (js.startsWith("false", jp)) { jp += 5; return Boolean.FALSE; }
        int st = jp; boolean dbl = false;
        while (jp < js.length() && "+-0123456789.eE".indexOf(js.charAt(jp)) >= 0) { char d = js.charAt(jp); if (d == '.' || d == 'e' || d == 'E') dbl = true; jp++; }
        String n = js.substring(st, jp);
        if (dbl) return Double.parseDouble(n);
        return Long.parseLong(n);
    }
    static String str() {
        jp++; StringBuilder sb = new StringBuilder();
        while (true) {
            char c = js.charAt(jp++);
            if (c == '"') return sb.toString();
            if (c == '\\') {
                char e = js.charAt(jp++);
                switch (e) {
                    case 'n': sb.append('\n'); break; case 't': sb.append('\t'); break;
                    case 'r': sb.append('\r'); break; case 'b': sb.append('\b'); break;
                    case 'f': sb.append('\f'); break;
                    case 'u': sb.append((char) Integer.parseInt(js.substring(jp, jp + 4), 16)); jp += 4; break;
                    default: sb.append(e);
                }
            } else sb.append(c);
        }
    }

    // ---------- converters ----------
    static List<Object> L(Object o) { return (List<Object>) o; }
    static int toInt(Object o) { return ((Number) o).intValue(); }
    static long toLong(Object o) { return ((Number) o).longValue(); }
    static double toDouble(Object o) { return ((Number) o).doubleValue(); }
    static boolean toBool(Object o) { return (Boolean) o; }
    static String toStr(Object o) { return (String) o; }
    static char toChar(Object o) { String s = (String) o; return s.isEmpty() ? '\0' : s.charAt(0); }
    static int[] toIntArr(Object o) { List<Object> l = L(o); int[] r = new int[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toInt(l.get(i)); return r; }
    static long[] toLongArr(Object o) { List<Object> l = L(o); long[] r = new long[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toLong(l.get(i)); return r; }
    static double[] toDoubleArr(Object o) { List<Object> l = L(o); double[] r = new double[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toDouble(l.get(i)); return r; }
    static boolean[] toBoolArr(Object o) { List<Object> l = L(o); boolean[] r = new boolean[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toBool(l.get(i)); return r; }
    static String[] toStrArr(Object o) { List<Object> l = L(o); String[] r = new String[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toStr(l.get(i)); return r; }
    static char[] toCharArr(Object o) { List<Object> l = L(o); char[] r = new char[l.size()]; for (int i = 0; i < r.length; i++) r[i] = toChar(l.get(i)); return r; }
    static int[][] toIntArr2(Object o) { List<Object> l = L(o); int[][] r = new int[l.size()][]; for (int i = 0; i < r.length; i++) r[i] = toIntArr(l.get(i)); return r; }
    static String[][] toStrArr2(Object o) { List<Object> l = L(o); String[][] r = new String[l.size()][]; for (int i = 0; i < r.length; i++) r[i] = toStrArr(l.get(i)); return r; }
    static char[][] toCharArr2(Object o) { List<Object> l = L(o); char[][] r = new char[l.size()][]; for (int i = 0; i < r.length; i++) r[i] = toCharArr(l.get(i)); return r; }
    static List<Integer> toIntList(Object o) { List<Integer> r = new ArrayList<>(); for (Object e : L(o)) r.add(toInt(e)); return r; }
    static List<String> toStrList(Object o) { List<String> r = new ArrayList<>(); for (Object e : L(o)) r.add(toStr(e)); return r; }
    static List<List<Integer>> toIntList2(Object o) { List<List<Integer>> r = new ArrayList<>(); for (Object e : L(o)) r.add(toIntList(e)); return r; }
    static List<List<String>> toStrList2(Object o) { List<List<String>> r = new ArrayList<>(); for (Object e : L(o)) r.add(toStrList(e)); return r; }
    static ListNode toListNode(Object o) {
        ListNode head = new ListNode(0), cur = head;
        if (o != null) for (Object e : L(o)) { cur.next = new ListNode(toInt(e)); cur = cur.next; }
        return head.next;
    }
    static TreeNode toTree(Object o) {
        List<Object> a = o == null ? new ArrayList<>() : L(o);
        if (a.isEmpty() || a.get(0) == null) return null;
        TreeNode root = new TreeNode(toInt(a.get(0)));
        ArrayDeque<TreeNode> q = new ArrayDeque<>(); q.add(root);
        int i = 1;
        while (i < a.size() && !q.isEmpty()) {
            TreeNode n = q.poll();
            if (i < a.size() && a.get(i) != null) { n.left = new TreeNode(toInt(a.get(i))); q.add(n.left); } i++;
            if (i < a.size() && a.get(i) != null) { n.right = new TreeNode(toInt(a.get(i))); q.add(n.right); } i++;
        }
        return root;
    }

    // ---------- JSON writer ----------
    static void q(StringBuilder sb, String s) {
        sb.append('"');
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '"' || c == '\\') sb.append('\\').append(c);
            else if (c == '\n') sb.append("\\n");
            else if (c == '\t') sb.append("\\t");
            else if (c == '\r') sb.append("\\r");
            else if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
            else sb.append(c);
        }
        sb.append('"');
    }
    static void ser(StringBuilder sb, Object o) {
        if (o == null) { sb.append("null"); return; }
        if (o instanceof Boolean || o instanceof Integer || o instanceof Long || o instanceof Short || o instanceof Byte) { sb.append(o); return; }
        if (o instanceof Double || o instanceof Float) { double d = ((Number) o).doubleValue(); if (Double.isNaN(d) || Double.isInfinite(d)) sb.append("null"); else sb.append(d); return; }
        if (o instanceof Character) { q(sb, String.valueOf(o)); return; }
        if (o instanceof String) { q(sb, (String) o); return; }
        if (o instanceof int[]) { int[] a = (int[]) o; sb.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); } sb.append(']'); return; }
        if (o instanceof long[]) { long[] a = (long[]) o; sb.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); } sb.append(']'); return; }
        if (o instanceof double[]) { double[] a = (double[]) o; sb.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); ser(sb, a[i]); } sb.append(']'); return; }
        if (o instanceof boolean[]) { boolean[] a = (boolean[]) o; sb.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); sb.append(a[i]); } sb.append(']'); return; }
        if (o instanceof char[]) { char[] a = (char[]) o; sb.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); q(sb, String.valueOf(a[i])); } sb.append(']'); return; }
        if (o instanceof Object[]) { Object[] a = (Object[]) o; sb.append('['); for (int i = 0; i < a.length; i++) { if (i > 0) sb.append(','); ser(sb, a[i]); } sb.append(']'); return; }
        if (o instanceof Collection) { sb.append('['); boolean first = true; for (Object e : (Collection<?>) o) { if (!first) sb.append(','); first = false; ser(sb, e); } sb.append(']'); return; }
        if (o instanceof ListNode) {
            sb.append('['); ListNode n = (ListNode) o; int k = 0;
            while (n != null && k <= 200000) { if (k > 0) sb.append(','); sb.append(n.val); n = n.next; k++; }
            sb.append(']'); return;
        }
        if (o instanceof TreeNode) {
            List<String> out = new ArrayList<>(); List<TreeNode> level = new ArrayList<>();
            level.add((TreeNode) o);
            int idx = 0;
            while (idx < level.size()) {
                TreeNode n = level.get(idx++);
                if (n == null) out.add("null");
                else { out.add(String.valueOf(n.val)); level.add(n.left); level.add(n.right); }
            }
            int end = out.size(); while (end > 0 && out.get(end - 1).equals("null")) end--;
            sb.append('['); for (int i = 0; i < end; i++) { if (i > 0) sb.append(','); sb.append(out.get(i)); } sb.append(']');
            return;
        }
        q(sb, o.toString());
    }

    static String describe(Throwable t) {
        String msg = t.getClass().getSimpleName();
        if (t.getMessage() != null) msg += ": " + t.getMessage().replace('\n', ' ');
        if (msg.length() > 400) msg = msg.substring(0, 400);
        for (StackTraceElement el : t.getStackTrace()) {
            int ln = el.getLineNumber() - OFFSET;
            if ("Main.java".equals(el.getFileName()) && ln >= 1 && ln <= USER_LINES) { msg += " (line " + ln + ")"; break; }
        }
        return msg;
    }

    public static void main(String[] args) throws Exception {
        // Optional 3rd arg: time budget in ms (browser only). Instrumented loops stop once it is spent.
        if (args.length > 2) LearnGuard.deadline = System.nanoTime() + Long.parseLong(args[2]) * 1_000_000L;
        String input;
        if (args.length > 0) { try (InputStream in = new FileInputStream(args[0])) { input = new String(in.readAllBytes(), "UTF-8"); } }
        else input = new String(System.in.readAllBytes(), "UTF-8");
        PrintStream origOut = System.out, origErr = System.err;
        PrintStream out = args.length > 1 ? new PrintStream(new FileOutputStream(args[1]), true, "UTF-8") : System.out;
        System.setOut(out); System.setErr(out);
        try {
            List<Object> tests = L(parse(input));
            for (int i = 0; i < tests.size(); i++) {
                List<Object> a = L(tests.get(i));
                try {
__CALL__
                    if (res == null && NODE_RET) res = new ArrayList<Object>();
                    StringBuilder sb = new StringBuilder(); ser(sb, res);
                    out.println("@@" + NONCE + " R " + i + " " + sb);
                } catch (LearnTimeout t) {
                    out.println("@@" + NONCE + " T " + i);
                    break;
                } catch (Throwable t) {
                    out.println("@@" + NONCE + " E " + i + " " + describe(t));
                }
                out.flush();
            }
        } finally {
            out.flush();
            System.setOut(origOut); System.setErr(origErr);
            if (out != origOut) out.close();
        }
    }
}
`;

/** Remove line and block comments (good enough for detecting declarations). */
export function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

export function javaProgram(sig: Signature, userCode: string, nonce: string): Program {
  // Only Main may be public in Main.java; LeetCode habits often write `public class Solution`.
  const code =
    instrumentJava(
      userCode
        .replace(/\r\n?/g, '\n')
        .replace(/\s+$/, '')
        .replace(/\bpublic\s+((?:final\s+)?class\s)/g, '$1'),
    ) + '\n';
  const ownNodes = /\bclass\s+(ListNode|TreeNode)\b/.test(stripComments(code));
  const userLineOffset = countLines(PRELUDE) - 1;
  const userLineCount = countLines(code) - 1;
  const decls = sig.params.map((p, i) => `                    ${JAVA_TYPE[p.type]} p${i} = ${CONV[p.type]}(a.get(${i}));`);
  const argList = sig.params.map((_, i) => `p${i}`).join(', ');
  let call: string;
  if (sig.returns === 'void') {
    const idx = sig.params.findIndex((p) => p.name === sig.outputParam);
    call = `                    new Solution().${sig.fn}(${argList});\n                    Object res = p${idx};`;
  } else {
    call = `                    Object res = new Solution().${sig.fn}(${argList});`;
  }
  const harness = HARNESS.replace('__NONCE__', nonce)
    .replace('__OFFSET__', String(userLineOffset))
    .replace('__USER_LINES__', String(userLineCount))
    .replace('__NODE_RET__', String(sig.returns === 'ListNode' || sig.returns === 'TreeNode'))
    .replace('__CALL__', [...decls, call].join('\n'));
  return { lang: 'java', source: PRELUDE + code + (ownNodes ? '' : NODES) + JAVA_GUARD_CLASSES + harness, files: {}, userLineOffset, userLineCount };
}
