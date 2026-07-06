// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// When building for GitHub Pages, set BASE_PATH=/<repo-name>/ in the workflow.
// Inside Lovable sandbox/preview, BASE_PATH is unset and everything stays as-is.
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  vite: {
    base: basePath,
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Nitro overrides only apply outside the Lovable sandbox build (see config types).
  // In GitHub Actions we prerender to a static site suitable for GitHub Pages.
  nitro: {
    preset: "github_pages",
  },
});
