(() => {
  const base = new URL('.', document.currentScript.src).pathname;
  const route = new URLSearchParams(location.search).get('__route');
  if (!route || !route.startsWith(base) || route.includes('\\')) return;
  const url = new URL(route, location.origin);
  if (url.origin === location.origin && url.pathname.startsWith(base)) history.replaceState(null, '', url.pathname + url.search + url.hash);
})();
