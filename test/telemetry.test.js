'use strict';
// Anonymous play data (docs/reference/ANALYTICS.md): what the web version sends, that every event and field is in
// the published schema, that nothing personal leaves, and that the offline file and the playtest page send nothing.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.join(__dirname, '..');
const load = () => import(pathToFileURL(path.join(root, 'tools', 'build.mjs')).href);
const SCHEMA = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'analytics', 'EVENT_SCHEMA.json'), 'utf8'));
const KEY = fs.readFileSync(path.join(root, 'docs', 'analytics', 'ingest_key.public'), 'utf8').trim();
const URL_ = JSON.parse(fs.readFileSync(path.join(root, 'docs', 'analytics', 'ingest.json'), 'utf8')).url;

let hasJsdom = true;
try {
  require.resolve('jsdom');
} catch {
  hasJsdom = false;
}
const skip = hasJsdom ? false : 'jsdom is not installed (run `npm install`)';

/** The web version's script as one page, so the UI driver can play it. */
async function webPage() {
  const { buildWeb } = await load();
  const { files, js } = buildWeb();
  const css = [...files.keys()].find((p) => /^assets\/tumult\.[0-9a-f]{10}\.css$/.test(p));
  return `<!doctype html><html><head><style>${files.get(css)}</style></head><body><div id="app"></div><script>${js}</script></body></html>`;
}

/** Catch every request the page makes: fetch and sendBeacon, both recorded, none sent. */
function catcher(sent) {
  return (w) => {
    w.fetch = (url, init) => {
      sent.push({ url: String(url), body: JSON.parse(init.body), via: 'fetch' });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    };
    w.navigator.sendBeacon = (url, blob) => {
      sent.push({ url: String(url), blob, via: 'beacon' });
      return true;
    };
  };
}

