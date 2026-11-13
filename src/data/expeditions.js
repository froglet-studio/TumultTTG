/* ============================================================================
   TUMULT — EXPEDITIONS (data)
   Every run is an expedition on Tumult, set down from an Ark. What changes
   from one to the next: who sent it (a domain, and why), what waits at the
   end of the route (the finale is always played by the Heart's rules; this
   is what the Heart is, this time), and the order and ground of its three
   legs: land, sea and air, as Tumult's guide services run.
   T.newExpedition (src/engine/story.js) draws one from the run's
   'expedition' stream. Nothing here is canon: no named places, no named
   people, no history. Tokens: {THREAT} is the threat's name.
   ========================================================================== */
(function (T) {
  /** Who sent the expedition, and why. Domains are ways of living, never sides (docs/LORE.md). */
  T.PATRONS = [
    { id: 'jade_beacon', domain: 'jade', title: 'A Jade appointment',
      brief: 'A Jade beacon past {THREAT} has gone dark. Light it again, and the people who shelter there can come home.' },
    { id: 'jade_rescue', domain: 'jade', title: 'A Jade appointment',
      brief: 'A guide party went toward {THREAT} and did not come back. Under Jade, rescue is free. Somebody has to be the rescue.' },
    { id: 'ruby_first', domain: 'ruby', title: 'A Ruby venture',
      brief: 'No guide has finished this route. Nobody is paying. If you reach {THREAT} and walk away, everyone will know your names.' },
    { id: 'ruby_map', domain: 'ruby', title: 'A Ruby venture',
      brief: 'The ground moved again and the old charts are wrong. Find the new way to {THREAT}, and keep the map.' },
    { id: 'gold_salvage', domain: 'gold', title: 'A Gold contract',
      brief: 'A salvage claim sits beyond {THREAT}. The contract pays on arrival, and not a crystal before.' },
    { id: 'gold_escort', domain: 'gold', title: 'A Gold contract',
      brief: 'A cargo has to cross to the far side of {THREAT}. Escort it there. Losses come out of the fee.' },
  ];

  /** What the Heart is, this time. `name` reads mid-sentence; its own words name the finale and its foe. */
  T.THREATS = [
    { id: 'engine', name: 'the Drowned Engine', ground: 'sea',
      foe: 'Heart of the Drowned Engine', look: 'Something old was sunk here to keep it quiet. It is not quiet.' },
    { id: 'storm', name: 'the Standing Storm', ground: 'air',
      foe: 'Heart of the Standing Storm', look: 'A storm that has not moved in a season. Its eye is solid.' },
    { id: 'hive', name: 'the Quarry Hive', ground: 'land',
      foe: 'Heart of the Quarry Hive', look: 'The quarry was abandoned. Something moved in and kept digging.' },
    { id: 'beacon', name: 'the Hollow Beacon', ground: 'land',
      foe: 'Heart of the Hollow Beacon', look: 'A beacon that still calls people in, and no longer keeps them safe.' },
    { id: 'reef', name: 'the Choking Reef', ground: 'sea',
      foe: 'Heart of the Choking Reef', look: 'A reef that grew a will and stopped letting the tide through.' },
    { id: 'knot', name: 'the Wind Knot', ground: 'air',
      foe: 'Heart of the Wind Knot', look: 'Where three winds meet and none of them can leave.' },
  ];

  /** The three grounds of a route: each leg crosses one, under one of its names, over one of its paintings. */
  T.GROUNDS = {
    land: {
      n: 'land',
      names: ['The Lowland Reach', 'The Quarry Roads', 'The Windbreak Country', 'The Heavy Uphill'],
      scenes: ['scene/ANVIL', 'scene/BUSHY', 'scene/TALON', 'scene/IVY', 'scene/STRIDER', 'scene/MASON', 'scene/SPARE06'],
    },
    sea: {
      n: 'sea',
      names: ['The Open Sea', 'The Drowned Coast', 'The Kelp Shallows', 'The Long Strand'],
      scenes: ['scene/FLUME', 'scene/BANDIT', 'scene/SPARE08', 'scene/RIPTIDE', 'scene/MANGER', 'scene/DOE', 'scene/DAMSEL'],
    },
    air: {
      n: 'air',
      names: ['The High Air', 'The Cloud Shelf', 'The Light Downhill', 'The Storm Lanes'],
      scenes: ['scene/SPARE03', 'scene/WINGMAN', 'scene/SLINGSHOT', 'scene/ASTROFOIL', 'scene/SPARE02', 'scene/LONGSHIFT'],
    },
  };

  /**
   * Where each event can happen. An event on a leg is drawn from those that fit its ground while any are
   * left; an event with no ground fits anywhere. Every event fits two grounds and every ground has eight,
   * so across a run each event is as likely as before: the ground changes where it happens, not how often.
   */
  T.EVENT_GROUNDS = {
    beacon: ['land', 'air'], toll: ['land', 'air'], storm: ['air', 'sea'], bloom: ['sea', 'land'],
    guide: ['air', 'sea'], cache: ['sea', 'land'], shrine: ['land', 'air'], mirror: ['sea', 'land'],
    molt: ['sea', 'land'], envoy: ['land', 'air'], audit: ['air', 'sea'], quiet: ['sea', 'air'],
  };
})(typeof window !== 'undefined' ? (window.T = window.T || {}) : (global.T = global.T || {}));
