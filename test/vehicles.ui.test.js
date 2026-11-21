'use strict';
/* The garage and a vehicle on the mission screen, through the real interface (jsdom). */
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

test(
  'UI: the garage, then getting out, driving and a vehicle card on the board',
  { skip, timeout: 60_000 },
  async () => {
    const { build } = await import(pathToFileURL(path.join(__dirname, '..', 'tools', 'build.mjs')).href);
    const { JSDOM } = require('jsdom');
    const { until } = require('../tools/ui-drive');
    const errors = [];
    const dom = new JSDOM(build().html, {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'http://localhost/',
    });
    const w = dom.window;
    w.addEventListener('error', (e) => errors.push(e.message));
    const d = w.document;
    try {
      await until(() => d.getElementById('app') && d.getElementById('app').innerHTML, 'the first render');
      const { T } = w;
      const U = T.UI;
      const click = (sel) => {
        const el = d.querySelector(sel);
        assert.ok(el && !el.disabled, 'nothing to click: ' + sel);
        el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
      };
      // a run whose first stop is a Crossing on the salt flat
      const run = T.newRun(9);
      run.heroes = [T.heroFromPrebuilt(run, T.PREBUILTS[0]), T.heroFromPrebuilt(run, T.PREBUILTS[2])];
      run.heroes.forEach((h) => T.autoAllocate(h));
      T.startMap(run);
      const node = run.map.all[run.map.rows[0][0]];
      Object.assign(node, { type: 'crossing', tier: 1, page: 'saltflat' });
      run.available = [node.id];
      U.run = run;
      U.screen = 'map';
      U.render();
      click(`[data-act="goNode"][data-arg="${node.id}"]`);
      assert.equal(U.screen, 'garage');
      assert.ok(d.querySelector('.veh-grid'), 'each pilot has the vehicles to pick from');
      click('[data-act="pickVeh"][data-arg="0|crawler"]');
      assert.equal(run.garage.picks[0], 'crawler');
      click('[data-act="setOut"]');
      assert.equal(U.screen, 'mission');
      const m = U.run.mission;
      assert.ok(d.querySelector('.token.vehicle'), 'the vehicles are on the board');
      assert.ok(d.querySelector('.veh-chip'), 'the dock says which vehicle you are in');
      assert.ok(d.querySelector('.edge.vpath'), 'paths over the fissures are drawn for vehicles');
      // drive: click a highlighted space
      const h = m.heroes[U.ms.heroIdx];
      const before = h.pos;
      if (T.driveOptions(m, h).length) {
        click('#nodes .node.valid');
        assert.notEqual(h.pos, before, 'the click drove the vehicle');
        assert.equal(T.vehicleOf(m, h).pos, h.pos);
      }
      // get out, onto a highlighted space
      if (T.leaveOptions(m, h).length) {
        click(`[data-act="vleave"][data-arg="${U.ms.heroIdx}"]`);
        click('#nodes .node.valid');
        assert.equal(h.ride, undefined, 'out on foot');
      }
      assert.deepEqual(errors, []);
    } finally {
      w.close();
    }
  },
);
