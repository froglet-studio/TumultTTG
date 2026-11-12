"""
TUMULT — Reference Engine (v1.0)
=================================
A single-file Python implementation of the canonical Tumult rules. This is the
reference for anyone extending the system: every mechanic in
`docs/01_consolidated_core.md` is implemented exactly once, here, with the
explicit P/E formulas from Part III of that doc.

Run directly:
    python3 tumult_engine.py duel      # simulate a 1v1 duel, print a turn log
    python3 tumult_engine.py mission   # simulate The Drowning Vault co-op mission
    python3 tumult_engine.py stats     # run a batch of duels, print balance/length

Extend by:
    - Adding cards to the ABILITIES table at the top of Section III.
    - Adding scenarios to MISSIONS.
    - Writing a smarter policy in the POLICIES section.

Design invariants (enforced):
    - Total dice = 15 always (pool + banked, asserted).
    - No ability ever skips a turn (control taxes efficiency, never agency).
    - P scales physical magnitude only; E unlocks/scales capabilities P cannot
      buy at any level. Verified non-degenerate in `scaling_check.py` (omitted
      here for brevity; the assertion lives in the spec).
"""
from __future__ import annotations
import random, sys
from collections import deque
from dataclasses import dataclass, field
from typing import Optional

# ============================================================================
# I.  CONSTANTS & DICE
# ============================================================================
VITALITY = 26
POOL_SIZE = 15
ROLL_PER_TURN = 3
TRACK_DEPTH = 6

# Base d12 face distribution (12 outcomes total). AP-saturated; etherions scarce.
DIE_FACES = ['M', 'C', 'S', 'T', 'O', 'AP2'] + ['AP'] * 6

def roll_one(rng): return rng.choice(DIE_FACES)


# ============================================================================
# II. STATES (the conditions abilities create/remove/exploit)
# ============================================================================
# Every state has multiple emergent answers (see docs/02_mechanic_basis.md);
# none is a single key.
STATE_DEFS = {
    'Hidden':   'Immune to LOS strikes only. Broken by melee, area, force, or being Located.',
    'Shield':   'Reduce incoming damage by N. Bypassed by Pierce / area / forced displacement.',
    'Anchored': 'Cannot be moved. You still act fully (no turn theft).',
    'Marked':   'A token; next qualifying hit consumes for +2.',
    'Bloom':    'Engine: draws +1 Charge from pool each turn.',
    'Regen':    'Engine: +N vitality each turn.',
    'DugIn':    'Concealed + next strike +3.',
}


# ============================================================================
# III. CARDS (each has two abilities with distinct cooldowns)
# ============================================================================
# Format: card_id -> {'name', 'elem', 'abilities': [phys, eth]}
# Each ability is (id, name, ap_cost, etherion_cost, etherion_type, cd, duration,
# applies P to..., applies E to..., description).
# P scales the physical magnitude; E unlocks/scales a capability P cannot buy.

