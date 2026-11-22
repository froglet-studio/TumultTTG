-- Profiles (server/src/auth/, docs/reference/ACCOUNTS.md "Your profile"): an avatar and a display name
-- that is one player's alone.
--   avatar      ''            automatic: the first pilot on the player's card, else initials
--               'initials'    initials
--               'p:<key>'     a pilot painting from the game (the key of its art)
--               'google' | 'discord'   the picture that sign-in gave, served through /auth/picture/<id>
--   name_key    the name folded for comparing (lower case, no spaces); set for accounts, never for guests,
--               so no two accounts share a name. Kept by the oldest account where two already did.
--   renamed_at  when the player last chose a name (ms); an account renames once a day
--   identities.picture   the address of the picture Google or Discord gave at the last sign-in
ALTER TABLE users ADD COLUMN avatar TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN name_key TEXT;
ALTER TABLE users ADD COLUMN renamed_at INTEGER NOT NULL DEFAULT 0;
ALTER TABLE identities ADD COLUMN picture TEXT;

UPDATE users SET name_key = replace(lower(name), ' ', '')
WHERE guest = 0 AND NOT EXISTS (
  SELECT 1 FROM users u2
  WHERE u2.guest = 0 AND u2.id <> users.id
    AND replace(lower(u2.name), ' ', '') = replace(lower(users.name), ' ', '')
    AND (u2.created_at < users.created_at OR (u2.created_at = users.created_at AND u2.id < users.id))
);
CREATE UNIQUE INDEX IF NOT EXISTS users_name_key ON users(name_key) WHERE name_key IS NOT NULL;
