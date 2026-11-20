/* ============================================================================
   TUMULT — the web version's anonymous play data, sent to Froglet Analytics.
   Web version only (manifest.web). A T.Backend provider that offers one capability,
   'analytics': src/ui/telemetry.js names the events, this file stamps each with the
   envelope (docs/analytics/EVENT_SCHEMA.json, common_envelope) and posts them in batches to
   Tumult's own Froglet Analytics server, the only host it talks to. Sending never blocks or
   breaks the game: a failed batch waits for the next try, and with the server unreachable the
   game plays exactly as before.

   The server address and the public, write-only ingest key are written in by the build
   (tools/build.mjs, from docs/analytics/ingest.json and ingest_key.public).
   ========================================================================== */
(function (T) {
  const CONFIG = /*__ANALYTICS__*/ { url: '', key: '' };
  const SEND_EVERY_MS = 15000;
  const BATCH_MAX = 50;
  const QUEUE_MAX = 300;
  const KEPT = 'tumult_v2_anon_queue'; // events a closing page could not send, sent on the next visit

  const host = () => (typeof location !== 'undefined' ? location.hostname : '');
  /** Sent from the web version on https; on localhost only when asked (?analytics=1), so development stays quiet. */
  const allowed = () => {
    if (!CONFIG.url || !CONFIG.key || typeof location === 'undefined' || typeof fetch !== 'function') return false;
    if (host() === 'localhost' || host() === '127.0.0.1') return /[?&]analytics=1\b/.test(location.search);
    return location.protocol === 'https:';
  };

  /* ───────────── the envelope ───────────── */
  const session = (() => {
    const b = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b);
    return 's_' + Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('') + '_' + Date.now().toString(36);
  })();
  function device() {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const touch = typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0;
    const w = typeof screen !== 'undefined' ? Math.min(screen.width, screen.height) : 0;
    const os =
      /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch)
        ? 'iOS'
        : /Android/.test(ua)
          ? 'Android'
          : /CrOS/.test(ua)
            ? 'ChromeOS'
            : /Windows/.test(ua)
              ? 'Windows'
              : /Macintosh/.test(ua)
                ? 'macOS'
                : /Linux/.test(ua)
                  ? 'Linux'
                  : 'other';
    const form = !touch ? 'desktop' : w && w < 600 ? 'phone' : 'tablet';
    return { device: form === 'desktop' ? 'web_desktop' : 'web_mobile', os, form_factor: form, touch };
  }
  const releaseHost = (h) => h === 'tumult.froglet.games' || h === 'www.froglet.games' || h === 'froglet.games';
  function envelope() {
    const d = device();
    return {
      distinct_id: T.Telemetry && T.Telemetry.id ? T.Telemetry.id() : 'unknown',
      session_id: session,
      app_version: (T.BUILD && T.BUILD.version) || '',
      platform: 'web',
      build_kind: releaseHost(host()) ? 'release' : 'development',
      host: host(),
      device: d.device,
      os: d.os,
      form_factor: d.form_factor,
      touch: d.touch,
    };
  }

  /* ───────────── the queue ───────────── */
  let queue = [];
  let sending = false;
  try {
    const kept = JSON.parse(localStorage.getItem(KEPT) || '[]');
    if (Array.isArray(kept)) queue = kept.slice(-QUEUE_MAX);
    localStorage.removeItem(KEPT);
  } catch (e) {}

  function track(event, props) {
    const properties = Object.assign(envelope(), props);
    queue.push({ event, properties, timestamp: new Date(properties.timestamp_utc_ms || Date.now()).toISOString() });
    if (queue.length > QUEUE_MAX) queue.splice(0, queue.length - QUEUE_MAX);
    if (queue.length >= BATCH_MAX) flush(false);
  }
  const body = (batch) => JSON.stringify({ api_key: CONFIG.key, batch });
  /** Send what is queued. Leaving: the page is closing, so hand it to the browser (sendBeacon) or keep it for next time. */
  function flush(leaving) {
    if (!queue.length || !allowed()) return Promise.resolve();
    const url = CONFIG.url.replace(/\/+$/, '') + '/batch/';
    if (leaving) {
      const batch = queue.splice(0, queue.length);
      // text/plain: a simple request, no preflight; the server reads the JSON whatever the type
      const ok =
        typeof navigator !== 'undefined' &&
        navigator.sendBeacon &&
        navigator.sendBeacon(url, new Blob([body(batch)], { type: 'text/plain' }));
      if (!ok)
        try {
          localStorage.setItem(KEPT, JSON.stringify(batch.slice(-QUEUE_MAX)));
        } catch (e) {}
      return Promise.resolve();
    }
    if (sending) return Promise.resolve();
    sending = true;
    const batch = queue.splice(0, BATCH_MAX);
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: body(batch),
      keepalive: true,
      credentials: 'omit',
    })
      .then((r) => {
        // a 4xx other than "too many" will not get better by sending again: dropped
        if (!r.ok && (r.status === 429 || r.status >= 500)) queue.unshift(...batch);
      })
      .catch(() => queue.unshift(...batch))
      .then(() => {
        sending = false;
        if (queue.length > QUEUE_MAX) queue.splice(0, queue.length - QUEUE_MAX);
      });
  }

  const capability = { track, flush };
  T.Backend.register({
    name: 'froglet-analytics',
    capabilities: ['analytics'],
    available: allowed,
    use: (c) => (c === 'analytics' ? capability : null),
  });
  if (typeof setInterval === 'function' && allowed()) {
    setInterval(() => flush(false), SEND_EVERY_MS);
    if (typeof document !== 'undefined')
      document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush(true));
  }
  T.Analytics = { config: CONFIG, flush, queued: () => queue.length, _envelope: envelope };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
