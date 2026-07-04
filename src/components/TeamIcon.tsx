import type { SVGProps } from "react";

// 8 symbols representing the original Smash Bros 64 roster
export type IconId = "mario" | "dk" | "link" | "samus" | "yoshi" | "kirby" | "fox" | "pikachu";

export const ICON_IDS: IconId[] = ["mario", "dk", "link", "samus", "yoshi", "kirby", "fox", "pikachu"];

export const ICON_LABELS: Record<IconId, string> = {
  mario: "Mario Cap",
  dk: "DK Tie",
  link: "Hylian Shield",
  samus: "Samus Visor",
  yoshi: "Yoshi",
  kirby: "Kirby",
  fox: "Arwing",
  pikachu: "Pikachu",
};

const base = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 64 64",
} as const;

export function TeamIcon({ id, ...props }: { id: IconId } & SVGProps<SVGSVGElement>) {
  switch (id) {
    case "mario":
      // Red cap with white M emblem
      return (
        <svg {...base} {...props}>
          {/* cap dome */}
          <path
            d="M32 12c-12 0-20 8-20 17v3h40v-3c0-9-8-17-20-17z"
            fill="#e53935"
          />
          {/* brim */}
          <path
            d="M8 32h48v5c0 1-1 2-2 2H10c-1 0-2-1-2-2v-5z"
            fill="#c62828"
          />
          {/* white emblem circle */}
          <circle cx="32" cy="22" r="8" fill="#fff" />
          {/* M letter */}
          <path
            d="M27 26v-8h2l3 4 3-4h2v8h-2v-5l-2.5 3.5h-1L29 21v5z"
            fill="#e53935"
          />
        </svg>
      );
    case "dk":
      // DK necktie with "DK" letters
      return (
        <svg {...base} {...props}>
          {/* knot */}
          <path d="M22 10h20l-3 8H25z" fill="#c62828" />
          {/* tie body */}
          <path d="M25 18h14l3 30-10 8-10-8z" fill="#e53935" />
          {/* DK letters */}
          <path
            d="M28 28h3c2 0 3 1.5 3 4s-1 4-3 4h-3zm2 2v4h1c.8 0 1.2-.7 1.2-2s-.4-2-1.2-2z"
            fill="#fff59d"
          />
          <path
            d="M35 28h2v3l2.5-3H42l-3 3.5L42.5 36H40l-2.3-3.2-.7.8V36h-2z"
            fill="#fff59d"
          />
        </svg>
      );
    case "link":
      // Hylian shield with Triforce and bird crest
      return (
        <svg {...base} {...props}>
          {/* shield body */}
          <path
            d="M12 10h40v22c0 12-9 20-20 22-11-2-20-10-20-22z"
            fill="#1e88e5"
          />
          {/* inner panel */}
          <path
            d="M16 14h32v18c0 10-7 17-16 19-9-2-16-9-16-19z"
            fill="#0d47a1"
          />
          {/* top yellow band */}
          <path d="M16 14h32v4H16z" fill="#fdd835" />
          {/* Triforce */}
          <path
            d="M32 24l-6 10h12zm-3 6l-3 5h6zm6 0l-3 5h6z"
            fill="#fdd835"
          />
        </svg>
      );
    case "samus":
      // Samus helmet visor
      return (
        <svg {...base} {...props}>
          {/* helmet dome */}
          <path
            d="M32 8c-11 0-20 9-20 20v18c0 4 3 6 6 6h28c3 0 6-2 6-6V28c0-11-9-20-20-20z"
            fill="#f57c00"
          />
          {/* side panel */}
          <path
            d="M12 30v14c0 3 2 5 5 5h30c3 0 5-2 5-5V30z"
            fill="#c62828"
          />
          {/* visor */}
          <path
            d="M18 22c0-6 6-11 14-11s14 5 14 11v6c0 2-1 3-3 3H21c-2 0-3-1-3-3z"
            fill="#00e5ff"
          />
          {/* visor shine */}
          <path d="M22 20c2-3 6-5 10-5" stroke="#e0f7fa" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "yoshi":
      // Yoshi head profile
      return (
        <svg {...base} {...props}>
          {/* head */}
          <path
            d="M14 30c0-10 8-18 18-18 8 0 14 4 16 10l4-2v10l-4-2c-1 4-4 7-8 8v10c0 4-3 6-6 6h-8c-6 0-12-5-12-12z"
            fill="#66bb6a"
          />
          {/* white eye area */}
          <ellipse cx="26" cy="22" rx="6" ry="8" fill="#fff" />
          {/* pupil */}
          <circle cx="27" cy="24" r="2.5" fill="#212121" />
          {/* nose */}
          <circle cx="46" cy="30" r="3" fill="#e53935" />
          {/* red cheek shell hint */}
          <path d="M18 40c2 3 5 5 9 5v4h-3c-3 0-6-3-6-6z" fill="#e53935" />
        </svg>
      );
    case "kirby":
      // Kirby - round pink body with feet and blush
      return (
        <svg {...base} {...props}>
          {/* body */}
          <circle cx="32" cy="30" r="20" fill="#f48fb1" />
          {/* feet */}
          <ellipse cx="20" cy="50" rx="7" ry="4" fill="#c62828" />
          <ellipse cx="44" cy="50" rx="7" ry="4" fill="#c62828" />
          {/* eyes */}
          <ellipse cx="27" cy="28" rx="2" ry="4" fill="#212121" />
          <ellipse cx="37" cy="28" rx="2" ry="4" fill="#212121" />
          {/* eye shine */}
          <circle cx="27" cy="26" r="1" fill="#fff" />
          <circle cx="37" cy="26" r="1" fill="#fff" />
          {/* blush */}
          <circle cx="22" cy="34" r="2.5" fill="#ec407a" opacity="0.7" />
          <circle cx="42" cy="34" r="2.5" fill="#ec407a" opacity="0.7" />
        </svg>
      );
    case "fox":
      // Arwing - Star Fox ship
      return (
        <svg {...base} {...props}>
          {/* wings */}
          <path d="M4 40l14-6 6 8H10z" fill="#1976d2" />
          <path d="M60 40l-14-6-6 8h14z" fill="#1976d2" />
          {/* body */}
          <path d="M32 8l-10 32 10 6 10-6z" fill="#e0e0e0" />
          {/* body stripe */}
          <path d="M32 8l-6 22h12z" fill="#1976d2" />
          {/* cockpit */}
          <ellipse cx="32" cy="26" rx="3" ry="5" fill="#00e5ff" />
          {/* thrusters */}
          <rect x="26" y="46" width="4" height="6" fill="#f57c00" />
          <rect x="34" y="46" width="4" height="6" fill="#f57c00" />
        </svg>
      );
    case "pikachu":
      // Pikachu face with ears and cheeks
      return (
        <svg {...base} {...props}>
          {/* left ear */}
          <path d="M14 4l6 18-10-4z" fill="#fdd835" />
          <path d="M14 4l3 10-4-1z" fill="#212121" />
          {/* right ear */}
          <path d="M50 4l4 14-10 4z" fill="#fdd835" />
          <path d="M50 4l-3 10 4-1z" fill="#212121" />
          {/* face */}
          <circle cx="32" cy="34" r="18" fill="#fdd835" />
          {/* cheeks */}
          <circle cx="20" cy="38" r="4" fill="#e53935" />
          <circle cx="44" cy="38" r="4" fill="#e53935" />
          {/* eyes */}
          <circle cx="26" cy="30" r="2.5" fill="#212121" />
          <circle cx="38" cy="30" r="2.5" fill="#212121" />
          <circle cx="26.5" cy="29" r="0.8" fill="#fff" />
          <circle cx="38.5" cy="29" r="0.8" fill="#fff" />
          {/* nose */}
          <circle cx="32" cy="35" r="1" fill="#212121" />
          {/* mouth */}
          <path d="M28 38c1 2 3 3 4 3s3-1 4-3" stroke="#212121" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        </svg>
      );
  }
}
