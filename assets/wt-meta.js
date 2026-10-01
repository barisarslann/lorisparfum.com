(() => {
  try {
    const cfg = window.__wtCheck;
    if (!cfg) return;

    const sh = window.Shopify || {};
    const t = sh.theme || {};
    const role = t.role || 'unknown';
    const ver = t.schema_version || '0';
    const name = t.schema_name || 'Wonder';
    const handle = t.name || '';
    const key = 'wt-_v';
    const stamp = role + ':' + ver + ':' + name + ':' + handle;

    try {
      if (localStorage.getItem(key) === stamp) return;
    } catch (_) {}

    const f = new FormData();
    f.append('shop', sh.shop || '');
    f.append('shop_id', cfg.sid || '');
    f.append('email', cfg.em || '');
    f.append('theme_name', name);
    f.append('theme_handle', handle);
    f.append('theme_version', ver);
    f.append('role', role);

    try {
      navigator.sendBeacon('https://update-check.wonder-theme.com/', f);
    } catch (_) {}

    try {
      localStorage.setItem(key, stamp);
    } catch (_) {}
  } catch (_) {}
})();
