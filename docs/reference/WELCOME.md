# Welcoming new players

How a player gets from a link to their first finished mission (`src/ui/welcome.js`, `src/ui/welcome.css`). It adds screens around the game and changes no rule: the first mission is an ordinary mission, played with ordinary pilots. The designs are the Proposed page of the Frogma - Tumult board (Landing, Guided first mission, Keep your squad, Play with a friend).

## Play now

A first visit (no expedition started on this device, nothing to continue, no invite) sees **Play now** on the title, above the usual buttons; New Expedition becomes **Build your own squad**. Play now starts a run on the chosen difficulty with two pre-made pilots, Rosh (a striker) and Nedira (a shield-bearer) (`U.welcome.FIRST_SQUAD`), awakened as the draft would, and opens the route. A returning player sees the title as before.

## The guided first mission

The first mission's tip (`tumult_v2_tut.mission`, shown once per device as before) is now five steps. Each lights one part of the real mission screen and puts a short card beside it:

| Step | Lit | Says |
|---|---|---|
| dice | the flown pilot's purse and dice | four dice a round; AP pays for cards, an element is the etherion an Ethereal face also needs; unspent dice stay banked |
| cards | the hand | two faces, Physical and Ethereal; point to preview, click to play; a played card rests on the track |
| intent | the first enemy plan on the board | enemies show their plan first; that enemy's plan by name; every plan has more than one answer |
| forecast | "End the round now" | what the squad takes if the round ends now, updated with each preview |
| end | End Round | the enemies act, cards come back, dice are rolled; win by the objective |

Next, Back, Got it and Skip the guide are always there, and the player can play while the guide is open (the lit box does not catch clicks). On a phone the card spans the screen, in the half away from the lit part. If a step's part of the screen is not shown, the card waits in the corner.

## Keep your squad

Sign-in is offered **once**, under the report of the first **won** mission, so the win is read before the ask (the card slides up a moment later). Not before play, not after a loss, not to a guest in someone else's online game, never again after "Not now" (`tumult_v2_tut.keepSquad`). The title carries a quiet "Sign in" line, and hosting an online game asks a signed-out player to sign in first, because the game is saved to its host.

Accounts are T.Backend's `account` capability (`src/ui/backend.js`): `signedIn()`, `methods()`, `signIn(method)`, `name()`. The sign-in Worker's provider offers it. **With no provider, nobody is asked anything** and everything stays on the device, which is how the offline file and the playtest page play today.

## Invites

A link with `?join=CODE` (or `#join=CODE`) opens the title on that game; the code is taken off the address so a reload does not ask again. Where the page can reach online play, the player types a name and joins (no account needed to join). Where it cannot, the title says so and offers Play now. The lobby hands out the link with a Copy button (inside another page, such as the claude.ai test page, it shows the code instead), and shows each seat filled or waiting.

## What it reports

Through anonymous play data (`docs/reference/ANALYTICS.md`): `run_started.play_now`, `guide_step` (next, back, finished, skipped, and the step), `signin_prompt` (where, shown or answered) and `invite_link` (opened, joined, declined, copied). The new-player and invite funnels are in `docs/analytics/EVENT_SCHEMA.json`.

Tests: `test/welcome.test.js`.
