// Three.js r128: cdnjs in production, the vendored copy as the fallback (and
// first on localhost, where cdnjs is not reachable from the sandbox preview).
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const LOCAL = '/assets/vendor/three.min.js';
let promise = null;
function inject(src, timeout) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    const t = setTimeout(() => { s.remove(); reject(new Error('timeout')); }, timeout);
    s.onload = () => { clearTimeout(t); resolve(window.THREE); };
    s.onerror = () => { clearTimeout(t); reject(new Error('load')); };
    document.head.appendChild(s);
  });
}
export function loadThree(onProgress) {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (promise) return promise;
  const local = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(location.hostname);
  const order = local ? [LOCAL, CDN] : [CDN, LOCAL];
  promise = inject(order[0], 3500).catch(() => inject(order[1], 8000)).then((T) => { if (onProgress) onProgress(1); return T; });
  return promise;
}
