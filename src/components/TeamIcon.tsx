import type { SVGProps } from "react";

// 8 symbols representing the original Smash Bros 64 roster
export type IconId = "mario" | "dk" | "link" | "samus" | "yoshi" | "kirby" | "fox" | "pikachu";

export const ICON_IDS: IconId[] = ["mario", "dk", "link", "samus", "yoshi", "kirby", "fox", "pikachu"];

export const ICON_LABELS: Record<IconId, string> = {
  mario: "Plumber Cap",
  dk: "Banana",
  link: "Triforce",
  samus: "Screw Attack",
  yoshi: "Egg",
  kirby: "Star",
  fox: "Star Wing",
  pikachu: "Lightning",
};

const base = { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 64 64", fill: "currentColor" } as const;

export function TeamIcon({ id, ...props }: { id: IconId } & SVGProps<SVGSVGElement>) {
  switch (id) {
    case "mario":
      // Cap silhouette
      return (
        <svg {...base} {...props}>
          <path d="M32 10c-11 0-19 7-19 15v6h4l1-4h28l1 4h4v-6c0-8-8-15-19-15zm0 8a5 5 0 015 5 5 5 0 01-10 0 5 5 0 015-5z" />
        </svg>
      );
    case "dk":
      // Banana / tie
      return (
        <svg {...base} {...props}>
          <path d="M14 18c2 20 20 34 36 30 3-1 3-4 0-4-14 2-28-12-30-28 0-3-6-1-6 2z" />
        </svg>
      );
    case "link":
      // Triforce
      return (
        <svg {...base} {...props}>
          <path d="M32 8L14 40h36L32 8zm0 12l8 14H24l8-14zM12 44l8 12h24l8-12H12z" />
        </svg>
      );
    case "samus":
      // Screw attack (radial spikes + core)
      return (
        <svg {...base} {...props}>
          <path d="M32 4l4 10 10-6-2 12 12 2-10 6 6 10-12-2-2 12-6-10-10 6 2-12-12-2 10-6-6-10 12 2 4-12z" />
          <circle cx="32" cy="32" r="6" fill="var(--background)" />
        </svg>
      );
    case "yoshi":
      // Egg with spots
      return (
        <svg {...base} {...props}>
          <ellipse cx="32" cy="34" rx="20" ry="24" />
          <circle cx="24" cy="22" r="3" fill="var(--background)" />
          <circle cx="38" cy="30" r="4" fill="var(--background)" />
          <circle cx="26" cy="44" r="4" fill="var(--background)" />
          <circle cx="42" cy="48" r="3" fill="var(--background)" />
        </svg>
      );
    case "kirby":
      // Star
      return (
        <svg {...base} {...props}>
          <path d="M32 4l7 20h21l-17 12 6 20-17-12-17 12 6-20L4 24h21z" />
        </svg>
      );
    case "fox":
      // Arwing / arrow wing
      return (
        <svg {...base} {...props}>
          <path d="M6 46L32 8l26 38-14-4-6 10-6-10-6 10-6-10-14 4z" />
        </svg>
      );
    case "pikachu":
      // Lightning bolt
      return (
        <svg {...base} {...props}>
          <path d="M36 4L12 36h14l-6 24 26-34H30l6-22z" />
        </svg>
      );
  }
}
