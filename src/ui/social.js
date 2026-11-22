/* ============================================================================
   TUMULT — THE LOBBY'S SOCIAL SIDE (the web version only): profiles, friends, requests, invites.
   docs/reference/HOME.md ("The Lobby"), docs/reference/BACKEND.md (the store paths).

   Store paths (server/src/rules.js):
     profile/<me>                 my card: name, a few pilots, expeditions, hearts, canon notes
     friends/<me>                 { list: [user id…] }, only mine to read
     inbox/<them>/from/<me>       a note I leave another player; they answer in inbox/<me>/from/<them>

   A note is one of: friend (a friend request) and friend-ok (its yes); join (asking to sit at their table),
   join-ok (let in, with the code) and join-no; invite (come to my table, with the code). A yes, a no or an
   invite is read once and then deleted; a request waits in the Lobby's Requests tab until it is answered.
   The Lobby's socket carries a nudge with each note, so it arrives at once; the inbox is also read every
   20 seconds and whenever the Lobby opens. Only accounts take part: a guest sees who is online and the
   games, and is asked to sign in for the rest. Without a server this file does nothing.
   ========================================================================== */
(function (T) {
  const U = T.UI;
  if (!U || typeof window === 'undefined') return;
  const esc = (s) => (U.esc ? U.esc(s) : String(s));

  let db = null;
  let lobby = null;
  let uid = null;
  let myName = '';
  let friends = new Set();
  let inbox = []; // [{ from, kind, code, name, at }]
  const sent = new Map(); // id → kind, notes sent this session (so a button can say "Request sent")
  const cards = new Map(); // id → profile | null (null: asked, none kept)
  const told = new Set(); // notes already shown as a toast this session
  let poll = null;
  let stopNudge = null;
  let publishedAt = 0;

  const me = () => {
    const A = T.Account;
    const u = A && typeof A.user === 'function' ? A.user() : null;
    return u && u.id && !u.guest ? u : null;
  };
  const redraw = () => {
    if (U.lobbyRedraw) U.lobbyRedraw();
  };
  const net = () => U.net || null;
  /** The code of the table this screen hosts, when it hosts one. */
  const myTable = () => {
    const N = net();
    return N && N.role === 'host' && N.code ? N.code : '';
  };

  const S = (U.social = {
    /** True when this player can make friends and send requests: signed in, with the store reachable. */
    on: () => !!(db && uid),
    isFriend: (id) => friends.has(id),
    friends: () => [...friends],
    sent: (id) => sent.get(id) || '',
    /** Requests waiting for an answer from this player: friend requests, asks to join, invites. */
    waiting: () => inbox.filter((n) => n.kind === 'friend' || n.kind === 'join' || n.kind === 'invite'),
    /** A player's card, from the cache; asks the store when it has not been read yet. */
    card(id) {
      if (cards.has(id)) return cards.get(id);
      cards.set(id, null);
      if (db)
        db.doc('profile/' + id)
          .get()
          .then((s) => {
            const d = s && s.exists && s.data ? s.data() : null;
            if (d) cards.set(id, d);
            redraw();
          })
          .catch(() => {});
      return null;
    },
  });

  /* ───────────── sending ───────────── */
  async function send(to, kind, code) {
    if (!S.on() || !to || to === uid) return false;
    try {
      await db.doc(`inbox/${to}/from/${uid}`).set({ kind, code: code || '', name: myName });
      if (lobby && lobby.nudge) lobby.nudge(to);
      sent.set(to, kind);
      return true;
    } catch (e) {
      if (U.toast) U.toast(esc((e && e.message) || 'That did not reach them. Try again.'), 3200);
      return false;
    }
  }
  const drop = (from) =>
    db
      .doc(`inbox/${uid}/from/${from}`)
      .delete()
      .catch(() => {});
  async function saveFriends() {
    try {
      await db.doc('friends/' + uid).set({ list: [...friends] });
    } catch (e) {
      /* kept on this screen; the next change writes it again */
    }
  }

  S.addFriend = async (id) => {
    if (await send(id, 'friend')) {
      if (U.toast) U.toast('Friend request sent.');
      redraw();
    }
  };
  S.removeFriend = async (id) => {
    friends.delete(id);
    redraw();
    await saveFriends();
  };
  S.askJoin = async (id) => {
    if (await send(id, 'join')) {
      if (U.toast) U.toast('Asked to join. They answer from their Lobby.', 2600);
      redraw();
    }
  };
  S.invite = async (id) => {
    const code = myTable();
    if (!code) {
      if (U.toast) U.toast('Host a table first, then invite players to it.', 2600);
      return;
    }
    if (await send(id, 'invite', code)) {
      if (U.toast) U.toast('Invite sent.');
      redraw();
    }
  };
  /** Answer a request in the inbox: yes or no. */
  S.answer = async (from, yes) => {
    const n = inbox.find((x) => x.from === from);
    if (!n) return;
    inbox = inbox.filter((x) => x !== n);
    redraw();
    if (n.kind === 'friend' && yes) {
      friends.add(from);
      await saveFriends();
      await send(from, 'friend-ok');
    } else if (n.kind === 'join') {
      const code = myTable();
      if (yes && code) await send(from, 'join-ok', code);
      else await send(from, 'join-no');
    } else if (n.kind === 'invite' && yes && n.code) {
      U.lobbyOpen = false;
      U.extraAct('netJoinGame', n.code);
    }
    await drop(from);
    redraw();
  };

  /* ───────────── receiving ───────────── */
  function toastNote(n) {
    if (!U.toast || told.has(n.from + n.kind + n.at)) return;
    told.add(n.from + n.kind + n.at);
    const who = `<b>${esc(n.name || 'A player')}</b>`;
    const btns = (yes, no) =>
      `<span class="so-toast-btns"><button class="sm primary" data-act="socialAnswer" data-arg="${esc(n.from)}|1">${yes}</button><button class="sm ghost" data-act="socialAnswer" data-arg="${esc(n.from)}|0">${no}</button></span>`;
    if (n.kind === 'friend') U.toast(`${who} wants to be friends. ${btns('Accept', 'Not now')}`, 9000);
    else if (n.kind === 'join')
      U.toast(`${who} asks to join your table. ${btns(myTable() ? 'Let in' : 'OK', 'Not now')}`, 12000);
    else if (n.kind === 'invite') U.toast(`${who} invites you to their table. ${btns('Join', 'Not now')}`, 12000);
  }
  async function readInbox() {
    if (!S.on()) return;
    let list;
    try {
      const snap = await db.collection(`inbox/${uid}/from`).get();
      list = snap.docs.map((d) => Object.assign({ from: d.id }, d.data() || {}));
    } catch (e) {
      return;
    }
    const keep = [];
    for (const n of list) {
      if (n.kind === 'friend-ok') {
        friends.add(n.from);
        sent.delete(n.from);
        await saveFriends();
        if (U.toast) U.toast(`<b>${esc(n.name || 'A player')}</b> is now your friend.`, 3000);
        drop(n.from);
      } else if (n.kind === 'join-ok' && n.code) {
        sent.delete(n.from);
        if (U.toast)
          U.toast(
            `<b>${esc(n.name || 'The host')}</b> let you in. <button class="sm primary" data-act="netJoinGame" data-arg="${esc(n.code)}">Join ▶</button>`,
            15000,
          );
        drop(n.from);
      } else if (n.kind === 'join-no') {
        sent.delete(n.from);
        if (U.toast) U.toast(`<b>${esc(n.name || 'The host')}</b> can't take you right now.`, 3000);
        drop(n.from);
      } else {
        keep.push(n);
        toastNote(n);
      }
    }
    inbox = keep;
    redraw();
  }
  S.refresh = readInbox;

  /* ───────────── my card ───────────── */
  function myCard() {
    const meta = T.loadMeta ? T.loadMeta() : {};
    const run = U.run || (T.loadRun && T.loadRun());
    const heroes = ((run && run.heroes) || []).filter(Boolean);
    const made = T.loadMade ? T.loadMade() : [];
    const pilots = heroes
      .concat(made)
      .slice(0, 6)
      .map((h) => {
        let a = null;
        try {
          a = U.pilotOf ? U.pilotOf(h) : null;
        } catch (e) {
          a = null;
        }
        return { name: h.name || '', art: a ? a.key : '' };
      })
      .filter((p) => p.name);
    return {
      name: myName,
      pilots,
      runs: meta.runs || 0,
      wins: meta.wins || 0,
      best: meta.bestRow || 0,
      canon: T.loadCanon ? T.loadCanon().length : 0,
    };
  }
  S.publish = async (force) => {
    if (!S.on() || (!force && Date.now() - publishedAt < 60000)) return;
    publishedAt = Date.now();
    try {
      const card = myCard();
      await db.doc('profile/' + uid).set(card);
      cards.set(uid, card);
    } catch (e) {
      /* the next visit tries again */
    }
  };

  /* ───────────── signing in and out ───────────── */
  async function start() {
    const u = me();
    if (!u || !T.Backend || !T.Backend.available()) return stop();
    if (uid === u.id) return;
    stop();
    try {
      db = await T.Backend.use('db');
      lobby = await T.Backend.use('lobby');
    } catch (e) {
      db = null;
    }
    if (!db) return;
    uid = u.id;
    myName = u.name || '';
    try {
      const s = await db.doc('friends/' + uid).get();
      const d = s && s.exists && s.data ? s.data() : null;
      friends = new Set((d && Array.isArray(d.list) && d.list) || []);
    } catch (e) {
      friends = new Set();
    }
    if (lobby && typeof lobby.onNudge === 'function') stopNudge = lobby.onNudge(() => readInbox());
    poll = setInterval(readInbox, 20000);
    readInbox();
    S.publish(true);
    redraw();
  }
  function stop() {
    if (poll) clearInterval(poll);
    if (stopNudge) stopNudge();
    poll = stopNudge = null;
    uid = null;
    friends = new Set();
    inbox = [];
  }

  const prevExtra = U.extraAct;
  U.extraAct = function (act, arg, el, e) {
    const id = String(arg || '');
    switch (act) {
      case 'socialAdd':
        S.addFriend(id);
        return true;
      case 'socialUnfriend':
        S.removeFriend(id);
        return true;
      case 'socialAsk':
        S.askJoin(id);
        return true;
      case 'socialInvite':
        S.invite(id);
        return true;
      case 'socialAnswer': {
        const [from, yes] = id.split('|');
        if (el && el.closest) {
          const t = el.closest('.toast');
          if (t) t.remove();
        }
        S.answer(from, yes === '1');
        return true;
      }
    }
    return prevExtra ? prevExtra(act, arg, el, e) : false;
  };

  if (T.Account && typeof T.Account.onChange === 'function') T.Account.onChange(() => start());
  window.addEventListener('load', () => setTimeout(start, 0));
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
