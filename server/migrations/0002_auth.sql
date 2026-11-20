-- Tumult accounts (server/src/auth/, docs/reference/ACCOUNTS.md).
-- Every player starts as a guest; linking Google, Discord or email makes the account permanent.
-- Nothing here stores a secret in the clear: sessions and email codes are kept as SHA-256 hashes, and an
-- email address only as an HMAC under AUTH_PEPPER. Google and Discord give a stable account number (subject).

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                -- 'u_' + random; what every other table names as an owner
  name TEXT NOT NULL,                 -- shown to other players; the player can change it
  guest INTEGER NOT NULL DEFAULT 1,   -- 1 until an identity is linked
  created_at INTEGER NOT NULL,        -- ms since epoch
  seen_at INTEGER NOT NULL            -- last use, refreshed at most daily; idle guests are swept
);

CREATE TABLE IF NOT EXISTS identities (
  provider TEXT NOT NULL,             -- 'google' | 'discord' | 'email'
  subject TEXT NOT NULL,              -- the provider's account number; for email, HMAC(pepper, address)
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (provider, subject)
);
CREATE INDEX IF NOT EXISTS identities_user ON identities(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,        -- SHA-256 of the bearer token; the token itself is never stored
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS auth_states (
  state TEXT PRIMARY KEY,             -- one-time value carried through Google or Discord
  provider TEXT NOT NULL,
  verifier TEXT NOT NULL,             -- PKCE code verifier
  user_id TEXT,                       -- the account to link to, when the player was already signed in
  return_to TEXT NOT NULL,            -- the game page to come back to (an allowed origin only)
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS email_codes (
  email_hash TEXT PRIMARY KEY,        -- HMAC(pepper, address)
  code_hash TEXT NOT NULL,            -- SHA-256 of the address hash and the six digits
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0
);
