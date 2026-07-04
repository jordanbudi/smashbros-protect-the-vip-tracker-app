import type { SVGProps } from "react";

// 8 polished silhouettes representing the original Smash Bros 64 roster.
// Each icon uses a consistent dark outline + inner detail for a graphic-designer feel.
export type IconId = "mario" | "dk" | "link" | "samus" | "yoshi" | "kirby" | "fox" | "pikachu";

export const ICON_IDS: IconId[] = ["mario", "dk", "link", "samus", "yoshi", "kirby", "fox", "pikachu"];

export const ICON_LABELS: Record<IconId, string> = {
  mario: "Mario",
  dk: "Donkey Kong",
  link: "Link",
  samus: "Samus",
  yoshi: "Yoshi",
  kirby: "Kirby",
  fox: "Fox",
  pikachu: "Pikachu",
};

const OUTLINE = "#0b0b12";

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 64 64",
} as const;

export function TeamIcon({ id, ...props }: { id: IconId } & SVGProps<SVGSVGElement>) {
  const stroke = { stroke: OUTLINE, strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

  switch (id) {
    case "mario":
      // Mario's iconic red cap with white M badge
      return (
        <svg {...base} {...props}>
          <defs>
            <linearGradient id="mario-cap" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f44336" />
              <stop offset="1" stopColor="#c62828" />
            </linearGradient>
          </defs>
          {/* cap dome */}
          <path d="M32 10c-13 0-22 8-22 19v3h44v-3c0-11-9-19-22-19z" fill="url(#mario-cap)" {...stroke} />
          {/* brim */}
          <path d="M6 30h52v6c0 1.5-1.2 2.5-2.6 2.5H8.6C7.2 38.5 6 37.5 6 36z" fill="#a01818" {...stroke} />
          {/* highlight */}
          <path d="M14 18c3-4 9-6 14-6" stroke="#ffb0a8" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />
          {/* white emblem */}
          <circle cx="32" cy="22" r="8.5" fill="#fff" {...stroke} />
          {/* M letter */}
          <path d="M27 27.5v-11l5 5 5-5v11h-2v-6.2l-3 3-3-3v6.2z" fill="#e53935" />
        </svg>
      );

    case "dk":
      // Donkey Kong's red tie with "DK" letters
      return (
        <svg {...base} {...props}>
          <defs>
            <linearGradient id="dk-tie" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ef5350" />
              <stop offset="1" stopColor="#b71c1c" />
            </linearGradient>
          </defs>
          {/* knot */}
          <path d="M22 8h20l-3 9H25z" fill="#a01818" {...stroke} />
          {/* tie body */}
          <path d="M25 17h14l3 30-10 9-10-9z" fill="url(#dk-tie)" {...stroke} />
          {/* highlight */}
          <path d="M27 20l-1 22" stroke="#ffb0a8" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          {/* D */}
          <path d="M27 27h4c2.6 0 4.2 2 4.2 4.8 0 2.9-1.6 4.8-4.2 4.8h-4zm2.4 2.2v5.2H31c1.3 0 2-1 2-2.6s-.7-2.6-2-2.6z" fill="#fff59d" />
          {/* K */}
          <path d="M36 27h2.4v3.6l3.2-3.6h2.8l-3.6 4 3.8 5.6h-2.9l-2.7-4-.6.6v3.4H36z" fill="#fff59d" />
        </svg>
      );

    case "link":
      // Link's Hylian shield with Triforce
      return (
        <svg {...base} {...props}>
          <defs>
            <linearGradient id="link-shield" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#1e88e5" />
              <stop offset="1" stopColor="#0d47a1" />
            </linearGradient>
          </defs>
          {/* outer shield */}
          <path d="M10 10h44v22c0 13-10 21-22 24C20 53 10 45 10 32z" fill="#c62828" {...stroke} />
          {/* inner shield */}
          <path d="M15 14h34v18c0 10-8 17-17 20-9-3-17-10-17-20z" fill="url(#link-shield)" {...stroke} />
          {/* top yellow band */}
          <path d="M15 14h34v5H15z" fill="#fdd835" {...stroke} />
          {/* crest bird */}
          <path d="M32 20l-4 2 4-1 4 1zM32 21v3" stroke={OUTLINE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
          {/* Triforce */}
          <path d="M32 26l-8 13h16zm0 3.5l-3.5 6h7z" fill="#fdd835" {...stroke} />
          <path d="M28.5 39l-3-5h6zM35.5 39l-3-5h6z" fill="#fdd835" {...stroke} />
        </svg>
      );

    case "samus":
      // Samus's Varia Suit helmet
      return (
        <svg {...base} {...props}>
          <defs>
            <linearGradient id="samus-helm" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#ffa726" />
              <stop offset="1" stopColor="#e65100" />
            </linearGradient>
            <linearGradient id="samus-visor" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#69f0ff" />
              <stop offset="1" stopColor="#00838f" />
            </linearGradient>
          </defs>
          {/* helmet dome */}
          <path d="M32 8c-12 0-20 9-20 20v14c0 5 3 8 7 8h26c4 0 7-3 7-8V28c0-11-8-20-20-20z" fill="url(#samus-helm)" {...stroke} />
          {/* fin/ridge */}
          <path d="M32 8c-3 0-6 1-6 4v8h12v-8c0-3-3-4-6-4z" fill="#c62828" {...stroke} />
          {/* jaw plate */}
          <path d="M12 34v8c0 5 3 8 7 8h26c4 0 7-3 7-8v-8z" fill="#a53a00" {...stroke} />
          {/* visor */}
          <path d="M18 22c0-6 6-11 14-11s14 5 14 11v7c0 1.5-1 2.5-2.5 2.5H20.5c-1.5 0-2.5-1-2.5-2.5z" fill="url(#samus-visor)" {...stroke} />
          {/* visor shine */}
          <path d="M21 20c2-3 6-5 10-5" stroke="#e0f7fa" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      );

    case "yoshi":
      // Yoshi's head silhouette
      return (
        <svg {...base} {...props}>
          <defs>
            <linearGradient id="yoshi-body" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#81c784" />
              <stop offset="1" stopColor="#2e7d32" />
            </linearGradient>
          </defs>
          {/* head */}
          <path d="M14 32c0-11 8-20 18-20 8 0 14 4 17 11l5-3v14l-5-3c-1 4-4 7-8 8v6c0 4-3 7-7 7h-8c-6 0-12-5-12-13z" fill="url(#yoshi-body)" {...stroke} />
          {/* red shell hint (cheek/back) */}
          <path d="M17 42c2 4 6 6 11 6v6h-4c-4 0-8-3-8-8z" fill="#e53935" {...stroke} />
          {/* white eye */}
          <ellipse cx="27" cy="22" rx="6" ry="8" fill="#fff" {...stroke} />
          {/* pupil */}
          <ellipse cx="28.5" cy="24" rx="2.2" ry="3" fill={OUTLINE} />
          {/* eye shine */}
          <circle cx="29.2" cy="22.6" r="0.9" fill="#fff" />
          {/* nose */}
          <ellipse cx="47" cy="30" rx="4" ry="3.4" fill="#e53935" {...stroke} />
          {/* nostril */}
          <circle cx="47" cy="30" r="0.7" fill={OUTLINE} />
        </svg>
      );

    case "kirby":
      // Kirby - round pink body with feet and blush
      return (
        <svg {...base} {...props}>
          <defs>
            <radialGradient id="kirby-body" cx="0.35" cy="0.35" r="0.75">
              <stop offset="0" stopColor="#fce4ec" />
              <stop offset="0.5" stopColor="#f48fb1" />
              <stop offset="1" stopColor="#ec407a" />
            </radialGradient>
          </defs>
          {/* feet (back layer) */}
          <ellipse cx="19" cy="51" rx="8" ry="4.5" fill="#c2185b" {...stroke} />
          <ellipse cx="45" cy="51" rx="8" ry="4.5" fill="#c2185b" {...stroke} />
          {/* body */}
          <circle cx="32" cy="30" r="21" fill="url(#kirby-body)" {...stroke} />
          {/* arms */}
          <ellipse cx="12" cy="35" rx="4.5" ry="6" fill="#f48fb1" {...stroke} transform="rotate(-20 12 35)" />
          <ellipse cx="52" cy="35" rx="4.5" ry="6" fill="#f48fb1" {...stroke} transform="rotate(20 52 35)" />
          {/* blush */}
          <ellipse cx="22" cy="34" rx="3" ry="1.8" fill="#ec407a" opacity="0.8" />
          <ellipse cx="42" cy="34" rx="3" ry="1.8" fill="#ec407a" opacity="0.8" />
          {/* eyes */}
          <ellipse cx="27" cy="27" rx="2.2" ry="4.5" fill={OUTLINE} />
          <ellipse cx="37" cy="27" rx="2.2" ry="4.5" fill={OUTLINE} />
          <ellipse cx="27" cy="25" rx="1" ry="1.5" fill="#fff" />
          <ellipse cx="37" cy="25" rx="1" ry="1.5" fill="#fff" />
          {/* mouth */}
          <path d="M30 34c1 1.4 3 1.4 4 0" stroke={OUTLINE} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        </svg>
      );

    case "fox":
      // Arwing - Star Fox ship
      return (
        <svg {...base} {...props}>
          <defs>
            <linearGradient id="arwing-body" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#f5f5f5" />
              <stop offset="1" stopColor="#9e9e9e" />
            </linearGradient>
            <linearGradient id="arwing-wing" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#42a5f5" />
              <stop offset="1" stopColor="#1565c0" />
            </linearGradient>
          </defs>
          {/* wings */}
          <path d="M4 42l14-8 8 10H8z" fill="url(#arwing-wing)" {...stroke} />
          <path d="M60 42l-14-8-8 10h18z" fill="url(#arwing-wing)" {...stroke} />
          {/* wing tips */}
          <path d="M6 42l3 6h4l-2-4z" fill="#0d47a1" {...stroke} />
          <path d="M58 42l-3 6h-4l2-4z" fill="#0d47a1" {...stroke} />
          {/* body */}
          <path d="M32 6l-10 36 10 8 10-8z" fill="url(#arwing-body)" {...stroke} />
          {/* stripe */}
          <path d="M32 6l-6 26h12z" fill="#1976d2" />
          {/* cockpit */}
          <ellipse cx="32" cy="24" rx="3.5" ry="6" fill="#69f0ff" {...stroke} />
          <path d="M31 20c1-1.5 2-2 3-2" stroke="#e0f7fa" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          {/* thrusters */}
          <rect x="25" y="46" width="4.5" height="6" rx="1" fill="#ff9800" {...stroke} />
          <rect x="34.5" y="46" width="4.5" height="6" rx="1" fill="#ff9800" {...stroke} />
        </svg>
      );

    case "pikachu":
      // Pikachu face with ears and cheeks
      return (
        <svg {...base} {...props}>
          <defs>
            <radialGradient id="pika-face" cx="0.5" cy="0.4" r="0.7">
              <stop offset="0" stopColor="#fff59d" />
              <stop offset="0.6" stopColor="#fdd835" />
              <stop offset="1" stopColor="#f9a825" />
            </radialGradient>
          </defs>
          {/* left ear */}
          <path d="M12 4c1-1 3-1 4 0l6 16-12-4z" fill="url(#pika-face)" {...stroke} />
          <path d="M14 4l3 11-5-2z" fill={OUTLINE} />
          {/* right ear */}
          <path d="M52 4c-1-1-3-1-4 0l-6 16 12-4z" fill="url(#pika-face)" {...stroke} />
          <path d="M50 4l-3 11 5-2z" fill={OUTLINE} />
          {/* face */}
          <circle cx="32" cy="36" r="18" fill="url(#pika-face)" {...stroke} />
          {/* cheeks */}
          <circle cx="19" cy="40" r="4.2" fill="#e53935" {...stroke} />
          <circle cx="45" cy="40" r="4.2" fill="#e53935" {...stroke} />
          {/* eyes */}
          <circle cx="26" cy="32" r="3" fill={OUTLINE} />
          <circle cx="38" cy="32" r="3" fill={OUTLINE} />
          <circle cx="26.8" cy="30.8" r="1" fill="#fff" />
          <circle cx="38.8" cy="30.8" r="1" fill="#fff" />
          {/* nose */}
          <ellipse cx="32" cy="37" rx="1.2" ry="0.9" fill={OUTLINE} />
          {/* mouth */}
          <path d="M28 40c1.5 2.5 3 3 4 3s2.5-.5 4-3" stroke={OUTLINE} strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}
