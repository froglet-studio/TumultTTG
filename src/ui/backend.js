/* ============================================================================
   TUMULT — THE BACKEND SEAM.
   Everything online (play online, shared pilots, canon notes) reaches a server through
   T.Backend, never through a host page's API directly, so the same screens can run on any
   host that offers the three capabilities below.

   A provider is { name, available() → bool, use(capability) → Promise<object|null>,
   capabilities? }. Providers are tried newest first; the first one that is available and offers
   the capability serves it. A provider without a capabilities list offers the online three.

   The capabilities, as the online screens use them:
     db    collection(path) / doc(path) — the shared store: documents read, written, listed,
           deleted and watched (see net.js for the calls each screen makes)
     room  join(name) — an optional live channel between the screens open on one game
     user  id(), can(permission), canEdit(), isOwner(), profiles(ids) — who is playing
     lobby watch(fn(players)) → stop — who is online now; web version only (src/web/backend-worker.js)
     analytics  track(event, props), flush(leaving) — anonymous play data (src/ui/telemetry.js);
           offered on its own by the web version's Froglet Analytics provider (src/web/analytics.js)

   Built in: 'claude-artifact', the claude.ai page that hosts the playtest build
   (window.claude.use). The web version adds 'tumult-worker' (src/web/backend-worker.js), Tumult's
   own Cloudflare Worker (server/, docs/reference/BACKEND.md), registered the same way. With no provider the game
   plays exactly as before, solo and offline.
   ========================================================================== */
(function (T) {
  const B = (T.Backend = T.Backend || {});
  const providers = B._providers || (B._providers = []);

  /** Add a provider; the newest one that is available wins. */
  B.register = (p) => {
    if (!p || typeof p.use !== 'function' || typeof p.available !== 'function')
      throw new Error('a backend provider needs available() and use()');
    providers.unshift(p);
    return p;
  };

  const ONLINE = ['db', 'room', 'user'];
  const offers = (p, capability) => (p.capabilities || ONLINE).includes(capability);
  /** The provider that serves a capability now ('db' — the online game — when none is named), or null. */
  B.active = (capability = 'db') => providers.find((p) => offers(p, capability) && p.available()) || null;
  B.available = (capability) => !!B.active(capability);
  B.name = (capability) => (B.active(capability) || { name: 'offline' }).name;

  /** A capability from the provider that offers it; null (not a rejection) when there is none or it lacks one. */
  B.use = (capability) => {
    const p = B.active(capability);
    if (!p) return Promise.resolve(null);
    return Promise.resolve(p.use(capability)).then((c) => c || null);
  };

  /**
   * Who is playing changed (a sign-in, a sign-out, an account merged): a provider says so with
   * B.changed(), and the online screens that read the player's own documents look again.
   */
  const listeners = B._listeners || (B._listeners = []);
  B.onChange = (fn) => {
    listeners.push(fn);
    return () => listeners.splice(listeners.indexOf(fn) >>> 0, 1);
  };
  B.changed = () =>
    listeners.slice().forEach((fn) => {
      try {
        fn();
      } catch (e) {
        /* one screen's trouble is not another's */
      }
    });

  if (!providers.some((p) => p.name === 'claude-artifact'))
    providers.push({
      name: 'claude-artifact',
      available: () => typeof window !== 'undefined' && !!window.claude && typeof window.claude.use === 'function',
      use: (capability) => window.claude.use(capability),
    });
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
