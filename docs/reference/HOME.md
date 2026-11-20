# Home, the setup, tables and the Lobby

How the game's front door works today (`src/ui/home.js`, `src/ui/home.css`). The screens follow the
Frogma - Tumult board's finalised picks: Landing, Home 1, Setup 4 (inline), Create A, Join B, the
Lobby panel and Waiting C, on desktop and phone. One markup serves both; under 760px the styles fold
it to the phone layout.

## The screens

| Screen                   | `U.screen`             | When                                                                                                                                                                                 |
| ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing                  | `title`                | A first visit: nothing played, nothing saved, no invite link (`U.isNewPlayer` when the onboarding is in the build). Play now, Host a table, Join a game, and the setup folded below. |
| Home                     | `title`                | Every other visit. Continue (the saved expedition: its stop, its place, its pilots), the new-expedition setup, Host a table, Join a game, Make a pilot.                              |
| Host a table             | `host`                 | Before the table opens: the host's choices and their name. _Open the table_ hosts it (`netHost`).                                                                                    |
| Your table               | `lobby` (host)         | The open table: its choices (still changeable), the code and invite link, the seats, people online to invite, and Start.                                                             |
| Waiting room             | `lobby` (guest)        | A guest at a table, before the host starts.                                                                                                                                          |
| Join a game              | `join`                 | A code box, the player's name, sign in, and the games being played.                                                                                                                  |
| Lobby panel              | a drawer on any screen | Games (being played, with Join or Rejoin) and People (who is online, signed in). Opened from the Lobby chip in the top bar.                                                          |
| Waiting during the draft | `draft`, step `wait`   | A player whose pilot is ready while others draft: every seat and whether its pilot is ready.                                                                                         |

## The new-expedition setup

Four rows of choices and Start, unfolding in place on Home:

- **Players**: Solo, 2, 3, 4 or 5 (`meta.players`, as before).
- **Where**: This screen, or Online (`meta.where`). Online needs the online screens (the web version or
  the playtest page) and two or more players; Start then becomes _Host it_ and opens Host a table.
- **Rounds**: Take turns or All at once (`meta.rounds`; `run.party.rounds`). The playtest panel's
  switch writes the same value.
- **Wind**: Steady wind or Gale (`meta.tide`, `T.TIDES`).

A line under the choices says what they add up to. _Same as last time_ appears once a setup has been
started and differs from the one shown.

## Hosting a table

The host chooses the expedition's **length** (Short or Full, when the engine has `T.LENGTHS`), the
**wind**, how **rounds** go, how many **seats** (2 to 5), and whether **AI fills empty seats** (when the
engine has `T.fillSeats`). These are kept in `meta.table` and handed to the online game as
`U.net.tableOpts = { seats, aiFill, length }`, which `N.start` reads. Co-op is the only mode: Versus was
left out for now (Shombith, 2026-11-20).

## What it needs from elsewhere

Every online piece is optional, so the offline file is still a whole game:

- `U.net` (`src/ui/net.js`): hosting, joining, the games list. Without it, Host and Join are not shown.
- The backend's `lobby` capability (`T.Backend.use('lobby')`, `src/web/backend-worker.js`): the People
  tab, the online count on the Lobby chip, and inviting from the table.
- `T.Account` (`src/ui/account.js`): Sign in in the top bar and on Join; a signed-in player's name is
  used at the table. `U.askSignIn` opens the sign-in sheet.
- `U.shell(tab, html)` (`src/ui/shell.js`): the shared top bar and phone tabs. Home puts the Lobby chip
  and the player's avatar in its right side through `U.shellRight`. Without the shell, Home draws a bar
  of its own.
- `T.setLength`, `T.fillSeats`, `T.isBot` (`src/engine/bots.js`): the length, AI seats and the
  waiting room's AI rows.

## Kept on the device

In `tumult_v2_meta`: `players`, `tide`, `where`, `rounds`, `table` (`{ length, aiFill, seats }`),
`lastSetup` (for _Same as last time_) and `netName` (the name last given for online play).
