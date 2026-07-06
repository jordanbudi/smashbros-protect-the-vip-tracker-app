## Plan

Replace the default favicon with a custom one that fits the Smash Score VIP Brawl theme.

### Step 1 — Generate a favicon image
Create a small, square brand mark (suitable for 16–32px) using `generate_image`. Theme: something that reads at tiny size for a Smash Bros VIP score tracker (e.g., a shield/crown + controller motif, or bold "S" monogram).

### Step 2 — Place it in `public/`
Save the generated image as `public/favicon.png`.

### Step 3 — Update `src/routes/__root.tsx`
Replace the existing `{ rel: "icon", href: "/favicon.ico", type: "image/x-icon" }` link with the new PNG favicon.

### Step 4 — Remove the old favicon
Delete `public/favicon.ico` so crawlers don’t pick up the stale default.
