import { useSyncExternalStore } from 'react';

// Router minimal pe hash: butonul „înapoi” de pe Android funcționează natural.
function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

const getHash = () => window.location.hash.replace(/^#\/?/, '');

export function useRoute(): { path: string; parts: string[] } {
  const hash = useSyncExternalStore(subscribe, getHash, () => '');
  const parts = hash.split('/').filter(Boolean).map(decodeURIComponent);
  return { path: parts[0] ?? '', parts };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const url = `#/${to.replace(/^\//, '')}`;
  if (opts.replace) {
    history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = url;
  }
}
