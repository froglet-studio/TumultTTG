'use strict';
/**
 * Your profile (src/ui/profile.js): the account button opens it; a name is checked as it is typed; an
 * avatar is picked from the pilot paintings; Save sends both; the face follows to the account button.
 * Run against a stand-in for the Worker's /auth routes.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';
const { until } = require('../tools/ui-drive');

test('the account button opens the profile; name and avatar save and show', { skip }, async () => {
  const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
  const html = build().html;
  const { JSDOM } = require('jsdom');
  const user = { id: 'u_me', name: 'Shombith', guest: false, links: ['google'], avatar: '', pictures: [], renameAt: 0 };
  const sent = [];
  const errors = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.addEventListener('error', (e) => errors.push((e.error && e.error.stack) || e.message));
      w.T = { Server: { base: 'http://api.test' } }; // as the web version's src/web/server.js does
      w.localStorage.setItem('tumult_v2_account', JSON.stringify({ token: 'x'.repeat(43), user }));
      w.fetch = async (url, init = {}) => {
        const u = new URL(url);
        const reply = (b, status = 200) => ({ ok: status < 400, status, json: async () => b });
        if (u.pathname === '/auth/name')
          return reply(
            u.searchParams.get('name') === 'Moss'
              ? { ok: false, problem: 'Someone already flies as Moss. Pick another.' }
              : { ok: true, problem: '' },
          );
        if (u.pathname === '/auth/me' && init.method === 'PATCH') {
          const b = JSON.parse(init.body);
          sent.push(b);
          Object.assign(user, b);
          return reply({ user });
        }
        if (u.pathname === '/auth/me') return reply({ user });
        return reply({}, 404);
      };
    },
  });
  const w = dom.window;
  const d = w.document;
  const U = w.T.UI;
  await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
  const click = (sel) => {
    const el = d.querySelector(sel);
    assert.ok(el, 'nothing to click: ' + sel);
    el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  };
  const typeName = (v) => {
    const box = d.getElementById('pfName');
    box.value = v;
    box.dispatchEvent(new w.Event('input', { bubbles: true }));
  };

  assert.match(d.querySelector('[data-act="account"]').innerHTML, />S</, 'initials before any avatar');
  click('[data-act="account"]');
  assert.equal(U.screen, 'profile');
  assert.equal(d.getElementById('pfName').value, 'Shombith');
  assert.ok(d.querySelector('[data-act="profSave"]').disabled, 'nothing to save yet');

  typeName('Moss');
  await until(() => /already flies as Moss/.test(d.getElementById('pfRules').textContent), 'the server check');
  assert.ok(d.querySelector('[data-act="profSave"]').disabled, 'a name the server refused cannot be saved');
  typeName('ab');
  assert.match(d.getElementById('pfRules').textContent, /At least 3 characters/);
  typeName('Shombith of the Ark');
  await until(() => !d.querySelector('[data-act="profSave"]').disabled, 'Save lights up');

  click('[data-act="profTab"][data-arg="all"]');
  const first = d.querySelector('.pf-all .pf-opt');
  const key = first.getAttribute('data-arg');
  assert.match(key, /^p:[A-Z0-9_-]+$/);
  click(`.pf-all .pf-opt[data-arg="${key}"]`);
  assert.ok(d.querySelector(`.pf-opt.sel[data-arg="${key}"]`), 'the picked painting is marked');
  assert.equal(d.getElementById('pfName').value, 'Shombith of the Ark', 'a typed name survives picking');

  click('[data-act="profSave"]');
  await until(() => sent.length === 1 && U.profile.busy === false, 'the save');
  assert.deepEqual(sent[0], { name: 'Shombith of the Ark', avatar: key });
  assert.match(d.querySelector('.pf-msg').textContent, /Saved/);
  assert.ok(d.querySelector('[data-act="account"] img'), 'the account button shows the painting now');
  assert.equal(U.avatarSrc({ id: 'x', avatar: 'initials', name: 'Ann Lee' }), null);
  assert.equal(U.initials('Ann Lee'), 'AL');
  assert.deepEqual(errors, []);
  w.close();
});