test('the schema is the server’s shape: events with described fields, and an envelope', () => {
  assert.ok(SCHEMA.events && typeof SCHEMA.events === 'object');
  for (const [name, e] of Object.entries(SCHEMA.events)) {
    assert.match(name, /^[a-z][a-z0-9_]*$/, name);
    assert.ok(e.description, `${name} has no description`);
    for (const [f, spec] of Object.entries(e.properties)) assert.ok(spec.type && spec.description, `${name}.${f}`);
  }
  for (const f of ['distinct_id', 'session_id', 'app_version', 'platform', 'schema_version', 'timestamp_utc_ms'])
    assert.ok(SCHEMA.common_envelope[f], f);
  const telemetry = fs.readFileSync(path.join(root, 'src', 'ui', 'telemetry.js'), 'utf8');
  assert.match(
    telemetry,
    new RegExp(`SCHEMA_VERSION = ${SCHEMA.schema_version};`),
    'telemetry.js and the schema agree',
  );
  for (const [, name] of telemetry.matchAll(/TL\.track\(\s*'([a-z_]+)'/g))
    assert.ok(SCHEMA.events[name], `telemetry.js sends '${name}', which the schema does not list`);
  const welcome = fs.readFileSync(path.join(root, 'src', 'ui', 'welcome.js'), 'utf8');
  const fromWelcome = [...welcome.matchAll(/track\(\s*'([a-z_]+)',\s*\{([^}]*)\}/g)];
  assert.ok(fromWelcome.length >= 5, 'welcome.js names its events');
  for (const [, name, fields] of fromWelcome) {
    assert.ok(SCHEMA.events[name], `welcome.js sends '${name}', which the schema does not list`);
    for (const [, f] of fields.matchAll(/([a-z_]+):/g))
      assert.ok(SCHEMA.events[name].properties[f], `welcome.js sends ${name}.${f}, which the schema does not list`);
  }
});

test('only the web version carries the sender, filled with the address and the public key', async () => {
  const { build, buildWeb, analyticsConfig } = await load();
  const cfg = analyticsConfig();
  assert.equal(cfg.key, KEY);
  assert.equal(cfg.url, URL_);
  const web = buildWeb().js;
  assert.ok(web.includes('───── web/analytics.js ─────'));
  assert.ok(web.includes(JSON.stringify(cfg)), 'the build wrote the address and key in');
  assert.ok(!web.includes('/*__ANALYTICS__*/'));
  for (const variant of [{}, { playtest: true }]) {
    const { js } = build(variant);
    assert.ok(!js.includes('───── web/analytics.js ─────'), 'the offline and playtest files have no sender');
    assert.ok(!js.includes(cfg.url) && !js.includes(cfg.key), 'nor the address or key');
  }
});

test(
  'a whole run in the web version sends the funnel and each mission, every event in the schema, nothing personal',
  { skip, timeout: 180_000 },
  async () => {
    const { driveRun } = require('../tools/ui-drive');
    const sent = [];
    let flushed = 0;
    const r = await driveRun(await webPage(), {
      seed: 3,
      auto: false, // faces clicked through the screens, as a player plays them
      url: 'https://tumult.froglet.games/',
      setup: catcher(sent),
      after: async (w) => {
        // the last events (run_ended, pilot_saved) reach the sender through a promise: let them land
        // before asking what is queued, or a slow machine finds the queue still empty
        await w.T.Backend.use('analytics');
        await new Promise((res) => setTimeout(res, 5));
        for (let i = 0; i < 20 && w.T.Analytics.queued(); i++) {
          await w.T.Analytics.flush(false);
          await new Promise((res) => setTimeout(res, 5));
        }
        flushed = w.T.Analytics.queued();
        w.dispatchEvent(new w.Event('pagehide'));
        await new Promise((res) => setTimeout(res, 20));
      },
    });
    assert.deepEqual(r.errors, []);
    assert.equal(flushed, 0, 'everything queued was sent');
    const fetched = sent.filter((s) => s.via === 'fetch');
    assert.ok(fetched.length >= 1);
    for (const s of fetched) {
      assert.equal(s.url, URL_ + '/batch/');
      assert.equal(s.body.api_key, KEY);
    }
    const events = fetched.flatMap((s) => s.body.batch);
    const names = events.map((e) => e.event);
    for (const step of [
      'session_started',
      'run_started',
      'draft_completed',
      'tutorial_shown',
      'mission_started',
      'mission_ended',
      'run_ended',
    ])
      assert.ok(names.includes(step), `no ${step} in ${names.join(', ')}`);
    assert.ok(
      sent.some((s) => s.via === 'beacon'),
      'leaving the page sends what is left',
    );

    const ids = new Set(events.map((e) => e.properties.distinct_id));
    assert.equal(ids.size, 1, 'one anonymous player');
    assert.match([...ids][0], /^t_[0-9a-f]{24}$/);
    for (const e of events) {
      const spec = SCHEMA.events[e.event];
      assert.ok(spec, `${e.event} is not in the schema`);
      for (const f of Object.keys(e.properties))
        assert.ok(spec.properties[f] || SCHEMA.common_envelope[f], `${e.event}.${f} is not in the schema`);
      assert.equal(e.properties.platform, 'web');
      assert.equal(e.properties.build_kind, 'release');
      assert.ok(!Number.isNaN(Date.parse(e.timestamp)));
    }
    const first = events.find((e) => e.event === 'session_started');
    assert.equal(first.properties.first_visit, true);
    const ended = events.filter((e) => e.event === 'mission_ended');
    assert.equal(ended.length, r.missions, 'one mission_ended per mission played');
    assert.equal(new Set(ended.map((e) => e.properties.match_id)).size, ended.length, 'each reported once');
    const started = events.filter((e) => e.event === 'mission_started');
    assert.equal(started.length, ended.length);
    const m = ended[0].properties;
    assert.ok(['won', 'lost'].includes(m.outcome));
    assert.ok(m.rounds >= 1);
    let all = 0;
    for (const { properties: x } of ended) {
      const faces = Object.values(x.faces).reduce((a, b) => a + b, 0);
      assert.equal(faces, x.faces_physical + x.faces_ethereal, 'the per-face counts add up');
      for (const k of Object.keys(x.faces)) assert.match(k, /^[A-Za-z0-9_]+:[PE]$/);
      all += faces;
    }
    assert.ok(all > 0, 'faces were counted');
    assert.equal(m.first_mission, true);
    // nothing personal: no pilot names a player typed, no save
    const text = JSON.stringify(events);
    for (const e of events.filter((x) => x.properties.squad))
      for (const p of e.properties.squad) assert.deepEqual(Object.keys(p).sort(), ['cards', 'clades', 'pilot']);
    assert.ok(!/"name"|"seed"|"heroes"/.test(text), 'no names, seeds or saves in the events');
  },
);

test(
  'a player who turns it off, or a browser that asks not to be tracked, sends nothing',
  { skip, timeout: 60_000 },
  async () => {
    const { JSDOM } = require('jsdom');
    const { until } = require('../tools/ui-drive');
    const html = await webPage();
    for (const how of ['toggle', 'gpc', 'localhost', 'offline-file']) {
      const sent = [];
      const page = how === 'offline-file' ? (await load()).build().html : html;
      const dom = new JSDOM(page, {
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        url: how === 'localhost' ? 'http://localhost:5173/' : 'https://tumult.froglet.games/',
        beforeParse(w) {
          catcher(sent)(w);
          if (how === 'gpc') Object.defineProperty(w.navigator, 'globalPrivacyControl', { value: true });
        },
      });
      const w = dom.window;
      try {
        await until(() => w.T.Telemetry && w.T.Telemetry.started, 'telemetry started');
        const d = w.document;
        if (how === 'toggle') {
          assert.match(d.getElementById('app').innerHTML, /anonymous play data/);
          d.querySelector('[data-act="analyticsToggle"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
          assert.match(d.getElementById('app').innerHTML, /Anonymous play data is off/);
          await new Promise((res) => setTimeout(res, 5));
          const before = w.T.Analytics.queued();
          d.querySelector('[data-act="newRun"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
          await new Promise((res) => setTimeout(res, 5));
          assert.equal(w.T.Analytics.queued(), before, 'nothing more is queued once it is off');
          await w.T.Analytics.flush(false);
          const names = sent.flatMap((s) => s.body.batch.map((e) => e.event));
          assert.equal(names[names.length - 1], 'analytics_turned_off', 'the last event says it was turned off');
        } else {
          if (how === 'gpc') assert.match(d.getElementById('app').innerHTML, /asks sites not to track/);
          if (w.T.Analytics) await w.T.Analytics.flush(false);
          w.dispatchEvent(new w.Event('pagehide'));
          await new Promise((res) => setTimeout(res, 5));
          assert.deepEqual(sent, [], `${how}: no request at all`);
          assert.ok(
            !/play data/.test(d.getElementById('app').innerHTML) || how === 'gpc',
            `${how}: no line on the title`,
          );
        }
      } finally {
        w.close();
      }
    }
  },
);

test('the backend seam: a provider serves only what it offers', async () => {
  const T = { Backend: { _providers: [] } };
  global.T = T;
  delete require.cache[require.resolve('../src/ui/backend.js')];
  require('../src/ui/backend.js');
  const B = global.T.Backend;
  B.register({ name: 'stats', capabilities: ['analytics'], available: () => true, use: (c) => ({ c }) });
  assert.equal(B.available(), false, 'an analytics provider does not make the game online');
  assert.equal(B.available('analytics'), true);
  assert.equal(B.name('analytics'), 'stats');
  assert.equal(await B.use('db'), null);
  B.register({ name: 'worker', available: () => true, use: (c) => ({ c }) });
  assert.equal(B.name(), 'worker');
  assert.equal(B.name('analytics'), 'stats', 'a newer online provider leaves analytics where it was');
  assert.deepEqual(await B.use('analytics'), { c: 'analytics' });
});
