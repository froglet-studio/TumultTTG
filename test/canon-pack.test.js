'use strict';
/* The storyteller pack (2.22): rules from the game, then canon, then the world, then labelled proposals,
   and the repository's copy of public canon. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPack, readLines, mergePublic, loadGame } = require('../tools/canon-pack');

const T = loadGame();
const rec = (id, o) =>
  Object.assign(
    { id, subject: 'place:quarry', kind: 'detail', claim: 'Claim ' + id, shown: '', at: '2026-11-13T00:00:00.000Z' },
    o,
  );
const RECORDS = [
  rec('c_pub', { status: 'canon', public: true, claim: 'Spoil heaps are sorted by colour.' }),
  rec('c_priv', {
    status: 'canon',
    public: false,
    subject: 'pilot:ANVIL',
    kind: 'answer',
    claim: 'A debt to a beacon keeper.',
    shown: 'Why does Brikon Copperwright guide?',
  }),
  rec('c_fix', {
    status: 'canon',
    public: false,
    kind: 'wrong',
    claim: 'Crystal goes up on sledges.',
    shown: 'Dealers in heavy crystal bring boulders up the ramp by hand.',
  }),
  rec('c_prop', { status: 'proposed', claim: 'Quarries sing at night.' }),
  rec('c_no', { status: 'rejected', claim: 'The quarry is named Grey Cut.' }),
  rec('c_world', { status: 'canon', public: true, subject: 'world', claim: 'Windbreaks are repaired before houses.' }),
];

test('canon pack: rules first, then canon under its subject; rejected never, proposals only when asked', () => {
  const { markdown, canon, publicCanon } = buildPack(T, RECORDS, { version: '2.22.0', date: '2026-11-13' });
  const at = (s) => markdown.indexOf(s);
  assert.ok(at('## 1. Rules') < at('## 2. The world') && at('## 2. The world') < at('## 3. Places'));
  assert.match(markdown, new RegExp(`a pool of ${T.RULES.POOL}, ${T.RULES.ROLL} rolled`));
  assert.ok(markdown.includes('Spoil heaps are sorted by colour.'));
  assert.ok(markdown.includes('A debt to a beacon keeper.'), 'private canon is in the (private) pack');
  assert.ok(markdown.includes('(Replaces: “Dealers in heavy crystal'), 'a correction names what it replaces');
  assert.ok(
    at('A debt to a beacon keeper.') > at('### Brikon Copperwright · ANVIL'),
    'pilot canon sits under the pilot',
  );
  assert.ok(markdown.includes('Windbreaks are repaired before houses.'), 'world canon in Other canon');
  assert.ok(!markdown.includes('Grey Cut'), 'rejected never');
  assert.ok(!markdown.includes('Quarries sing at night.'), 'no proposals unless asked');
  assert.equal(canon.length, 4);
  assert.deepEqual(publicCanon.map((r) => r.id).sort(), ['c_pub', 'c_world']);
  const withProps = buildPack(T, RECORDS, { proposals: true }).markdown;
  assert.ok(withProps.includes('*Proposals (not canon; offer, never state as fact):*'));
  assert.ok(withProps.includes('Quarries sing at night.'));
});

test('canon pack: the repository copy holds only public canon, and drops what stops being public', () => {
  const first = mergePublic([], RECORDS);
  assert.deepEqual(
    first.map((r) => r.id),
    ['c_pub', 'c_world'],
  );
  const later = mergePublic(first, [Object.assign({}, RECORDS[0], { public: false })]);
  assert.deepEqual(
    later.map((r) => r.id),
    ['c_world'],
  );
  const lines = T.canonLines(later);
  assert.deepEqual(readLines(lines + '\n\nnot json\n{"no":"id"}'), later);
});

test('canon pack: the repository copy is valid public canon', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const list = readLines(fs.readFileSync(path.join(__dirname, '..', 'docs', 'canon', 'public.jsonl'), 'utf8'));
  for (const r of list) {
    assert.equal(r.status, 'canon', r.id);
    assert.equal(r.public, true, r.id);
    assert.ok(T.isCanonSubject(r.subject), r.id);
  }
});
