// D1, as far as Tumult's Worker uses it (prepare/bind/first/all/run, batch), over node:sqlite in memory,
// with the given server/migrations files applied in order. For tests only.
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/** The part of D1 the module uses, over node:sqlite. */
export function fakeD1(migrations = ['0002_auth.sql']) {
  const db = new DatabaseSync(':memory:');
  for (const m of migrations) db.exec(readFileSync(new URL('../migrations/' + m, import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    sql,
    args,
    bind: (...a) => stmt(sql, a),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => (db.prepare(sql).run(...args), { success: true }),
  });
  return {
    raw: db,
    prepare: (sql) => stmt(sql),
    batch: async (list) => {
      db.exec('BEGIN');
      try {
        for (const s of list) db.prepare(s.sql).run(...s.args);
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return list.map(() => ({ success: true }));
    },
  };
}