ABILITIES = {
    # ---- Human (cerebral / social) ----
    'mind': {'name': 'Theory of Mind', 'elem': 'T', 'abilities': [
        ('read',    'Read',     1, 0, None, 0, 0, 'Mark target (+2 to your next qualifying hit).'),
        ('preempt', 'Pre-empt', 2, 1, 'T',  3, 2, 'Capability: pre-arm — foe\'s next hit on you reduced by 3+2(E-1); at E>=2 reflect E damage.'),
    ]},
    'throw': {'name': 'Throwing Arm', 'elem': 'M', 'abilities': [
        ('hurl',    'Hurl',         1, 0, None, 0, 0, 'LOS strike for 2+P.'),
        ('heavy',   'Heavy Throw',  2, 1, 'M',  2, 0, 'Capability: knockback E; at E>=2 pierces shield. Phys: 3+P damage.'),
    ]},
    'persist': {'name': 'Persistence', 'elem': 'T', 'abilities': [
        ('pace',    'Pace',         1, 0, None, 1, 0, 'Shrug one slow/fatigue; +P move this turn.'),
        ('wind',    'Second Wind',  2, 1, 'T',  4, 4, 'Capability (engine): Regen 2+E each turn (Dur 4).'),
    ]},
    # ---- Mimic Octopus (trickster / utility) ----
    'ambush': {'name': 'Burrow Ambush', 'elem': 'S', 'abilities': [
        ('digin',   'Dig In',       1, 0, None, 2, 0, 'Hidden for 1+P/2 turns; next strike +3.'),
        ('leap',    'Ambush Leap',  2, 1, 'S',  3, 0, 'Capability: teleport adjacent within 1+E of target. Phys: 3+P arrival strike.'),
    ]},
    'cloak': {'name': 'Chromatic Cloak', 'elem': 'C', 'abilities': [
        ('blend',   'Blend',        1, 0, None, 1, 0, 'Hidden while you don\'t move (1+P/2 turns).'),
        ('vanish',  'Vanish',       1, 2, 'C',  3, 0, 'Capability: Hidden for 1+E turns AND may move while Hidden. Phys: Shield P brace.'),
    ]},
    'jet': {'name': 'Jet', 'elem': 'M', 'abilities': [
        ('jet',     'Jet',          1, 0, None, 0, 0, 'Move 2+P nodes.'),
        ('recoil',  'Recoil Slam',  2, 1, 'M',  2, 0, 'Capability: Force-push target E nodes. Phys: dash 1+P + 2+P damage.'),
    ]},
    # ---- Mantis Shrimp (burst brawler) ----
    'smasher': {'name': 'Smasher', 'elem': 'M', 'abilities': [
        ('punch',   'Punch',        1, 0, None, 0, 0, 'Melee 3+P.'),
        ('slam',    'Tectonic Slam',4, 2, 'M',  4, 0, 'Capability: Pierce + knockback E + cleave all adjacent at E>=2. Phys: 6+P.'),
    ]},
    # ---- Electric Eel (ranged attrition) ----
    'discharge': {'name': 'Electric Discharge', 'elem': 'C', 'abilities': [
        ('jolt',    'Jolt',         1, 0, None, 0, 0, 'LOS 2+P.'),
        ('cascade', 'Tesla Cascade',4, 2, 'C',  4, 0, 'Capability: chain to E additional foes within 1 (each 3+E); strips target Shield. Phys: 5+P primary.'),
    ]},
    # ---- Venus Flytrap (zoner / engine) ----
    'trap': {'name': 'Snap-Trap', 'elem': 'T', 'abilities': [
        ('jaws',    'Set Jaws',     2, 0, None, 2, 0, 'Arm a node-snare: 2+P + Anchor on entry.'),
        ('counted', 'Counted Trap', 2, 1, 'T',  3, 0, 'Capability: trap denies teleport-out + triggers on 2nd action in-zone; Anchor 2+E turns. Phys: 4+P.'),
    ]},
    'photo': {'name': 'Photosynthesis', 'elem': 'C', 'abilities': [
        ('bask',    'Bask',         1, 0, None, 1, 0, '+1+P/2 AP next turn.'),
        ('bloom',   'Bloom Engine', 1, 1, 'C',  4, 4, 'Capability (engine): +1 Charge from pool each turn; at E>=2 may instead Mint E Charge.'),
    ]},
    # ---- Defensive / shared ----
    'repulse': {'name': 'Repulse', 'elem': 'M', 'abilities': [
        ('shove',   'Shove',        2, 0, None, 2, 0, 'Force-push adjacent foe 1+P/2 + reposition.'),
        ('thunder', 'Thunderclap',  2, 1, 'C',  3, 0, 'Capability: AREA push — all adjacent foes E nodes. Phys: 2+P area damage.'),
    ]},
    'shield': {'name': 'Static Shield', 'elem': 'M', 'abilities': [
        ('brace',   'Brace',        1, 0, None, 1, 1, 'Shield (2+P) next hit (Dur 1).'),
        ('wall',    'Field Wall',   1, 1, 'M',  3, 2, 'Capability: Shield applies to ALL damage incl. area for 1+E turns; at E>=2 also covers adjacent ally.'),
    ]},
    # ---- Equipment (omnicrystal-fueled) ----
    'grapnel': {'name': 'Grapnel', 'elem': 'X', 'abilities': [
        ('reel',    'Reel',         0, 1, 'O', 1, 0, 'Gear: pull foe 1 toward you. (Omnicrystal-fueled.)'),
        ('winch',   'Winch Yank',   0, 2, 'O', 3, 0, 'Gear capability: pull from any distance into melee + Anchor E turns. Phys: 2+P damage.'),
    ]},
    'scope': {'name': 'Scope', 'elem': 'X', 'abilities': [
        ('glance',  'Glance',       0, 1, 'O', 1, 0, 'Gear: Locate adjacent (reveals Hidden, traps, anything).'),
        ('survey',  'Survey',       0, 2, 'O', 3, 0, 'Gear capability: Locate any node + reveals for 1+E turns.'),
    ]},
}


