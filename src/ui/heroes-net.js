/* ============================================================================
   TUMULT — HEROES PLAYERS MADE, SHARED (the playtest page and the web version)
   Every pilot built in the draft is kept on the device (T.keepMade). On the
   test page and Tumult Online it is also written to the page's store, so
   everyone who plays the page can choose it beside the pre-made heroes.

   Store layout (rules declared when the page is published; see
   docs/reference/RUN_AND_ECONOMY.md):
     heroes/<viewer id>   { list: [recipe, …], at, who }   that player's made heroes, newest first,
                          and the name their account shows (so Claude can copy each pilot,
                          with its player, to Froglet's character list; tools/pilot-sheet.js)
   Anyone who can open the page reads them all; each player writes only their
   own; the owner may tidy any. A recipe from the store is untrusted and is
   rebuilt by T.validMade before it is shown or played.
   With no such store (TUMULT.html, or a saved copy of the page) this file
   does nothing, and made heroes stay on the device.
   ========================================================================== */
(function (T) {
  const U = T.UI;

  let db = null;
  let user = null;
  let uid = null;
  let who = '';
  let others = []; // [{ rec, by }]
  const names = {};

  /** Made heroes other players shared, each with its maker's name. */
  U.heroesFromOthers = () => others.map((x) => ({ rec: x.rec, who: names[x.by] || 'another player' }));
  /** True once made heroes are shared through the store. */
  U.heroesShared = () => !!uid;

  async function load() {
    try {
      const snap = await db.collection('heroes').get();
      const list = [];
      let stored = null;
      let storedWho = '';
      snap.docs.forEach((doc) => {
        const data = doc.data() || {};
        if (doc.id === uid) {
          stored = Array.isArray(data.list) ? data.list.map(T.validMade).filter(Boolean) : [];
          storedWho = typeof data.who === 'string' ? data.who : '';
          return;
        }
        (Array.isArray(data.list) ? data.list : []).slice(0, T.MADE_MAX).forEach((r) => {
          const rec = T.validMade(r);
          if (rec) list.push({ rec, by: doc.id });
        });
      });
      if (uid) {
        // the same player on another device: their heroes join this device's list, and the store
        // hears of any made here that it lacks
        const here = new Set(T.loadMade().map((r) => r.id));
        (stored || [])
          .filter((r) => !here.has(r.id))
          .reverse()
          .forEach((r) => T.keepMade(r));
        const there = new Set((stored || []).map((r) => r.id));
        // …and of this player's name, when the list is there but the name is missing or old
        if (T.loadMade().some((r) => !there.has(r.id)) || (stored && stored.length && who && storedWho !== who)) push();
      }
      list.sort((a, b) => String(b.rec.at).localeCompare(String(a.rec.at)));
      others = list;
      const ids = [...new Set(list.map((x) => x.by))];
      if (ids.length && user.profiles) {
        const ps = await user.profiles(ids);
        ids.forEach((i) => (names[i] = (ps && ps[i] && ps[i].name) || ''));
      }
      if (U.screen === 'draft' && U.draft && U.draft.step === 'mode' && !U.modal) U.render();
    } catch (e) {}
  }

  // this player's own list in the store mirrors the device's; writes go one at a time
  let chain = Promise.resolve();
  function push() {
    if (!uid) return;
    chain = chain.then(async () => {
      try {
        await db.doc(`heroes/${uid}`).set({ list: T.loadMade(), at: new Date().toISOString(), who });
      } catch (e) {}
    });
  }
  U.heroesShare = () => push();
  U.heroesForget = () => push();

  // look now, and again whenever who is playing changes (a sign-in on the web version)
  function start() {
    if (!(T.Backend && T.Backend.available())) return;
    Promise.all([T.Backend.use('db'), T.Backend.use('user')])
      .then(async ([d, u]) => {
        if (!d || !u) return;
        db = d;
        user = u;
        const id = await u.id();
        if (!id) return load();
        uid = id;
        try {
          const me = await u.me();
          who = String((me && me.name) || '').slice(0, 60);
        } catch (e) {}
        load();
      })
      .catch(() => {});
  }
  start();
  if (T.Backend && T.Backend.onChange) T.Backend.onChange(start);
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
