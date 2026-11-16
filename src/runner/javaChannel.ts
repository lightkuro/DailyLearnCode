import type { Channel } from './workerBackend';
import type { FromRuntime } from './types';

/**
 * Java runs in a hidden same-origin iframe (/java-runner.html) that hosts CheerpJ, a JVM compiled to
 * WebAssembly. Destroying the iframe is how a runaway program gets stopped.
 */
export function javaChannel(): Channel {
  const frame = document.createElement('iframe');
  frame.src = '/java-runner'; // Cloudflare serves extensionless (it 307s /java-runner.html → /java-runner)
  frame.title = 'Java runtime';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, { position: 'fixed', width: '1px', height: '1px', left: '-10px', top: '-10px', border: '0', opacity: '0' });
  document.body.appendChild(frame);

  let onMsg: (m: FromRuntime) => void = () => {};
  const queue: unknown[] = [];
  let loaded = false;

  const listener = (ev: MessageEvent) => {
    if (ev.source !== frame.contentWindow || ev.origin !== location.origin) return;
    onMsg(ev.data as FromRuntime);
  };
  window.addEventListener('message', listener);
  frame.addEventListener('load', () => {
    loaded = true;
    for (const m of queue.splice(0)) frame.contentWindow?.postMessage(m, location.origin);
  });

  return {
    post(m) {
      if (loaded) frame.contentWindow?.postMessage(m, location.origin);
      else queue.push(m);
    },
    onMessage(fn) {
      onMsg = fn;
    },
    onCrash() {
      /* iframe errors surface as status messages from inside the frame */
    },
    destroy() {
      window.removeEventListener('message', listener);
      frame.remove();
    },
  };
}
