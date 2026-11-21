/* ============================================================================
   TUMULT — THE GARAGE (browser only)
   Right before a mission that needs vehicles, each player picks one for their
   pilot (Garrett, 2026-11-21): one vehicle slot a pilot. The rules are
   src/engine/vehicles.js; the vehicles, src/data/vehicles.js.
   ========================================================================== */
(function (T) {
  const U = (T.UI = T.UI || {});
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const groundWords = (d) => d.ground.map((t) => T.TERRAIN[t].name.toLowerCase()).join(', ') + (d.height ? ', high ground' : '');
  /** One vehicle, as a card to pick. */
  function vehicleCard(d, i, on, mine) {
    const cards = d.cards
      .map(
        (c) =>
          `<div class="small">• <b>${esc(c.n)}</b> <span class="mono dim">${c.ap} AP${c.seat === 'driver' ? ' · driver' : ' · any seat'}${c.weapon ? ' · weapon' : ''}</span> ${esc(c.txt)}</div>`,
      )
      .join('');
    const ride = d.ride ? `<div class="small">◆ Riders: ${esc(T.describeState(d.ride, { t: 1 }))}</div>` : '';
    return `<div class="am-ware veh-pick${on ? ' on' : ''}"><div class="row"><span class="am-wi" style="font-size:22px">${d.icon}</span><b>${esc(d.name)}</b><span class="right mono small">seats ${d.seats} · speed ${d.speed} · hull ${d.hull}</span></div>
      <div class="small dim">${esc(d.blurb)}</div><div class="small">Crosses: ${esc(groundWords(d))}</div>${ride}${cards}
      ${mine ? `<div class="am-buy"><button class="sm ${on ? 'primary' : ''}" data-act="pickVeh" data-arg="${i}|${d.id}">${on ? '✓ Picked' : 'Pick'}</button></div>` : ''}</div>`;
  }

  U.renderGarage = function () {
    const run = U.run;
    const g = run && run.garage;
    if (!g) return '';
    const pageId = T.garagePage(run);
    const page = T.PAGE_BY[pageId];
    const picks = T.vehiclePicks(run, pageId);
    const lead = !run.party || T.mayLead(run, U.seats);
    const pilots = run.heroes
      .map((h, i) => {
        const mine = U.own ? U.own(i) : true;
        const chosen = g.picks[i];
        const shown = chosen || picks[i];
        return `<div class="panel veh-pilot"><div class="row"><b>${esc(h.name)}</b><span class="right small dim">${chosen ? 'picked' : 'suggested'}: ${T.VEHICLE_BY[shown].icon} ${esc(T.VEHICLE_BY[shown].name)}</span></div>
          <div class="veh-grid">${T.VEHICLES.map((d) => vehicleCard(d, i, shown === d.id, mine)).join('')}</div></div>`;
      })
      .join('');
    const ground = page
      ? `<p class="small">${page.rules.map((r) => '• ' + esc(r)).join('<br>')}</p>`
      : '';
    return `<div class="wrap garage">${U.header ? U.header('Vehicles') : ''}
      <div class="panel"><h2 style="margin:0">${esc(page ? page.name : 'Wide country')}</h2><p class="dim">${esc(page ? page.blurb : '')}</p>${ground}
      <p class="small">Each pilot brings one vehicle. Getting in or out costs 1 AP, and so does each Drive. Inside, you play only the vehicle's cards and your faces marked <b>Mounted</b>; blows land on the hull, and a wrecked vehicle throws its riders clear.</p>
      <div class="row">${lead ? '<button class="primary" data-act="setOut">Set out ➤</button>' : '<span class="dim small">Waiting for the host to set out.</span>'}</div></div>
      ${pilots}</div>`;
  };
  (U.SCREENS = U.SCREENS || {}).garage = U.renderGarage;

  U.garageAct = function (act, arg) {
    if (act === 'pickVeh') {
      const [i, type] = String(arg).split('|');
      const r = U.exec({ op: 'pickVehicle', hero: +i, vehicle: type });
      if (!r.ok) U.toast(r.why);
      else if (U.sfx && U.sfx.click) U.sfx.click();
      T.saveRun(U.run);
      U.render();
      return true;
    }
    if (act === 'setOut') {
      const r = U.exec({ op: 'setOut' });
      if (!r.ok) {
        U.toast(r.why);
        return true;
      }
      U.screen = 'mission';
      U.enterMission();
      T.saveRun(U.run);
      U.render();
      return true;
    }
    return false;
  };
  (U.ACTS = U.ACTS || []).push(U.garageAct);
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