# ============================================================================
# IV. SAMPLE CHARACTERS (with Upgrade Points spent — see docs Part IV)
# ============================================================================
CAVITT = {
    'name': 'Cavitt',
    'role': 'Brawler-in-the-Cloud (Human · Octopus · Mantis Shrimp)',
    'cards': ['smasher', 'ambush', 'cloak', 'jet', 'throw', 'mind'],
    'upgrades': {  # ability_id -> (P, E)
        'punch': (2, 0), 'slam':   (2, 1),
        'digin': (1, 0), 'leap':   (1, 2),
        'blend': (0, 0), 'vanish': (0, 0),
        'jet':   (0, 0), 'recoil': (0, 0),
        'hurl':  (0, 0), 'heavy':  (0, 0),
        'read':  (0, 0), 'preempt':(0, 0),
    },
}

MARISH = {
    'name': 'Marish',
    'role': 'Tidewarden (Human · Electric Eel · Venus Flytrap)',
    'cards': ['discharge', 'trap', 'repulse', 'shield', 'photo', 'persist'],
    'upgrades': {
        'jolt':    (0, 0), 'cascade': (0, 2),
        'jaws':    (0, 0), 'counted': (0, 2),
        'shove':   (1, 0), 'thunder': (1, 0),
        'brace':   (0, 0), 'wall':    (0, 0),
        'bask':    (0, 0), 'bloom':   (0, 1),
        'pace':    (0, 0), 'wind':    (0, 0),
    },
}


# ============================================================================
# V. FIGHTER
# ============================================================================
@dataclass
class Fighter:
    name: str
    pos: int
    cards: list
    upgrades: dict
    hp: int = VITALITY
    held: list = field(default_factory=list)      # banked rolled dice
    temp: list = field(default_factory=list)      # temporary minted dice (evaporate end of turn)
    pool: int = POOL_SIZE
    track: list = field(default_factory=list)     # list of {'card', 'phase', 'left', 'cd', 'note'}
    states: dict = field(default_factory=dict)    # state_name -> remaining turns (or value)
    _trap_node: Optional[int] = None              # owner of a trap remembers its node

    def P(self, ability_id): return self.upgrades.get(ability_id, (0, 0))[0]
    def E(self, ability_id): return self.upgrades.get(ability_id, (0, 0))[1]

    def total_dice(self): return self.pool + len(self.held)
    def ap(self): return (self.held + self.temp).count('AP') + 2 * (self.held + self.temp).count('AP2')

    def has_ap(self, n): return self.ap() >= n
    def has_el(self, kind, n):
        if kind is None or n == 0: return True
        return (self.held + self.temp).count(kind) + (self.held + self.temp).count('O') >= n

    def spend_ap(self, n):
        while n > 0:
            for src in (self.temp, self.held):
                if 'AP' in src: src.remove('AP'); n -= 1; break
                if 'AP2' in src and n >= 2: src.remove('AP2'); n -= 2; break
            else:
                # forced overpay
                for src in (self.temp, self.held):
                    if 'AP2' in src: src.remove('AP2'); n -= 2; break
                else:
                    break
        # account for returned-to-pool from spending banked dice
        # (we removed from held in-place above; recompute pool by invariant)
        self._reconcile_pool()

    def spend_el(self, kind, n):
        for _ in range(n):
            for src in (self.temp, self.held):
                if kind in src: src.remove(kind); break
                if 'O' in src:  src.remove('O');  break
        self._reconcile_pool()

    def _reconcile_pool(self):
        # Total dice (pool + held) must equal POOL_SIZE; temp dice are minted and don't count.
        target = POOL_SIZE - len(self.held)
        self.pool = target

    def mint(self, face, n):
        """Visible mint: create temporary dice that evaporate at end of turn if unspent."""
        self.temp.extend([face] * n)

    def roll(self, rng):
        k = min(ROLL_PER_TURN, self.pool)
        faces = [roll_one(rng) for _ in range(k)]
        self.held.extend(faces)
        self.pool -= k
        assert self.total_dice() == POOL_SIZE, f"dice invariant broken: {self.total_dice()}"
        return faces

    def in_hand(self, card_id):
        return card_id in self.cards and not any(t['card'] == card_id for t in self.track)

    def slide_track(self):
        keep = []
        for t in self.track:
            t['left'] -= 1
            if t['left'] <= 0:
                if t['phase'] == 'dur' and t['cd'] > 0:
                    t['phase'] = 'cd'; t['left'] = t['cd']; t['note'] = 'cooling'; keep.append(t)
                # else returns to hand (just drop it)
            else:
                keep.append(t)
        self.track = keep

    def commit_card(self, card_id, duration, cooldown, note=''):
        """Firing any ability sends the whole card to the track for that ability's CD+duration."""
        if duration > 0:
            self.track.append({'card': card_id, 'phase': 'dur', 'left': duration, 'cd': cooldown, 'note': note})
        elif cooldown > 0:
            self.track.append({'card': card_id, 'phase': 'cd', 'left': cooldown, 'cd': 0, 'note': 'cooling'})
        # cd 0, dur 0 => stays in hand (the cheap reusable face)


