Change the winner screen card opacity from 80% to 65% so the sunburst rays and center bloom show through more clearly, while the backdrop-blur and border still keep the content readable.

### What we will change
1. In `src/components/VipBrawlApp.tsx`, find the winner screen container (currently `bg-card/80`).
2. Update the background opacity to `bg-card/65`.
3. Verify the result in the preview and check the build passes.

### Why 65%?
At 65% the card becomes noticeably glassy and the winner-color rays will be visible behind the icon, tallies, and podium. The remaining 35% solid color plus the existing `backdrop-blur` and `border-border` should preserve enough contrast for text and the team color bars to remain readable.