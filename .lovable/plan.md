
# Support 2–4 Teams

Refactor `VipBrawlApp` from a hardcoded 2‑team model to a configurable 2–4 team model. Scoring rules stay identical per team; every screen becomes N‑aware.

## 1. Data model changes (`src/components/VipBrawlApp.tsx`)

Replace A/B identifiers with an array-based model.

- `TeamKey`: `"A" | "B"` → `string` (stable id, e.g. `"t1"`, `"t2"`, `"t3"`, `"t4"`)
- `teams`: `Record<TeamKey, Team>` → `Team[]` with `id` field on each `Team`
- Scores: separate `scoreA`, `scoreB` → `scores: Record<string, number>`
- `RoundEntry` becomes:
  ```ts
  interface RoundEntry {
    round: number;
    matchWinner: string;              // team id
    vipKilledTeamIds: string[];       // ids of teams whose VIP died this round
    firstVipKiller: string | null;    // team id or null
    deltas: Record<string, number>;   // per-team point delta
  }
  ```
- New setting: `teamCount: 2 | 3 | 4` (persisted in `vb.settings`)
- Storage migration: on load, detect legacy `{ A, B }` shape in `vb.teams` and convert to `Team[]` with generated ids; bump storage key to `vb.teams.v2` to avoid crashes for existing users

## 2. Setup screen

- Add a "Number of teams" segmented control (2 / 3 / 4) above the team cards
- Team card grid: `grid-cols-2` → `grid-cols-2` for 2 and 4 (2×2 for 4), `grid-cols-1 sm:grid-cols-3` for 3
- Drop the central "VS" bubble when N > 2 (or replace with "FREE‑FOR‑ALL")
- Color‑swap logic: when a team picks a color already in use by any other team, swap with that team (generalizes the current A↔B swap)
- Default team names/icons/colors for slots 3 and 4 (e.g. Green Team / Yoshi / green, Purple Team / Kirby / purple)
- Ambient background blobs: use first and last team colors (visually similar to today)
- Description text: keep "First to [N] points win" — no change

## 3. Play screen — round entry (team-icon buttons)

Replace the current 2‑option toggles with rows of N team-icon buttons.

- **"Who won the match?"** — one row of N `TeamIcon` buttons; single-select radio behavior; selected team gets a glow ring in its color
- **"Whose VIP died?"** — one row of N `TeamIcon` buttons; multi-select (any subset can die in one round, including zero or all); shows a small skull overlay on selected icons
- **"Who got the first VIP kill?"** (when `firstVipMode` is on) — one row of N buttons, single-select, only enabled when at least one VIP was marked dead; the killer cannot be a team whose own VIP died first — enforced only if unambiguous, otherwise let the user pick
- Score display at top: N score tiles in a responsive grid (`grid-cols-2` for 2, `grid-cols-3` for 3, `grid-cols-2` for 4 → 2×2)
- Scoring math stays identical, applied per team:
  - Match winner: +`matchWinPoints` to winner only
  - VIP kill points: +`vipKillPoints` to each surviving team for every dead VIP that isn't theirs (i.e. every team that didn't lose their VIP gets `vipKillPoints × numDeadVips`) — **decision point below**
  - First VIP bonus: +`firstVipBonusPoints` to `firstVipKiller`

  → Question embedded: with 3–4 teams, if Team A's VIP dies, should **both** surviving teams (B and C) each get `vipKillPoints`, or only whoever landed the kill? The current 2‑team rules can't distinguish, so I'll default to **only the match winner scores VIP kill points for VIPs killed that round**, unless you tell me otherwise during build.

## 4. Round result overlay & round detail modal

- Animation: N stacked delta rows instead of two side-by-side columns; each row shows team icon + name + `+N` in the team's color
- Round detail modal: list per‑team deltas rather than the A vs B split

## 5. Winner screen + share image

- Determine winner by `Math.max` of scores
- **Tie‑break: sudden death** — if two or more teams are tied for the lead at target, the game does NOT end; instead show a "SUDDEN DEATH" banner on the play screen and continue rounds until exactly one team leads at end of round
- Winner screen: podium/leaderboard of all N teams sorted by score; champion at top with crown
- Share card (`html2canvas` target): vertical stack of N team rows with icons, colors, and final scores; sized to fit 4 teams cleanly

## 6. Settings sheet

No changes to scoring rule inputs. Team count lives on the setup screen (it's a game‑config decision, not a rules tweak).

## 7. Files touched

- `src/components/VipBrawlApp.tsx` — the entire refactor lives here (single file, ~1,200 lines today; will grow modestly)
- `src/components/TeamIcon.tsx` — no changes expected
- No route, backend, or dependency changes

## Effort estimate

Roughly a half‑day to a day of focused work. The scoring math generalizes cleanly; most time goes into the round‑entry UI, the winner/share layout, and the storage migration. Low risk to existing 2‑team behavior since `teamCount = 2` will render identically to today (aside from the minor round‑entry UI change to team‑icon buttons).

## Open decisions to confirm at build time

1. **VIP kill points distribution** with 3–4 teams (default proposed: only the match winner earns VIP kill points for dead VIPs that round)
2. Whether the 2‑team round entry should also switch to team‑icon buttons for consistency, or keep the current toggle UI when `teamCount === 2`
