/* global cheerpjInit, cheerpjRunMain, cheerpOSAddStringFile, cjFileBlob */
// Java runtime frame: compiles with javac and runs inside CheerpJ (a JVM in WebAssembly).
// Talks to the parent page via postMessage (same origin only).
(function () {
  'use strict';
  var ORIGIN = location.origin;
  var JAVA_VERSION = 21;
  var MAX_OUTPUT = 2000000;

  // Each program is loaded through a fresh class loader so classes (and statics) from a previous run
  // are never reused inside the long-lived JVM.
  var LAUNCHER = [
    'import java.io.*;',
    'import java.lang.reflect.*;',
    'import java.net.*;',
    'public class LearnLauncher {',
    '  public static void main(String[] args) throws Exception {',
    '    new File(args[3]).delete();',
    '    try {',
    '      URL[] urls = { new File(args[0]).toURI().toURL() };',
    '      URLClassLoader cl = new URLClassLoader(urls, ClassLoader.getPlatformClassLoader());',
    '      Method m = cl.loadClass("Main").getMethod("main", String[].class);',
    '      m.invoke(null, (Object) new String[] { args[1], args[2], args[4] });',
    '    } catch (Throwable t) {',
    '      Throwable c = t instanceof InvocationTargetException && t.getCause() != null ? t.getCause() : t;',
    '      try (PrintStream ps = new PrintStream(new FileOutputStream(args[3]), true, "UTF-8")) {',
    '        ps.println(c.toString());',
    '      }',
    '    }',
    '  }',
    '}',
  ].join('\n');

  function post(msg) {
    parent.postMessage(msg, ORIGIN);
  }

  async function readText(path) {
    try {
      var blob = await cjFileBlob(path);
      var text = await blob.text();
      return text.length > MAX_OUTPUT ? text.slice(0, MAX_OUTPUT) : text;
    } catch (e) {
      return '';
    }
  }

  var ready = null;
  function init() {
    if (ready) return ready;
    ready = (async function () {
      post({ type: 'status', state: 'loading', message: 'Starting Java (CheerpJ)…' });
      await cheerpjInit({ version: JAVA_VERSION, status: 'none' });
      post({ type: 'status', state: 'loading', message: 'Warming up javac…' });
      // Note: /str/ is flat (no sub-directories) and javac's -Xstdout target directory must already exist.
      cheerpOSAddStringFile('/str/LearnLauncher.java', LAUNCHER);
      var rc = await cheerpjRunMain(
        'com.sun.tools.javac.Main', '',
        '-nowarn', '-encoding', 'UTF-8', '-Xstdout', '/files/learn-javac.txt',
        '-d', '/files/learn/launcher', '/str/LearnLauncher.java'
      );
      if (rc !== 0) throw new Error('javac failed: ' + (await readText('/files/learn-javac.txt')));
      post({ type: 'status', state: 'ready' });
    })();
    ready.catch(function (e) {
      ready = null;
      post({ type: 'status', state: 'error', message: 'Java failed to start: ' + (e && e.message ? e.message : e) });
    });
    return ready;
  }

  async function run(msg) {
    try {
      await init();
    } catch (e) {
      post({ type: 'compiled', id: msg.id, ok: false, error: 'Java runtime failed to start: ' + (e && e.message ? e.message : e) });
      return;
    }
    // Each run compiles into its own slot directory and is loaded by a fresh class loader.
    var dir = '/files/learn/slot' + (msg.id % 4);
    cheerpOSAddStringFile('/str/Main.java', msg.source);
    cheerpOSAddStringFile('/str/learn-input.json', msg.input);
    var rc = await cheerpjRunMain(
      'com.sun.tools.javac.Main', '',
      '-nowarn', '-encoding', 'UTF-8', '-Xstdout', '/files/learn-javac.txt',
      '-d', dir, '/str/Main.java'
    );
    if (rc !== 0) {
      post({ type: 'compiled', id: msg.id, ok: false, error: (await readText('/files/learn-javac.txt')) || 'Compilation failed.' });
      return;
    }
    post({ type: 'compiled', id: msg.id, ok: true });
    var t0 = performance.now();
    // CheerpJ never yields inside a busy loop, so the page cannot interrupt Java: the program
    // enforces this budget itself (see javaGuard.ts); the page timer is only a loose backstop.
    var budgetMs = String(Math.max(1000, Math.floor(msg.timeoutMs || 10000)));
    var exitCode = await cheerpjRunMain('LearnLauncher', '/files/learn/launcher', dir, '/str/learn-input.json', dir + '/out.txt', '/files/learn-fatal.txt', budgetMs);
    var ms = performance.now() - t0;
    var stdout = await readText(dir + '/out.txt');
    var fatal = await readText('/files/learn-fatal.txt');
    post({ type: 'done', id: msg.id, stdout: stdout, stderr: stdout ? '' : fatal, exitCode: exitCode, ms: ms });
  }

  var queue = Promise.resolve();
  window.addEventListener('message', function (ev) {
    if (ev.origin !== ORIGIN || ev.source !== parent) return;
    var msg = ev.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'warmup') {
      init().catch(function () {});
    } else if (msg.type === 'run') {
      queue = queue.then(function () {
        return run(msg);
      });
    }
  });
})();
