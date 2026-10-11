(async () => {
  try {
    const response = await fetch('/routes.json');
    if (!response.ok) return;
    const routes = await response.json();
    const base = routes.find(route => location.pathname.startsWith(route) || location.pathname === route.slice(0, -1));
    if (!base) return;
    // Missing JS/CSS/images should remain 404s, never return application HTML.
    if (/\.[a-z0-9]+$/i.test(location.pathname)) return;
    const route = location.pathname + location.search + location.hash;
    location.replace(base + '?__route=' + encodeURIComponent(route));
  } catch { /* Keep the helpful 404 page if discovery fails. */ }
})();
