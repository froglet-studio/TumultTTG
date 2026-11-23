# The browser's Back button

`src/ui/nav.js` gives the game entries in the browser's history, so Back moves through the game instead of leaving it
(before 2026-11-22 the game kept no history, and Back on www.froglet.games/tumult/play/ went straight to the Tumult
page).

- **A screen the player moves to by choice adds an entry:** Home, the Route, Pilots, Cards, Atlas and Canon tabs,
  Settings, hosting and joining, the table. Back returns to the screen before.
- **The steps of an expedition are one entry** (`U.NAV_FLOW`: draft, route, mission, reward, haven, event, garage,
  summary). Moving between them replaces the entry, so Back from the middle of a mission goes to where the player came
  from, not to the previous step. The expedition is saved on the way out, and Forward resumes it where it is
  (the same screen Continue would open).
- **Back with a window open closes the window** and keeps the player on the screen.
- A screen that needs something that has gone (the table after leaving it) falls back to Home.
- Back from the first screen leaves the game, as on any page.

`U.render` calls `U.navNote()` after drawing; the address never changes (no routes in the URL). Code that tidies the
address bar keeps the entry with `history.replaceState(history.state, …)`. `test/nav.test.js` covers it.
