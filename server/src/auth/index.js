/* ============================================================================
   TUMULT SERVER — SIGN-IN (placeholder).
   The sign-in thread's module replaces this file wholesale (docs/reference/ACCOUNTS.md). Until then
   nobody is signed in: the store answers reads its rules allow to anyone, and refuses the rest.

   The contract index.js relies on:
     handleAuth(request, env, ctx, { mergeUser, deleteUser }) → Response   every /auth/* request
     authenticate(request, env) → { userId, guest, name } | null           Bearer token, or ?session= on a WebSocket
     sweepAuth(env)                                                         optional, from the daily cron
   ========================================================================== */
export async function handleAuth() {
  return new Response(JSON.stringify({ error: 'not-found', message: 'sign-in is not on this server yet' }), {
    status: 404,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function authenticate() {
  return null;
}