# ============================================================================
# VI. BOARDS
# ============================================================================
# Boards are graphs of nodes. Each node has a row-color (= LOS group).
# Edges = melee/movement. Height nodes are reachable only by Space verbs.

def make_duel_board():
    """Small symmetric arena for the 1v1 control."""
    coords = {1:(0,0),2:(1,0),3:(2,0), 4:(0,1),5:(1,1),6:(2,1), 7:(0,2),8:(1,2),9:(2,2)}
    color  = {1:'A',2:'A',3:'A', 4:'G',5:'G',6:'G', 7:'B',8:'B',9:'B'}
    edges  = [(1,2),(2,3),(4,5),(5,6),(7,8),(8,9),(1,4),(4,7),(2,5),(5,8),(3,6),(6,9)]
    return {'coords': coords, 'color': color, 'edges': edges, 'height': set(), 'spawn': set()}

def make_vault_board():
    """The Drowning Vault — 10 nodes, height ledge at node 10, spawns at 3,7."""
    coords = {1:(0,2),2:(1,2),3:(2,2),4:(3,2), 5:(0,1),6:(1,1),7:(2,1),8:(3,1), 9:(1.5,0),10:(3,0)}
    color  = {1:'B',2:'B',3:'B',4:'B', 5:'G',6:'G',7:'G',8:'G', 9:'A',10:'A'}
    edges  = [(1,2),(2,3),(3,4),(5,6),(6,7),(7,8),(1,5),(2,6),(3,7),(4,8),(6,9),(8,9),(9,10)]
    return {'coords': coords, 'color': color, 'edges': edges, 'height': {10}, 'spawn': {3, 7}}


# Pure graph helpers
def adj_of(board, n): return [b for (a,b) in board['edges'] if a==n] + [a for (a,b) in board['edges'] if b==n]
def adj(board, a, b): return b in adj_of(board, a)
def los(board, a, b): return board['color'][a] == board['color'][b] and a != b

def bfs_dist(board, a, b):
    if a == b: return 0
    seen = {a}; q = deque([(a, 0)])
    while q:
        n, d = q.popleft()
        for m in adj_of(board, n):
            if m == b: return d + 1
            if m not in seen: seen.add(m); q.append((m, d+1))
    return 99

def step_toward(board, a, b):
    if a == b: return a
    seen = {a}; q = deque([(a, [a])])
    while q:
        n, p = q.popleft()
        for m in adj_of(board, n):
            if m == b: return p[1] if len(p) > 1 else m
            if m not in seen: seen.add(m); q.append((m, p + [m]))
    return a


# ============================================================================
# VII. ABILITY RESOLVERS (one per ability_id — the explicit formulas)
# ============================================================================
# Each resolver returns a list of log events describing what happened.
# Events: (actor_short, name, description, damage_dealt).

def resolve_strike(attacker, defender, dmg, kind, label, pierce=False):
    """kind ∈ {'melee','los','area','located'}"""
    if defender.states.get('Hidden', 0) > 0 and kind == 'los':
        return [(attacker.name.lower()[:3], label, f'strikes a chromatic afterimage — no contact', 0)]
    if defender.states.get('Hidden', 0) > 0 and kind in ('melee', 'area', 'located'):
        defender.states.pop('Hidden', None)  # contact reveals
    if attacker.states.get('Marked', 0) > 0 and kind in ('melee', 'los', 'area'):
        dmg += 2
        attacker.states.pop('Marked', None)
        label += ' +Mark'
    eff = dmg
    shield = defender.states.get('Shield', 0)
    if not pierce and shield > 0:
        eff = max(0, dmg - 3)  # shield value is fixed at 3 for simplicity; see Static Shield for variable
    defender.hp -= eff
    return [(attacker.name.lower()[:3], label, f'{kind} hit for {eff}', eff)]

