/* ============================================================================
   TUMULT — THE BACKEND SEAM.
   Everything online (play online, shared pilots, canon notes) reaches a server through
   T.Backend, never through a host page's API directly, so the same screens can run on any
   host that offers the three capabilities below.

   A provider is { name, available() → bool, use(capability) → Promise<object|null> }.
   Providers are tried newest first; the first one that is available serves every call.

   The capabilities, as the online screens use them:
     db    collection(path) / doc(path) — the shared store: documents read, written, listed,
           deleted and watched (see net.js for the calls each screen makes)
     room  join(name) — an optional live channel between the screens open on one game
     user  id(), can(permission), canEdit(), isOwner(), profiles(ids) — who is playing

   Built in: 'claude-artifact', the claude.ai page that hosts the playtest build
   (window.claude.use). A Cloudflare Workers provider registers itself the same way
   (T.Backend.register) when the hosted web build has a server. With no provider the game
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

  /** The provider that serves calls now, or null when the game is offline. */
  B.active = () => providers.find((p) => p.available()) || null;
  B.available = () => !!B.active();
  B.name = () => (B.active() || { name: 'offline' }).name;

  /** A capability from the active provider; null (not a rejection) when there is none or it lacks one. */
  B.use = (capability) => {
    const p = B.active();
    if (!p) return Promise.resolve(null);
    return Promise.resolve(p.use(capability)).then((c) => c || null);
  };

  if (!providers.some((p) => p.name === 'claude-artifact'))
    providers.push({
      name: 'claude-artifact',
      available: () => typeof window !== 'undefined' && !!window.claude && typeof window.claude.use === 'function',
      use: (capability) => window.claude.use(capability),
    });
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
