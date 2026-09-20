function installNavigationPolicy(contents, { origin, openExternal, navigate }) {
  const classify = (value) => {
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) return 'blocked';
      return url.origin === origin ? 'internal' : 'external';
    } catch { return 'blocked'; }
  };
  const open = (url) => Promise.resolve().then(() => openExternal(url)).catch(error => console.error('Could not open browser:', error.message));
  const guard = (event, url, _inPlace, isMainFrame) => {
    if (isMainFrame === false) return;
    const kind = classify(url);
    if (kind === 'internal') return;
    event.preventDefault();
    if (kind === 'external') void open(url);
  };
  contents.on('will-navigate', guard);
  contents.on('will-redirect', guard);
  contents.setWindowOpenHandler(({ url }) => {
    const kind = classify(url);
    if (kind === 'internal') Promise.resolve().then(() => navigate(url)).catch(console.error);
    if (kind === 'external') void open(url);
    return { action: 'deny' };
  });
}
module.exports = { installNavigationPolicy };
