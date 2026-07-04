import { createFileRoute } from "@tanstack/react-router";
import { VipBrawlApp } from "@/components/VipBrawlApp";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Smash Score – VIP Brawl Scorekeeper" },
      { name: "description", content: "Track team scores for Super Smash Bros. Ultimate VIP brawls. VIP kills, match wins, first-blood bonuses — first to target points wins." },
      { property: "og:title", content: "Smash Score – VIP Brawl Scorekeeper" },
      { property: "og:description", content: "Track VIP brawl team scores round by round." },
    ],
  }),
});

function Index() {
  return (
    <>
      <VipBrawlApp />
      <Toaster position="top-center" />
    </>
  );
}
