/* ============================================================================
   TUMULT — WHERE THE WEB VERSION'S SERVER IS (web version only, manifest.web).
   T.Server.base is the address of Tumult's Cloudflare Worker (server/, docs/reference/BACKEND.md),
   for sign-in and everything online. Solo play never calls it.
     ?api=<url>   use another server for this tab (a preview, or `wrangler dev` on localhost:8787)
   ========================================================================== */
(function (T) {
  const DEFAULT = 'https://api.tumult.froglet.games';
  const KEY = 'tumult_v2_api';
  let base = DEFAULT;
  try {
    const asked = new URLSearchParams(location.search).get('api');
    if (asked && /^https?:\/\/[^/\s]+$/.test(asked)) sessionStorage.setItem(KEY, asked);
    base = sessionStorage.getItem(KEY) || DEFAULT;
  } catch (e) {
    /* no storage: the default server */
  }
  T.Server = { base, DEFAULT };
})((window.T = window.T || {}));
