## Goal

Replace the current header title area with a labeled game mode selector dropdown so visitors can see all planned Smash Bros tools. The current "VIP Brawl Scorekeeper" remains the active default; future modes are visible but disabled.

## Proposed UI Change

In the setup screen header (around the current `PROTECT THE V.I.P.` title block), add:

- A label: **"Select Game Mode Tool:"**
- A styled dropdown using the existing shadcn `<Select>` component
- Three options:
  1. **VIP Brawl Scorekeeper** — selected by default, fully active
  2. **Around the World (coming soon)** — visible but disabled/unclickable
  3. **The Clone Wars (coming soon)** — visible but disabled/unclickable

The current title/subtitle (`PROTECT THE V.I.P.` + tagline) will move down slightly or remain directly beneath the selector so the page identity is preserved.

## Technical Approach

- Import `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel` from `@/components/ui/select`.
- Introduce a simple `gameMode` state in `VipBrawlApp` (local, no persistence needed yet).
- For disabled items: either use the native `disabled` prop on `<SelectItem>` if supported, or render them with reduced opacity and intercept clicks to prevent selection. The "coming soon" text itself communicates the status.
- Style the trigger to match the dark card aesthetic: `bg-card`, `border-border`, `text-foreground`, rounded, with the label in `text-muted-foreground` above or beside it.

## Scope

- This is a front-end presentation change only. No routing or new pages.
- No backend or data persistence required.
- "Coming soon" selections will not navigate or change state; they remain disabled placeholders.

## Files to modify

- `src/components/VipBrawlApp.tsx` — add selector markup and state near the setup header.
- Potentially `src/components/ui/select.tsx` if the disabled item styling needs a small tweak (unlikely).