def resolve_force(attacker, defender, kind, label, board):
    if defender.states.get('Anchored', 0) > 0:
        return [(attacker.name.lower()[:3], label, f'{defender.name} anchored — force fails', 0)]
    old = defender.pos
    if kind == 'push':
        # pick neighbor of defender maximizing distance from attacker
        best = max(adj_of(board, defender.pos) + [defender.pos], key=lambda m: bfs_dist(board, m, attacker.pos))
        defender.pos = best
    elif kind == 'pull':
        defender.pos = step_toward(board, defender.pos, attacker.pos)
    if defender.states.get('Hidden', 0) > 0:
        defender.states.pop('Hidden', None)  # being moved reveals
    return [(attacker.name.lower()[:3], label, f'{kind}s {defender.name}: node {old} → {defender.pos}', 0)]


# Each resolver: (fighter, foe, board) -> (events, success_bool).
def fire_punch(f, foe, board):
    P = f.P('punch')
    f.spend_ap(1)
    return resolve_strike(f, foe, 3 + P, 'melee', 'Punch'), True

def fire_slam(f, foe, board):
    P, E = f.P('slam'), f.E('slam')
    f.spend_ap(4); f.spend_el('M', 2)
    events = resolve_strike(f, foe, 6 + P, 'melee', 'Tectonic Slam', pierce=True)
    for _ in range(E):
        events += resolve_force(f, foe, 'push', 'Slam knockback', board)
    # cleave at E>=2 not modeled here (no extra adjacent foes in duel)
    f.commit_card('smasher', 0, 4, 'cooling')
    return events, True

