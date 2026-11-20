/* Google and Discord sign-in: OAuth 2.0 authorization code with PKCE. Each provider gives us its stable
   account number and a display name; we ask for nothing else (no email, no friends, no servers). */

const trim = (v) => String(v || '').trim(); // pasted settings often carry a stray space or line break

export const PROVIDERS = {
  google: {
    label: 'Google',
    configured: (env) => !!(trim(env.GOOGLE_CLIENT_ID) && trim(env.GOOGLE_CLIENT_SECRET)),
    authorizeUrl(env, { redirectUri, state, challenge }) {
      const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      u.search = new URLSearchParams({
        client_id: trim(env.GOOGLE_CLIENT_ID),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
      });
      return u.toString();
    },
    async profile(env, { code, verifier, redirectUri }) {
      const tok = await form('https://oauth2.googleapis.com/token', {
        client_id: trim(env.GOOGLE_CLIENT_ID),
        client_secret: trim(env.GOOGLE_CLIENT_SECRET),
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      const me = await bearer('https://openidconnect.googleapis.com/v1/userinfo', tok.access_token);
      if (!me.sub) throw new Error('Google did not say who you are');
      return { subject: String(me.sub), name: me.given_name || me.name || '' };
    },
  },
  discord: {
    label: 'Discord',
    configured: (env) => !!(trim(env.DISCORD_CLIENT_ID) && trim(env.DISCORD_CLIENT_SECRET)),
    authorizeUrl(env, { redirectUri, state, challenge }) {
      const u = new URL('https://discord.com/oauth2/authorize');
      u.search = new URLSearchParams({
        client_id: trim(env.DISCORD_CLIENT_ID),
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        prompt: 'none',
      });
      return u.toString();
    },
    async profile(env, { code, verifier, redirectUri }) {
      const tok = await form('https://discord.com/api/oauth2/token', {
        client_id: trim(env.DISCORD_CLIENT_ID),
        client_secret: trim(env.DISCORD_CLIENT_SECRET),
        code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      });
      const me = await bearer('https://discord.com/api/users/@me', tok.access_token);
      if (!me.id) throw new Error('Discord did not say who you are');
      return { subject: String(me.id), name: me.global_name || me.username || '' };
    },
  },
};

async function form(url, fields) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams(fields),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token)
    throw new Error(data.error_description || data.error || 'sign-in refused (' + res.status + ')');
  return data;
}

async function bearer(url, token) {
  const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' } });
  if (!res.ok) throw new Error('profile read failed (' + res.status + ')');
  return res.json();
}
