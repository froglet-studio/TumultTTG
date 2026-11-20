-- Tumult's shared store (server/src/store.js): one row per document, addressed by its path.
-- Live games are not here: each lives in its own Durable Object (server/src/room.js).
CREATE TABLE IF NOT EXISTS docs (
  path       TEXT PRIMARY KEY,   -- e.g. heroes/<user id>, canon/<user id>/notes/<record id>
  parent     TEXT NOT NULL,      -- the collection it is listed under: the path without its last part
  owner      TEXT,               -- the account it belongs to (users.id), for merging and deleting accounts
  data       TEXT NOT NULL,      -- the document, as JSON
  updated_at INTEGER NOT NULL    -- ms since the epoch
);
CREATE INDEX IF NOT EXISTS docs_parent ON docs (parent);
CREATE INDEX IF NOT EXISTS docs_owner ON docs (owner);