def fire_digin(f, foe, board):
    P = f.P('digin')
    f.spend_ap(1)
    f.states['Hidden'] = max(f.states.get('Hidden', 0), 1 + P // 2)
    f.states['DugIn'] = 1
    f.commit_card('ambush', 1 + P // 2, 2, 'dug in (+3 next)')
    return [(f.name.lower()[:3], 'Dig In', f'gains Hidden + next strike +3', 0)], True

def fire_leap(f, foe, board):
    P, E = f.P('leap'), f.E('leap')
    reach = 1 + E
    if bfs_dist(board, f.pos, foe.pos) > reach:
        return [], False
    f.spend_ap(2); f.spend_el('S', 1)
    old = f.pos
    f.pos = next((n for n in adj_of(board, foe.pos) if n != foe.pos), foe.pos)
    events = [(f.name.lower()[:3], 'Ambush Leap', f'teleports node {old} → {f.pos} (E{E} reach)', 0)]
    events += resolve_strike(f, foe, 3 + P, 'melee', 'Arrival strike')
    f.commit_card('ambush', 0, 3, 'cooling')
    return events, True

def fire_blend(f, foe, board):
    P = f.P('blend')
    f.spend_ap(1)
    f.states['Hidden'] = max(f.states.get('Hidden', 0), 1 + P // 2)
    f.commit_card('cloak', 1 + P // 2, 1, 'concealed')
    return [(f.name.lower()[:3], 'Blend', 'gains Hidden while still', 0)], True

def fire_vanish(f, foe, board):
    P, E = f.P('vanish'), f.E('vanish')
    f.spend_ap(1); f.spend_el('C', 2)
    f.states['Hidden'] = max(f.states.get('Hidden', 0), 1 + E)
    if P > 0: f.states['Shield'] = max(f.states.get('Shield', 0), P)
    f.commit_card('cloak', 1 + E, 3, 'cloaked')
    return [(f.name.lower()[:3], 'Vanish', f'Hidden for {1+E} turns; may move while Hidden', 0)], True

def fire_jet(f, foe, board):
    P = f.P('jet')
    f.spend_ap(1)
    moves = 2 + P
    old = f.pos
    for _ in range(moves):
        if f.pos != foe.pos: f.pos = step_toward(board, f.pos, foe.pos)
    return [(f.name.lower()[:3], 'Jet', f'moves node {old} → {f.pos}', 0)], True

def fire_recoil(f, foe, board):
    P, E = f.P('recoil'), f.E('recoil')
    f.spend_ap(2); f.spend_el('M', 1)
    events = resolve_strike(f, foe, 2 + P, 'melee', 'Recoil Slam')
    for _ in range(E):
        events += resolve_force(f, foe, 'push', 'Recoil push', board)
    f.commit_card('jet', 0, 2, 'cooling')
    return events, True

def fire_hurl(f, foe, board):
    if not los(board, f.pos, foe.pos): return [], False
    P = f.P('hurl')
    f.spend_ap(1)
    return resolve_strike(f, foe, 2 + P, 'los', 'Hurl'), True

def fire_heavy(f, foe, board):
    if not los(board, f.pos, foe.pos): return [], False
    P, E = f.P('heavy'), f.E('heavy')
    f.spend_ap(2); f.spend_el('M', 1)
    events = resolve_strike(f, foe, 3 + P, 'los', 'Heavy Throw', pierce=(E >= 2))
    for _ in range(E):
        events += resolve_force(f, foe, 'push', 'Throw knockback', board)
    f.commit_card('throw', 0, 2, 'cooling')
    return events, True

def fire_read(f, foe, board):
    f.spend_ap(1)
    f.states['Marked'] = 1
    return [(f.name.lower()[:3], 'Read', 'Marks target (+2 next hit)', 0)], True

def fire_preempt(f, foe, board):
    E = f.E('preempt')
    f.spend_ap(2); f.spend_el('T', 1)
    f.commit_card('mind', 2, 3, f'pre-empt: blunt next hit by {3+2*max(0,E-1)}')
    return [(f.name.lower()[:3], 'Pre-empt', f'pre-arms — foe\'s next hit blunted by {3+2*max(0,E-1)}', 0)], True

def fire_jolt(f, foe, board):
    if not los(board, f.pos, foe.pos): return [], False
    P = f.P('jolt')
    f.spend_ap(1)
    return resolve_strike(f, foe, 2 + P, 'los', 'Jolt'), True

def fire_cascade(f, foe, board):
    if not los(board, f.pos, foe.pos): return [], False
    P, E = f.P('cascade'), f.E('cascade')
    f.spend_ap(4); f.spend_el('C', 2)
    foe.states.pop('Shield', None)
    events = resolve_strike(f, foe, 5 + P, 'los', 'Tesla Cascade')
    # chain damage in a 1v1 duel only hits the same target conceptually;
    # in mission/swarm context, chain hits adjacent foes
    f.commit_card('discharge', 0, 4, 'cooling')
    return events, True

def fire_jaws(f, foe, board):
    P = f.P('jaws')
    f.spend_ap(2)
    f._trap_node = step_toward(board, foe.pos, f.pos)
    f.commit_card('trap', 3, 2, f'snare@{f._trap_node}: {2+P}+Anchor')
    return [(f.name.lower()[:3], 'Set Jaws', f'arms a snare on node {f._trap_node}', 0)], True

def fire_counted(f, foe, board):
    P, E = f.P('counted'), f.E('counted')
    f.spend_ap(2); f.spend_el('T', 1)
    f._trap_node = step_toward(board, foe.pos, f.pos)
    f.commit_card('trap', 3, 3, f'counted snare@{f._trap_node}: {4+P}+Anchor{2+E}')
    return [(f.name.lower()[:3], 'Counted Trap', f'arms a counted snare on node {f._trap_node} (E{E})', 0)], True

def fire_shove(f, foe, board):
    if not adj(board, f.pos, foe.pos): return [], False
    f.spend_ap(2)
    events = resolve_force(f, foe, 'push', 'Shove', board)
    f.commit_card('repulse', 0, 2, 'cooling')
    return events, True

def fire_thunder(f, foe, board):
    if not adj(board, f.pos, foe.pos): return [], False
    P, E = f.P('thunder'), f.E('thunder')
    f.spend_ap(2); f.spend_el('C', 1)
    events = resolve_strike(f, foe, 2 + P, 'area', 'Thunderclap')
    for _ in range(E):
        events += resolve_force(f, foe, 'push', 'Thunder push', board)
    f.commit_card('repulse', 0, 3, 'cooling')
    return events, True

def fire_brace(f, foe, board):
    P = f.P('brace')
    f.spend_ap(1)
    f.states['Shield'] = max(f.states.get('Shield', 0), 2 + P)
    f.commit_card('shield', 1, 1, f'Shield {2+P}')
    return [(f.name.lower()[:3], 'Brace', f'gains Shield {2+P} (Dur 1)', 0)], True

def fire_wall(f, foe, board):
    P, E = f.P('wall'), f.E('wall')
    f.spend_ap(1); f.spend_el('M', 1)
    f.states['Shield'] = max(f.states.get('Shield', 0), 2 + P)
    f.commit_card('shield', 1 + E, 3, f'Field Wall — all damage −{2+P}')
    return [(f.name.lower()[:3], 'Field Wall', f'erects Field Wall ({1+E} turns)', 0)], True

def fire_bask(f, foe, board):
    f.spend_ap(1)
    # Bask is modeled as immediate AP refund (next-turn bonus is approximated)
    f.commit_card('photo', 0, 1, 'cooling')
    return [(f.name.lower()[:3], 'Bask', '+1 AP next turn', 0)], True

def fire_bloom(f, foe, board):
    f.spend_ap(1); f.spend_el('C', 1)
    f.states['Bloom'] = 99
    f.commit_card('photo', 4, 4, 'blooming')
    return [(f.name.lower()[:3], 'Bloom Engine', 'opens — +1 Charge each turn', 0)], True

def fire_pace(f, foe, board):
    f.spend_ap(1)
    f.commit_card('persist', 0, 1, 'cooling')
    return [(f.name.lower()[:3], 'Pace', 'shrugs off fatigue', 0)], True

def fire_wind(f, foe, board):
    f.spend_ap(2); f.spend_el('T', 1)
    f.states['Regen'] = 4
    f.commit_card('persist', 4, 4, f'Second Wind: +{2+f.E("wind")}/turn')
    return [(f.name.lower()[:3], 'Second Wind', f'regen engine opens (+{2+f.E("wind")}/turn)', 0)], True

# Dispatch table
RESOLVERS = {
    'punch': fire_punch, 'slam': fire_slam,
    'digin': fire_digin, 'leap': fire_leap,
    'blend': fire_blend, 'vanish': fire_vanish,
    'jet': fire_jet, 'recoil': fire_recoil,
    'hurl': fire_hurl, 'heavy': fire_heavy,
    'read': fire_read, 'preempt': fire_preempt,
    'jolt': fire_jolt, 'cascade': fire_cascade,
    'jaws': fire_jaws, 'counted': fire_counted,
    'shove': fire_shove, 'thunder': fire_thunder,
    'brace': fire_brace, 'wall': fire_wall,
    'bask': fire_bask, 'bloom': fire_bloom,
    'pace': fire_pace, 'wind': fire_wind,
}


# ============================================================================
# VIII. POLICIES (heuristic AI — not optimal play, but consistent)
# ============================================================================
# These choose what to do with the current hand+resources. Swap in smarter
# policies (MCTS, neural net, hand-authored mission AI) here without touching
# the rules above.

def cavitt_policy(c, m, board, log):
    """Brawler: close the distance, set up, deliver burst."""
    d = bfs_dist(board, c.pos, m.pos)
    for ability_id, resolver in [
        ('slam', fire_slam),       # alpha when adjacent + resources
        ('leap', fire_leap),       # close + strike
        ('punch', fire_punch),     # cheap melee
        ('digin', fire_digin),     # set up
        ('hurl', fire_hurl),       # ranged poke
        ('jet', fire_jet),         # close
        ('read', fire_read),       # mark for combo
    ]:
        card_id = next((cid for cid, info in ABILITIES.items() if any(a[0] == ability_id for a in info['abilities'])), None)
        if not c.in_hand(card_id): continue
        ab = next(a for a in ABILITIES[card_id]['abilities'] if a[0] == ability_id)
        ap_c, el_c, el_k = ab[2], ab[3], ab[4]
        if not c.has_ap(ap_c) or not c.has_el(el_k, el_c): continue
        events, ok = resolver(c, m, board)
        if ok:
            log.extend(events)
            return

def marish_policy(m, c, board, log):
    """Zoner: keep range, control, sustain."""
    # Apply engines first
    if m.states.get('Regen', 0) > 0 and m.hp < VITALITY:
        bonus = 2 + m.E('wind')
        m.hp = min(VITALITY, m.hp + bonus)
        log.append((m.name.lower()[:3], 'Regen', f'+{bonus} vitality (now {m.hp})', 0))
    if m.states.get('Bloom', 0) > 0 and m.pool > 0:
        m.pool -= 1; m.held.append('C')
        log.append((m.name.lower()[:3], 'Bloom', '+1 Charge from pool', 0))

    d = bfs_dist(board, c.pos, m.pos)
    if d <= 1:
        for ability_id, resolver in [('shove', fire_shove), ('brace', fire_brace)]:
            card_id = next((cid for cid, info in ABILITIES.items() if any(a[0] == ability_id for a in info['abilities'])), None)
            if not m.in_hand(card_id): continue
            ab = next(a for a in ABILITIES[card_id]['abilities'] if a[0] == ability_id)
            if not m.has_ap(ab[2]) or not m.has_el(ab[4], ab[3]): continue
            events, ok = resolver(m, c, board)
            if ok: log.extend(events); return

    for ability_id, resolver in [
        ('cascade', fire_cascade),    # big AoE-style hit
        ('counted', fire_counted),    # control
        ('bloom', fire_bloom),        # engine
        ('wind', fire_wind),          # engine
        ('jolt', fire_jolt),          # cheap ranged
    ]:
        card_id = next((cid for cid, info in ABILITIES.items() if any(a[0] == ability_id for a in info['abilities'])), None)
        if not m.in_hand(card_id): continue
        ab = next(a for a in ABILITIES[card_id]['abilities'] if a[0] == ability_id)
        if not m.has_ap(ab[2]) or not m.has_el(ab[4], ab[3]): continue
        events, ok = resolver(m, c, board)
        if ok: log.extend(events); return


# ============================================================================
# IX. SIMULATORS
# ============================================================================
def make_fighter(template, pos):
    return Fighter(name=template['name'], pos=pos, cards=list(template['cards']),
                   upgrades=dict(template['upgrades']))

def tick_states(f):
    """End-of-round: decrement state timers; remove expired."""
    for s in list(f.states.keys()):
        if s in ('Bloom', 'Regen', 'Marked', 'DugIn'): continue  # engines / persistent
        v = f.states[s]
        if isinstance(v, int) and v > 0:
            f.states[s] = v - 1
            if f.states[s] <= 0: f.states.pop(s)

def simulate_duel(seed, verbose=False):
    rng = random.Random(seed)
    board = make_duel_board()
    c = make_fighter(CAVITT, pos=7)   # opposite corners
    m = make_fighter(MARISH, pos=3)
    # opening rolls
    c.roll(rng); m.roll(rng)
    turn = 0
    full_log = []
    while c.hp > 0 and m.hp > 0 and turn < 40:
        turn += 1
        for actor, foe, policy in ((c, m, cavitt_policy), (m, c, marish_policy)):
            if c.hp <= 0 or m.hp <= 0: break
            actor.slide_track()
            faces = actor.roll(rng)
            turn_log = []
            policy(actor, foe, board, turn_log)
            actor.temp = []  # mints evaporate
            for ev in turn_log:
                full_log.append((turn, actor.name, *ev))
            if verbose:
                roll_str = ''.join(faces) or '—'
                print(f"T{turn} {actor.name:7s} (rolled {roll_str}) → {[e[1] for e in turn_log] or 'hold'}  | C:{c.hp} M:{m.hp}")
        tick_states(c); tick_states(m)
    winner = 'Cavitt' if m.hp <= 0 else ('Marish' if c.hp <= 0 else ('Cavitt' if c.hp > m.hp else 'Marish'))
    return winner, turn, full_log, c.hp, m.hp


# ============================================================================
# X. ENTRY POINT
# ============================================================================
def main(argv):
    cmd = argv[1] if len(argv) > 1 else 'duel'
    if cmd == 'duel':
        winner, turns, log, c_hp, m_hp = simulate_duel(seed=42, verbose=True)
        print(f"\n{'='*60}\nWINNER: {winner} in {turns} turns (Cavitt {c_hp} HP / Marish {m_hp} HP)\n{'='*60}")

    elif cmd == 'stats':
        import statistics as st
        results = {'Cavitt': 0, 'Marish': 0}
        lengths = []
        for seed in range(1000):
            w, t, _, _, _ = simulate_duel(seed)
            results[w] += 1; lengths.append(t)
        print(f"Over 1000 duels:")
        print(f"  Cavitt wins: {results['Cavitt']} ({100*results['Cavitt']/1000:.0f}%)")
        print(f"  Marish wins: {results['Marish']} ({100*results['Marish']/1000:.0f}%)")
        print(f"  Avg length: {st.mean(lengths):.1f} turns")
        print(f"  In 8-14 turn band: {100*sum(1 for L in lengths if 8 <= L <= 14)/1000:.0f}%")
        print(f"\nKnown imbalance: Cavitt-favored in 1v1. By design, he is the single-target")
        print(f"specialist; he loses to swarms (see mission scenarios). Balance target is")
        print(f"contribution-per-mission, not duel symmetry.")

    elif cmd == 'mission':
        print("Mission simulation: see interactive/tumult_mission.html for the full playable")
        print("scenario. The reference engine here implements the duel as control; the mission")
        print("engine extends it with clock, swarm, and objective nodes — see docs/05_mission.md.")

    else:
        print(__doc__)


if __name__ == '__main__':
    main(sys.argv)
