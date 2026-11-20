/* ============================================================================
   TUMULT — WHERE THE WEB VERSION'S SERVER IS (web version only, manifest.web).
   T.Server.base is the address of Tumult's Cloudflare Worker (server/, docs/reference/BACKEND.md),
   for sign-in and everything online. Solo play never calls it. The build writes the address in from
   server/address.json; while that is empty, the web version plays solo only.
     ?api=<url>   on a page served from localhost only: use another server for this tab (`wrangler dev`)
   ========================================================================== */
(function (T) {
  const DEFAULT = /*__SERVER__*/ '';
  const KEY = 'tumult_v2_api';
  let base = DEFAULT;
  try {
    // only a page served from this computer may point elsewhere: a link that sent a player's sign-in to
    // another server would give that server their session
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    const asked = new URLSearchParams(location.search).get('api');
    if (local && asked && /^https?:\/\/[^/\s]+$/.test(asked)) sessionStorage.setItem(KEY, asked);
    if (!local) sessionStorage.removeItem(KEY);
    base = sessionStorage.getItem(KEY) || DEFAULT;
  } catch (e) {
    /* no storage: the default server */
  }
  T.Server = { base, DEFAULT };
})((window.T = window.T || {}));
