import { useEffect, useMemo, useRef, useState, forwardRef, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas-pro";
import { Crown, Skull, Swords, Share2, RotateCcw, Settings2, Plus, Minus, ChevronLeft, Zap, Trophy, Undo2, Redo2, X, Flame } from "lucide-react";
import { TeamIcon, ICON_IDS, type IconId } from "@/components/TeamIcon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export type TeamColor = "red" | "blue" | "green" | "purple" | "orange" | "pink" | "teal" | "gold";

interface ColorTokens { base: string; glow: string; deep: string; label: string }

const TEAM_COLORS: Record<TeamColor, ColorTokens> = {
  red:    { base: "oklch(0.65 0.24 25)",  glow: "oklch(0.75 0.24 30)",  deep: "oklch(0.42 0.20 25)",  label: "Red" },
  blue:   { base: "oklch(0.62 0.22 245)", glow: "oklch(0.72 0.20 240)", deep: "oklch(0.38 0.18 250)", label: "Blue" },
  green:  { base: "oklch(0.68 0.18 145)", glow: "oklch(0.78 0.18 145)", deep: "oklch(0.44 0.16 148)", label: "Green" },
  purple: { base: "oklch(0.60 0.22 305)", glow: "oklch(0.72 0.22 305)", deep: "oklch(0.38 0.20 305)", label: "Purple" },
  orange: { base: "oklch(0.72 0.19 55)",  glow: "oklch(0.82 0.19 60)",  deep: "oklch(0.50 0.18 45)",  label: "Orange" },
  pink:   { base: "oklch(0.72 0.20 350)", glow: "oklch(0.82 0.18 350)", deep: "oklch(0.48 0.19 350)", label: "Pink" },
  teal:   { base: "oklch(0.68 0.14 195)", glow: "oklch(0.78 0.15 195)", deep: "oklch(0.42 0.12 200)", label: "Teal" },
  gold:   { base: "oklch(0.82 0.17 90)",  glow: "oklch(0.90 0.18 95)",  deep: "oklch(0.55 0.16 80)",  label: "Gold" },
};

export const TEAM_COLOR_IDS = Object.keys(TEAM_COLORS) as TeamColor[];

function teamGradientStyle(color: TeamColor): CSSProperties {
  const c = TEAM_COLORS[color];
  return {
    backgroundImage: `linear-gradient(135deg, ${c.glow}, ${c.base})`,
    boxShadow: `0 10px 40px -10px ${c.glow}, inset 0 0 0 1px oklch(1 0 0 / 0.10)`,
  };
}
function teamSolidStyle(color: TeamColor): CSSProperties {
  return { background: TEAM_COLORS[color].base };
}
function teamTextColor(color: TeamColor): string {
  return TEAM_COLORS[color].glow;
}

interface Team {
  id: string;
  name: string;
  icon: IconId;
  color: TeamColor;
}

type TeamCount = 2 | 3 | 4;

interface Settings {
  vipKillPoints: number;
  matchWinPoints: number;
  firstVipBonusPoints: number;
  targetScore: number;
  firstVipMode: boolean;
  teamCount: TeamCount;
}

interface RoundEntry {
  round: number;
  matchWinnerId: string;
  vipKillerIds: string[];      // teams that killed a VIP this round
  firstVipKillerId: string | null;
  deltas: Record<string, number>;
}

const DEFAULTS: Settings = {
  vipKillPoints: 2,
  matchWinPoints: 4,
  firstVipBonusPoints: 1,
  targetScore: 15,
  firstVipMode: true,
  teamCount: 2,
};

const DEFAULT_TEAM_SLOTS: Team[] = [
  { id: "t1", name: "Red Team",    icon: "mario",  color: "red" },
  { id: "t2", name: "Blue Team",   icon: "link",   color: "blue" },
  { id: "t3", name: "Green Team",  icon: "yoshi",  color: "green" },
  { id: "t4", name: "Purple Team", icon: "kirby",  color: "purple" },
];

const STORAGE_KEY_TEAMS = "vb.teams.v2";
const STORAGE_KEY_SETTINGS = "vb.settings";

function loadTeams(): Team[] {
  if (typeof window === "undefined") return DEFAULT_TEAM_SLOTS.slice(0, 4);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEAMS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        // Fill up to 4 with defaults if fewer were saved
        const out = [...parsed];
        for (let i = out.length; i < 4; i++) out.push(DEFAULT_TEAM_SLOTS[i]);
        return out.slice(0, 4);
      }
    }
    // Legacy migration from vb.teams (A/B object)
    const legacyRaw = localStorage.getItem("vb.teams");
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (legacy && typeof legacy === "object" && "A" in legacy && "B" in legacy) {
        const migrated: Team[] = [
          { id: "t1", ...legacy.A },
          { id: "t2", ...legacy.B },
          DEFAULT_TEAM_SLOTS[2],
          DEFAULT_TEAM_SLOTS[3],
        ];
        return migrated;
      }
    }
  } catch {
    // fall through
  }
  return DEFAULT_TEAM_SLOTS.slice(0, 4);
}

function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const merged = { ...DEFAULTS, ...parsed };
      if (![2, 3, 4].includes(merged.teamCount)) merged.teamCount = 2;
      return merged;
    }
  } catch {
    // fall through
  }
  return DEFAULTS;
}

export function VipBrawlApp() {
  const [phase, setPhase] = useState<"setup" | "playing" | "winner">("setup");
  const [gameMode, setGameMode] = useState("vip-brawl");
  const [allTeams, setAllTeams] = useState<Team[]>(() => loadTeams());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [scores, setScores] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<RoundEntry[]>([]);
  const [redoStack, setRedoStack] = useState<RoundEntry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingAnim, setPendingAnim] = useState<null | RoundAnimInfo>(null);
  const [winnerPending, setWinnerPending] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundEntry | null>(null);
  const [suddenDeath, setSuddenDeath] = useState(false);

  const activeTeams = useMemo(() => allTeams.slice(0, settings.teamCount), [allTeams, settings.teamCount]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(allTeams)); }, [allTeams]);
  useEffect(() => { localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings)); }, [settings]);

  const scoreRef = useRef<HTMLDivElement | null>(null);

  function resetGame(keepTeams = true) {
    const fresh: Record<string, number> = {};
    activeTeams.forEach((t) => (fresh[t.id] = 0));
    setScores(fresh);
    setHistory([]); setRedoStack([]);
    setSuddenDeath(false);
    setPhase(keepTeams ? "playing" : "setup");
  }

  function submitRound(input: {
    matchWinnerId: string;
    vipKillerIds: string[];
    firstVipKillerId: string | null;
  }) {
    const { matchWinnerId, vipKillerIds, firstVipKillerId } = input;
    const deltas: Record<string, number> = {};
    activeTeams.forEach((t) => (deltas[t.id] = 0));
    vipKillerIds.forEach((id) => { deltas[id] = (deltas[id] || 0) + settings.vipKillPoints; });
    deltas[matchWinnerId] = (deltas[matchWinnerId] || 0) + settings.matchWinPoints;
    if (settings.firstVipMode && firstVipKillerId) {
      deltas[firstVipKillerId] = (deltas[firstVipKillerId] || 0) + settings.firstVipBonusPoints;
    }

    const newScores: Record<string, number> = { ...scores };
    activeTeams.forEach((t) => { newScores[t.id] = (newScores[t.id] || 0) + (deltas[t.id] || 0); });

    const entry: RoundEntry = {
      round: history.length + 1,
      matchWinnerId,
      vipKillerIds,
      firstVipKillerId,
      deltas,
    };
    setHistory((h) => [...h, entry]);
    setRedoStack([]);
    setScores(newScores);

    setPendingAnim(buildAnimInfo(entry, activeTeams, settings));

    // End-of-round evaluation
    const target = settings.targetScore;
    const sorted = [...activeTeams]
      .map((t) => ({ id: t.id, score: newScores[t.id] || 0 }))
      .sort((a, b) => b.score - a.score);
    const top = sorted[0];
    const second = sorted[1];
    if (top.score >= target && top.score > (second?.score ?? -Infinity)) {
      setWinnerPending(true);
      setSuddenDeath(false);
    } else if (top.score >= target && second && top.score === second.score) {
      // Tie at or above target → sudden death
      setSuddenDeath(true);
    } else {
      setSuddenDeath(false);
    }
  }

  function undo() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, last]);
    setScores((s) => {
      const next = { ...s };
      activeTeams.forEach((t) => { next[t.id] = (next[t.id] || 0) - (last.deltas[t.id] || 0); });
      return next;
    });
    setPendingAnim(null);
    setSuddenDeath(false);
    toast("Round undone", { description: `R${last.round} rolled back` });
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, next]);
    setScores((s) => {
      const nx = { ...s };
      activeTeams.forEach((t) => { nx[t.id] = (nx[t.id] || 0) + (next.deltas[t.id] || 0); });
      return nx;
    });
    toast("Round restored", { description: `R${next.round} back in play` });
  }

  async function shareResult() {
    if (!scoreRef.current) return;
    const APP_URL = "https://jordanbudi.github.io/smashbros-protect-the-vip-tracker-app";
    const shareTitle = "Results of Protect the VIP!";
    const shareText = `Results of Protect the VIP! ${APP_URL}`;
    try {
      const canvas = await html2canvas(scoreRef.current, {
        backgroundColor: "#0b0f1e",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Failed to render image");
      const file = new File([blob], "vip-brawl-result.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: shareTitle, text: shareText, url: APP_URL });
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }
      if (nav.share) {
        try {
          await nav.share({ title: shareTitle, text: shareText, url: APP_URL });
          return;
        } catch (err) {
          if ((err as Error)?.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "vip-brawl-result.png"; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Saved screenshot");
    } catch (e) {
      const err = e as Error;
      if (err?.name === "AbortError") return;
      toast.error("Couldn't share — try again");
      console.error(e);
    }
  }

  // Compute winner (highest score); only meaningful when phase === "winner"
  const winnerId: string | null = useMemo(() => {
    if (phase !== "winner") return null;
    const sorted = [...activeTeams].map((t) => ({ id: t.id, s: scores[t.id] || 0 })).sort((a, b) => b.s - a.s);
    return sorted[0]?.id ?? null;
  }, [phase, scores, activeTeams]);

  function updateTeamAt(index: number, updated: Team) {
    setAllTeams((prev) => {
      const next = [...prev];
      // Color-swap: if updated.color is used by another active slot, swap
      const oldColor = next[index].color;
      if (updated.color !== oldColor) {
        for (let i = 0; i < settings.teamCount; i++) {
          if (i !== index && next[i].color === updated.color) {
            next[i] = { ...next[i], color: oldColor };
            break;
          }
        }
      }
      next[index] = updated;
      return next;
    });
  }

  const bgColorA = activeTeams[0]?.color ?? "red";
  const bgColorB = activeTeams[activeTeams.length - 1]?.color ?? "blue";

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30" style={teamGradientStyle(bgColorA)} />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full blur-3xl opacity-30" style={teamGradientStyle(bgColorB)} />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col">
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <SetupScreen
                allTeams={allTeams}
                activeTeams={activeTeams}
                updateTeamAt={updateTeamAt}
                settings={settings}
                setSettings={setSettings}
                gameMode={gameMode}
                setGameMode={setGameMode}
                onStart={() => { resetGame(true); setPhase("playing"); }}
              />
            </motion.div>
          )}
          {phase === "playing" && (
            <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlayScreen
                teams={activeTeams}
                settings={settings}
                scores={scores}
                history={history}
                suddenDeath={suddenDeath}
                canUndo={history.length > 0}
                canRedo={redoStack.length > 0}
                onUndo={undo}
                onRedo={redo}
                onBack={() => setPhase("setup")}
                onOpenSettings={() => setShowSettings(true)}
                onSubmitRound={submitRound}
                onRoundClick={(r) => setSelectedRound(r)}
              />
            </motion.div>
          )}
          {phase === "winner" && winnerId && (
            <motion.div key="win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WinnerScreen
                ref={scoreRef}
                teams={activeTeams}
                winnerId={winnerId}
                scores={scores}
                history={history}
                onShare={shareResult}
                onRematch={() => resetGame(true)}
                onNewSetup={() => resetGame(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {pendingAnim && (
          <RoundResultOverlay
            key="anim"
            teams={activeTeams}
            info={pendingAnim}
            onDone={() => {
              setPendingAnim(null);
              if (winnerPending) {
                setWinnerPending(false);
                setTimeout(() => setPhase("winner"), 250);
              }
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedRound && (
          <RoundDetailModal
            round={selectedRound}
            teams={activeTeams}
            settings={settings}
            onClose={() => setSelectedRound(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsSheet
            settings={settings}
            setSettings={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BuyMeCoffeeButton() {
  return (
    <div className="flex justify-center">
      <a
        href="https://www.buymeacoffee.com/jordanbudi"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-lg border border-black bg-[#FFDD00] px-5 py-2.5 text-black shadow-md transition-transform hover:scale-105"
        style={{ fontFamily: "Cookie, cursive", fontSize: "22px", lineHeight: 1 }}
        aria-label="Buy me a coffee"
      >
        <span aria-hidden="true" style={{ fontSize: "20px" }}>☕</span>
        <span>Buy me a coffee?</span>
      </a>
    </div>
  );
}

/* ---------------- Setup ---------------- */

function SetupScreen({
  allTeams, activeTeams, updateTeamAt, settings, setSettings, gameMode, setGameMode, onStart,
}: {
  allTeams: Team[];
  activeTeams: Team[];
  updateTeamAt: (index: number, t: Team) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  gameMode: string;
  setGameMode: (v: string) => void;
  onStart: () => void;
}) {
  const teamCount = settings.teamCount;
  const titleColorA = activeTeams[0]?.color ?? "red";
  const titleColorB = activeTeams[activeTeams.length - 1]?.color ?? "blue";

  const gridCols =
    teamCount === 2 ? "grid-cols-2" :
    teamCount === 3 ? "grid-cols-2 sm:grid-cols-3" :
    "grid-cols-2";

  return (
    <div className="flex flex-col gap-6 p-5 pb-24">
      <header className="pt-6 text-center">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Select Game Mode Tool:</span>
          <Select value={gameMode} onValueChange={setGameMode}>
            <SelectTrigger className="w-full max-w-[320px] border-border bg-card text-foreground sm:w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vip-brawl">Protect the V.I.P. ScoreKeeper</SelectItem>
              <SelectItem value="around-the-world" disabled>Roster Rush (coming soon)</SelectItem>
              <SelectItem value="king-of-the-character" disabled>The Clone Wars (coming soon)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <h1 className="mt-3 font-display text-4xl leading-none text-stroke-black sm:text-5xl">
          <span style={{ color: teamTextColor(titleColorA) }}>PROTECT THE</span>{" "}
          <span style={{ color: teamTextColor(titleColorB) }}>V.I.P.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Each Team has One VIP that is set to 300% damage. Earn points for knocking out the opponents VIP, and/or knocking out their VIP before your team&apos;s VIP. First to <span className="text-yellow-400 text-[1.05em] font-semibold">{settings.targetScore}</span> points win.</p>
      </header>

      {/* Team count selector */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Teams:</span>
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          {([2, 3, 4] as TeamCount[]).map((n) => (
            <button
              key={n}
              onClick={() => setSettings({ ...settings, teamCount: n })}
              className={cn(
                "px-4 py-1 rounded-full text-sm font-display tracking-widest transition",
                settings.teamCount === n ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid gap-3", gridCols)}>
        {activeTeams.map((team, i) => {
          const otherColors = activeTeams.filter((_, j) => j !== i).map((t) => t.color);
          return (
            <TeamCard
              key={team.id}
              slotIndex={i}
              team={team}
              otherColors={otherColors}
              onChange={(t) => updateTeamAt(i, t)}
            />
          );
        })}
      </div>

      {teamCount === 2 && (
        <div className="-my-3 flex items-center justify-center">
          <div className="rounded-full border border-border bg-card px-4 py-1 font-display text-sm tracking-widest text-muted-foreground">VS</div>
        </div>
      )}
      {teamCount > 2 && (
        <div className="-my-3 flex items-center justify-center">
          <div className="rounded-full border border-border bg-card px-4 py-1 font-display text-sm tracking-widest text-muted-foreground">FREE-FOR-ALL</div>
        </div>
      )}

      <section className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="flex items-center gap-2 pb-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm tracking-widest text-muted-foreground">RULES</h2>
        </div>
        <div className="grid gap-3">
          <NumberRow label="Points for winning the match" value={settings.matchWinPoints} min={0} max={30}
            onChange={(v) => setSettings({ ...settings, matchWinPoints: v })} />
          <NumberRow label="Points for killing a VIP" value={settings.vipKillPoints} min={0} max={20}
            onChange={(v) => setSettings({ ...settings, vipKillPoints: v })} />
          <label className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div>
              <div className="text-sm font-medium">First VIP down bonus</div>
              <div className="text-xs text-muted-foreground">Reward whoever kills a VIP first.</div>
            </div>
            <Switch checked={settings.firstVipMode} onCheckedChange={(v) => setSettings({ ...settings, firstVipMode: v })} />
          </label>
          <NumberRow label="First VIP kill bonus" value={settings.firstVipBonusPoints} min={0} max={10}
            onChange={(v) => setSettings({ ...settings, firstVipBonusPoints: v })} disabled={!settings.firstVipMode} />
          <NumberRow label="Points to win game" value={settings.targetScore} min={3} max={99}
            onChange={(v) => setSettings({ ...settings, targetScore: v })} />
        </div>
      </section>

      <Button
        onClick={onStart}
        className="h-14 rounded-2xl font-display text-lg tracking-widest text-primary-foreground hover:brightness-110"
        style={teamGradientStyle("gold")}
      >
        <Swords className="mr-2 h-5 w-5" /> START MATCH
      </Button>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-muted-foreground leading-snug max-w-[260px]">
          If you found this useful and want to keep this tool ad free, please consider supporting 😁
        </p>
        <BuyMeCoffeeButton />
      </div>
    </div>
  );
}

function TeamCard({ slotIndex, team, otherColors, onChange }: { slotIndex: number; team: Team; otherColors: TeamColor[]; onChange: (t: Team) => void }) {
  const otherColorSet = new Set(otherColors);
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl border border-border p-4"
      style={teamGradientStyle(team.color)}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex flex-col items-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Team {slotIndex + 1}</div>
        <div className="mt-2 flex h-24 w-24 items-center justify-center rounded-2xl bg-black/25 text-white">
          <TeamIcon id={team.icon} className="h-16 w-16" style={{ display: "block" }} />
        </div>
        <div className="mt-3 mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Name Your Team</div>
        <Input
          value={team.name}
          onChange={(e) => onChange({ ...team, name: e.target.value })}
          className="h-10 w-full rounded-xl border border-white/20 bg-white/10 text-center font-normal text-white/90 placeholder:font-normal placeholder:text-white/40 backdrop-blur-sm focus-visible:border-white/40 focus-visible:ring-white/40"
          placeholder={DEFAULT_TEAM_SLOTS[slotIndex]?.name ?? `Team ${slotIndex + 1}`}
          maxLength={20}
        />
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Team Icon</div>
        <div className="grid grid-cols-4 gap-1.5">
          {ICON_IDS.map((id) => (
            <button
              key={id}
              onClick={() => onChange({ ...team, icon: id })}
              className={cn(
                "flex h-10 w-full items-center justify-center rounded-lg text-white transition",
                team.icon === id ? "bg-white/30 ring-2 ring-white" : "bg-black/25 hover:bg-black/40",
              )}
              aria-label={id}
            >
              <TeamIcon id={id} className="h-7 w-7" style={{ display: "block" }} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Team Color</div>
        <div className="grid grid-cols-4 gap-1.5">
          {TEAM_COLOR_IDS.map((c) => {
            const taken = otherColorSet.has(c);
            return (
              <button
                key={c}
                onClick={() => onChange({ ...team, color: c })}
                className={cn(
                  "h-8 w-full rounded-lg border transition",
                  team.color === c ? "border-white ring-2 ring-white/80 scale-105" : "border-black/30 hover:brightness-110",
                  taken && team.color !== c && "opacity-40",
                )}
                style={teamSolidStyle(c)}
                aria-label={taken ? `${TEAM_COLORS[c].label} (will swap)` : TEAM_COLORS[c].label}
                title={taken ? `${TEAM_COLORS[c].label} — tap to swap with the other team` : TEAM_COLORS[c].label}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NumberRow({ label, value, onChange, min = 0, max = 99, disabled }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2", disabled && "opacity-50")}>
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled}
          className="grid h-8 w-8 place-items-center rounded-lg bg-background/80 text-foreground hover:bg-background disabled:opacity-40"
        ><Minus className="h-4 w-4" /></button>
        <div className="w-10 text-center font-display text-lg tabular-nums">{value}</div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled}
          className="grid h-8 w-8 place-items-center rounded-lg bg-background/80 text-foreground hover:bg-background disabled:opacity-40"
        ><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

/* ---------------- Play ---------------- */

function PlayScreen({
  teams, settings, scores, history, suddenDeath, canUndo, canRedo, onUndo, onRedo, onBack, onOpenSettings, onSubmitRound, onRoundClick,
}: {
  teams: Team[];
  settings: Settings;
  scores: Record<string, number>;
  history: RoundEntry[];
  suddenDeath: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  onSubmitRound: (i: { matchWinnerId: string; vipKillerIds: string[]; firstVipKillerId: string | null }) => void;
  onRoundClick: (r: RoundEntry) => void;
}) {
  const [vipKillerIds, setVipKillerIds] = useState<string[]>([]);
  const [firstVipKillerId, setFirstVipKillerId] = useState<string | null>(null);
  const [matchWinnerId, setMatchWinnerId] = useState<string | null>(null);

  // Auto-manage first VIP killer based on selection
  useEffect(() => {
    if (!settings.firstVipMode) { setFirstVipKillerId(null); return; }
    if (vipKillerIds.length === 0) { setFirstVipKillerId(null); return; }
    if (vipKillerIds.length === 1) { setFirstVipKillerId(vipKillerIds[0]); return; }
    if (firstVipKillerId && !vipKillerIds.includes(firstVipKillerId)) setFirstVipKillerId(null);
  }, [vipKillerIds, settings.firstVipMode, firstVipKillerId]);

  // Match winner must be a team that killed a VIP this round
  useEffect(() => {
    if (matchWinnerId && !vipKillerIds.includes(matchWinnerId)) setMatchWinnerId(null);
  }, [vipKillerIds, matchWinnerId]);

  const needsFirstVipPick = settings.firstVipMode && vipKillerIds.length >= 2;
  const canSubmit = matchWinnerId !== null && (!needsFirstVipPick || firstVipKillerId !== null);

  function toggleKiller(id: string) {
    setVipKillerIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function submit() {
    if (!matchWinnerId) return;
    onSubmitRound({
      matchWinnerId,
      vipKillerIds,
      firstVipKillerId: settings.firstVipMode ? firstVipKillerId : null,
    });
    setVipKillerIds([]); setFirstVipKillerId(null); setMatchWinnerId(null);
  }

  const progress = (v: number) => Math.min(100, (v / settings.targetScore) * 100);

  const scoreGridCols =
    teams.length === 2 ? "grid-cols-2" :
    teams.length === 3 ? "grid-cols-3" :
    "grid-cols-2";

  return (
    <div className="flex flex-col gap-4 p-4 pb-28">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
          <ChevronLeft className="h-4 w-4" /> Setup
        </Button>
        <div className="font-display text-xs tracking-widest text-muted-foreground">ROUND {history.length + 1}</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onUndo} disabled={!canUndo} className="text-muted-foreground" title="Undo round">
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRedo} disabled={!canRedo} className="text-muted-foreground" title="Redo round">
            <Redo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenSettings} className="text-muted-foreground">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {suddenDeath && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-yellow-400/50 bg-yellow-400/10 px-3 py-2 text-yellow-300">
          <Flame className="h-4 w-4" />
          <span className="font-display text-sm tracking-widest">SUDDEN DEATH — tied at the target, play on!</span>
        </div>
      )}

      {/* Scoreboard */}
      <div className={cn("grid gap-3", scoreGridCols)}>
        {teams.map((t) => {
          const score = scores[t.id] || 0;
          return (
            <div key={t.id} className="relative overflow-hidden rounded-2xl border border-border p-3" style={teamGradientStyle(t.color)}>
              <div className="flex items-start gap-2 text-white min-w-0">
                <TeamIcon id={t.icon} className="h-6 w-6 shrink-0" />
                <div className="min-w-0 flex-1 text-xs sm:text-sm font-bold uppercase tracking-wider break-words leading-tight">{t.name}</div>
              </div>
              <motion.div
                key={score}
                initial={{ scale: 1.4, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn("mt-1 font-display tabular-nums leading-none text-white text-stroke-black",
                  teams.length >= 3 ? "text-4xl" : "text-6xl")}
              >
                {score}
              </motion.div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/30">
                <div className="h-full bg-white/90 transition-[width] duration-500" style={{ width: `${progress(score)}%` }} />
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-widest text-white/70">to {settings.targetScore}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <h3 className="font-display text-sm tracking-widest text-muted-foreground">LOG THIS ROUND</h3>

        <div className="mt-3">
          <Label>VIP kills <span className="text-muted-foreground/70 normal-case tracking-normal">— tap every team that killed a VIP</span></Label>
          <div className={cn("mt-1 grid gap-2", teams.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
            {teams.map((t) => (
              <IconToggleTile
                key={t.id}
                active={vipKillerIds.includes(t.id)}
                color={t.color}
                onClick={() => toggleKiller(t.id)}
                icon={<TeamIcon id={t.icon} className="h-8 w-8" />}
                badge={<Skull className="h-3.5 w-3.5" />}
                label={t.name}
                sub={`+${settings.vipKillPoints}`}
              />
            ))}
          </div>
        </div>

        {needsFirstVipPick && (
          <div className="mt-4">
            <Label>Who killed the first VIP?</Label>
            <div className={cn("mt-1 grid gap-2", vipKillerIds.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {teams.filter((t) => vipKillerIds.includes(t.id)).map((t) => (
                <IconToggleTile
                  key={t.id}
                  active={firstVipKillerId === t.id}
                  color={t.color}
                  onClick={() => setFirstVipKillerId(t.id)}
                  icon={<TeamIcon id={t.icon} className="h-8 w-8" />}
                  badge={<Zap className="h-3.5 w-3.5" />}
                  label={t.name}
                  sub={`+${settings.firstVipBonusPoints} first blood`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-4">
          <Label>Match winner</Label>
          <div className={cn("mt-1 grid gap-2", teams.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
            {teams.map((t) => {
              const eligible = vipKillerIds.includes(t.id);
              return (
                <IconToggleTile
                  key={t.id}
                  active={matchWinnerId === t.id}
                  color={t.color}
                  onClick={() => eligible && setMatchWinnerId(t.id)}
                  icon={<TeamIcon id={t.icon} className="h-8 w-8" />}
                  badge={<Crown className="h-3.5 w-3.5" />}
                  label={t.name}
                  sub={eligible ? `+${settings.matchWinPoints}` : "must kill a VIP"}
                  disabled={!eligible}
                />
              );
            })}
          </div>
        </div>

        <Button
          disabled={!canSubmit}
          onClick={submit}
          className="mt-5 h-12 w-full rounded-xl font-display tracking-widest text-primary-foreground hover:brightness-110"
          style={teamGradientStyle("gold")}
        >
          LOCK IN ROUND
        </Button>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/70 p-4">
          <h3 className="font-display text-sm tracking-widest text-muted-foreground">HISTORY</h3>
          <ul className="mt-2 divide-y divide-border/50">
            {history.slice().reverse().map((r) => {
              const winner = teams.find((t) => t.id === r.matchWinnerId);
              return (
                <li key={r.round}>
                  <button
                    onClick={() => onRoundClick(r)}
                    className="flex w-full items-center justify-between py-2 text-sm text-left hover:bg-muted/30 rounded-md px-1 -mx-1 transition"
                  >
                    <span className="text-muted-foreground">R{r.round}</span>
                    <span className="flex-1 truncate px-2">
                      {winner?.name ?? "Team"} won
                      {r.vipKillerIds.length > 0 && ` · ${r.vipKillerIds.length} VIP kill${r.vipKillerIds.length === 1 ? "" : "s"}`}
                    </span>
                    <span className="font-display tabular-nums whitespace-nowrap">
                      {teams.map((t, i) => (
                        <span key={t.id}>
                          {i > 0 && <span className="text-muted-foreground">/</span>}
                          <span style={{ color: teamTextColor(t.color) }}>+{r.deltas[t.id] || 0}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{children}</div>;
}

function IconToggleTile({ active, color, onClick, icon, badge, label, sub, disabled }: {
  active: boolean; color: TeamColor; onClick: () => void; icon: React.ReactNode; badge?: React.ReactNode; label: string; sub: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={active ? teamGradientStyle(color) : undefined}
      className={cn(
        "relative flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition overflow-hidden w-full",
        active ? "border-transparent text-white" : "border-border bg-muted/40 text-foreground hover:bg-muted",
        disabled && "opacity-40",
      )}
    >
      <div className="flex items-center justify-center">
        <span className={cn("shrink-0 grid place-items-center", active ? "text-white" : "text-foreground")}>{icon}</span>
      </div>
      {badge && (
        <span className={cn("absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full",
          active ? "bg-black/40 text-white" : "bg-background text-muted-foreground border border-border")}>
          {badge}
        </span>
      )}
      <div className="mt-0.5 text-[11px] font-bold uppercase tracking-wider leading-tight [overflow-wrap:anywhere] w-full">{label}</div>
      <div className={cn("font-display text-xs tabular-nums", active ? "text-white/90" : "text-muted-foreground")}>{sub}</div>
    </button>
  );
}

/* ---------------- Round result overlay ---------------- */

type RoundTier = "flawless" | "martyred" | "winIsWin" | "clean" | "grind" | "ffa";

interface RoundAnimInfo {
  winnerId: string;
  tier: RoundTier;
  firstBlood: boolean;
  deltas: Record<string, number>;
  // Only for N=2 narrative
  loserId?: string;
}

function buildAnimInfo(entry: RoundEntry, teams: Team[], _settings: Settings): RoundAnimInfo {
  const winnerId = entry.matchWinnerId;
  const firstBlood = entry.firstVipKillerId === winnerId;

  if (teams.length === 2) {
    const loser = teams.find((t) => t.id !== winnerId);
    const loserId = loser?.id ?? "";
    const winnerKilledLoserVip = entry.vipKillerIds.includes(winnerId);
    const winnerVipDied = entry.vipKillerIds.includes(loserId);

    let tier: RoundTier;
    if (winnerKilledLoserVip && firstBlood && !winnerVipDied) tier = "flawless";
    else if (winnerKilledLoserVip && firstBlood && winnerVipDied) tier = "martyred";
    else if (entry.firstVipKillerId === loserId) tier = "winIsWin";
    else if (winnerKilledLoserVip && !winnerVipDied) tier = "clean";
    else tier = "grind";

    return { winnerId, loserId, tier, firstBlood, deltas: entry.deltas };
  }
  return { winnerId, tier: "ffa", firstBlood, deltas: entry.deltas };
}

function RoundResultOverlay({ teams, info, onDone }: {
  teams: Team[];
  info: RoundAnimInfo;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [onDone]);

  const winner = teams.find((t) => t.id === info.winnerId)!;
  const loser = info.loserId ? teams.find((t) => t.id === info.loserId) : undefined;

  const headlineMap: Record<RoundTier, string> = {
    flawless: "FLAWLESS EXTRACTION",
    martyred: "MARTYRED VICTORY",
    winIsWin: "A WIN IS A WIN",
    clean: "CLEAN WIN",
    grind: "GRIND WIN",
    ffa: "ROUND WON",
  };
  const subMap: Record<RoundTier, string> = {
    flawless: `${winner.name} wins, killed ${loser?.name ?? "the"} VIP first, ${winner.name} VIP survives.`,
    martyred: `${winner.name} wins, killed ${loser?.name ?? "the"} VIP first, but ${winner.name} VIP does not make it out alive.`,
    winIsWin: `${winner.name} VIP dies first, but ${winner.name} still wins.`,
    clean: `${winner.name} takes the match and their VIP walks away.`,
    grind: `${winner.name} grinds out the win on match points alone.`,
    ffa: `${winner.name} takes the round.`,
  };

  const sparks = info.tier === "flawless" || info.tier === "martyred";
  const shake = info.tier === "grind" || info.tier === "winIsWin";
  const deltaWinner = info.deltas[winner.id] || 0;

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {sparks && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full"
              style={{
                left: `${50 + (Math.random() - 0.5) * 40}%`,
                top: `${50 + (Math.random() - 0.5) * 20}%`,
                background: `hsl(${Math.random() * 360}, 90%, 65%)`,
                animation: `float-up ${0.9 + Math.random() * 0.9}s ${Math.random() * 0.3}s ease-out forwards`,
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        style={teamGradientStyle(winner.color)}
        className={cn("relative w-full max-w-md rounded-3xl px-8 py-8 text-center text-white shadow-2xl", shake && "animate-shake")}
      >
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
          <TeamIcon id={winner.icon} className="h-3.5 w-3.5" /> {winner.name}
        </div>
        <div className="font-display text-3xl leading-tight text-stroke-black sm:text-4xl">{headlineMap[info.tier]}</div>
        <div className="mt-3 text-sm text-white/90">{subMap[info.tier]}</div>

        <div className="mt-5 flex items-baseline justify-center gap-2">
          <span className="font-display text-6xl text-stroke-black">+{deltaWinner}</span>
          <span className="text-xs uppercase tracking-widest text-white/70">pts</span>
        </div>

        {info.firstBlood && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-yellow-300">
            <Zap className="h-3.5 w-3.5" /> First VIP down bonus
          </div>
        )}

        {teams.length > 2 && (
          <div className="mt-4 grid grid-cols-1 gap-1.5 rounded-xl bg-black/25 p-2">
            {teams.filter((t) => t.id !== winner.id).map((t) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                <TeamIcon id={t.icon} className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate text-white/90">{t.name}</span>
                <span className="font-display tabular-nums text-white/90">+{info.deltas[t.id] || 0}</span>
              </div>
            ))}
          </div>
        )}

        {teams.length === 2 && loser && (info.deltas[loser.id] || 0) > 0 && (
          <div className="mt-3 text-xs text-white/70">{loser.name} still scored +{info.deltas[loser.id] || 0}</div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Winner screen ---------------- */

const WinnerScreen = forwardRef<HTMLDivElement, {
  teams: Team[];
  winnerId: string;
  scores: Record<string, number>;
  history: RoundEntry[];
  onShare: () => void; onRematch: () => void; onNewSetup: () => void;
}>(function WinnerScreen({ teams, winnerId, scores, history, onShare, onRematch, onNewSetup }, ref) {
  const w = teams.find((t) => t.id === winnerId)!;
  const sorted = [...teams].map((t) => ({ team: t, score: scores[t.id] || 0 })).sort((a, b) => b.score - a.score);

  const confettiColors = ["#ff3b3b", "#3b82ff", "#ffd93b", "#3bffb0", "#c33bff", "#ff8a3b", "#ffffff"];
  const shapes: Array<"square" | "rect" | "circle"> = ["square", "rect", "circle"];
  const faviconHref = `${import.meta.env.BASE_URL}favicon.png?v=2`;

  const winnerTokens = TEAM_COLORS[w.color];
  // Solid sunburst wedges: alternate bright base and darker deep, no transparency (comic-book style)
  const raysBg = `repeating-conic-gradient(from 0deg at 50% 50%, ${winnerTokens.base} 0deg 12deg, ${winnerTokens.deep} 12deg 24deg)`;
  // Center bloom that fades wedges toward a hot glow at the middle
  const centerBloom = `radial-gradient(circle at 50% 50%, ${winnerTokens.glow} 0%, ${winnerTokens.glow} 6%, transparent 40%)`;
  // Dark vignette so corners feel deep
  const vignette = `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 80%, rgba(0,0,0,0.85) 100%)`;

  const podiumCols =
    teams.length === 2 ? "grid-cols-2" :
    teams.length === 3 ? "grid-cols-3" :
    "grid-cols-2";

  return (
    <div className="relative flex min-h-[100dvh] flex-col p-4 pb-6 overflow-hidden">
      {/* Solid sunburst wedges filling the whole viewport, centered via flex */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden">
        <div
          className="h-[220vmax] w-[220vmax] shrink-0"
          style={{ background: raysBg, animation: "rays-spin-center 60s linear infinite" }}
        />
      </div>
      {/* Hot center bloom */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: centerBloom, animation: "wash-pulse 3.2s ease-in-out infinite", mixBlendMode: "screen" }}
      />
      {/* Corner vignette for depth */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ background: vignette }}
      />



      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        {Array.from({ length: 140 }).map((_, i) => {
          const shape = shapes[i % shapes.length];
          const size = 6 + Math.random() * 10;
          const width = shape === "rect" ? size * 0.5 : size;
          const height = shape === "rect" ? size * 1.4 : size;
          const color = confettiColors[i % confettiColors.length];
          const duration = 3 + Math.random() * 3;
          const delay = -Math.random() * duration;
          return (
            <span
              key={i}
              className="absolute top-0"
              style={{
                left: `${Math.random() * 100}%`,
                width: `${width}px`,
                height: `${height}px`,
                background: color,
                borderRadius: shape === "circle" ? "50%" : shape === "rect" ? "1px" : "2px",
                animation: `confetti-fall ${duration}s ${delay}s linear infinite`,
                transform: `rotate(${Math.random() * 360}deg)`,
                opacity: 0.9,
                boxShadow: `0 0 6px ${color}55`,
              }}
            />
          );
        })}
      </div>

      <div ref={ref} className="relative z-10 rounded-2xl border border-border bg-card/65 p-4 backdrop-blur">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary-foreground animate-pulse-glow" style={teamGradientStyle("gold")}>
            <Trophy className="h-3 w-3" /> Champion
          </div>
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="mx-auto mt-2"
          >
            <div className="mx-auto grid h-32 w-32 place-items-center rounded-3xl bg-gradient-to-br from-white/10 to-white/5 p-3 ring-1 ring-white/15 aspect-square">
              <img
                src={faviconHref}
                alt="Smash Score"
                className="h-28 w-28 rounded-2xl animate-pulse-glow object-contain aspect-square"
                style={{ filter: "drop-shadow(0 0 16px oklch(0.82 0.17 90 / 0.6))" }}
              />
            </div>
          </motion.div>
          <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.3em] text-white/70">Winner</div>
          <motion.h1
            initial={{ scale: 0.6, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.15 }}
            className="mt-1 font-display text-5xl leading-[0.95] text-stroke-black [overflow-wrap:anywhere] hyphens-auto sm:text-6xl"
            style={{
              color: teamTextColor(w.color),
              filter: `drop-shadow(0 4px 0 rgba(0,0,0,0.4)) drop-shadow(0 0 18px ${winnerTokens.glow})`,
            }}
          >
            {w.name.toUpperCase()}
          </motion.h1>
        </div>

        <div className={cn("mt-3 grid gap-2", podiumCols)}>
          {sorted.map(({ team, score }, i) => (
            <div
              key={team.id}
              className={cn("rounded-xl p-2.5 text-white text-center", i > 0 && "opacity-80")}
              style={teamGradientStyle(team.color)}
            >
              <div className="flex items-center justify-center gap-1.5">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-black/30">
                  <TeamIcon id={team.icon} className="h-4 w-4" style={{ display: "block" }} />
                </div>
                <div className="text-[9px] uppercase tracking-widest text-white/80">
                  {i === 0 ? "Winner" : i === 1 ? "Runner-up" : `#${i + 1}`}
                </div>
              </div>
              <div className="mt-1 text-xs font-bold leading-tight [overflow-wrap:anywhere] hyphens-auto">{team.name}</div>
              <div className="mt-0.5 font-display text-3xl text-stroke-black tabular-nums leading-none">{score}</div>
            </div>
          ))}
        </div>

        <div className="mt-2 rounded-xl bg-muted/40 px-3 py-1.5 text-center">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Rounds played</div>
          <div className="font-display text-lg leading-tight">{history.length}</div>
        </div>
      </div>

      <div className="relative z-10 mt-3 grid gap-2">
        <Button onClick={onShare} className="h-11 rounded-xl font-display tracking-widest text-primary-foreground hover:brightness-110" style={teamGradientStyle("gold")}>
          <Share2 className="mr-2 h-4 w-4" /> SHARE RESULT
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onRematch} className="h-10 rounded-xl">
            <RotateCcw className="mr-2 h-4 w-4" /> Rematch
          </Button>
          <Button variant="outline" onClick={onNewSetup} className="h-10 rounded-xl">
            New setup
          </Button>
        </div>
      </div>

      <div className="relative z-10 mt-3 flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur">
        <img src={faviconHref} alt="" className="h-6 w-6 shrink-0 rounded-md" />
        <p className="leading-snug">
          Tip: Add this app to your home screen for one-tap access next brawl night.
        </p>
      </div>

      <div className="relative z-10 mt-3 flex flex-col items-center gap-2 text-center">
        <p className="text-[11px] text-muted-foreground leading-snug max-w-[260px]">
          If you found this useful and want to keep this tool ad free, please consider supporting 😁
        </p>
        <BuyMeCoffeeButton />
      </div>
    </div>
  );
});

/* ---------------- Settings sheet ---------------- */

function SettingsSheet({ settings, setSettings, onClose }: {
  settings: Settings; setSettings: (s: Settings) => void; onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 24 }}
        className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg">Rules & Scoring</h2>
          <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">Done</button>
        </div>
        <div className="grid gap-3">
          <NumberRow label="Points for winning the match" value={settings.matchWinPoints} min={0} max={30}
            onChange={(v) => setSettings({ ...settings, matchWinPoints: v })} />
          <NumberRow label="Points for killing a VIP" value={settings.vipKillPoints} min={0} max={20}
            onChange={(v) => setSettings({ ...settings, vipKillPoints: v })} />
          <label className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div>
              <div className="text-sm font-medium">First VIP down bonus</div>
              <div className="text-xs text-muted-foreground">Reward killing the enemy VIP first.</div>
            </div>
            <Switch checked={settings.firstVipMode} onCheckedChange={(v) => setSettings({ ...settings, firstVipMode: v })} />
          </label>
          <NumberRow label="First VIP kill bonus" value={settings.firstVipBonusPoints} min={0} max={10}
            onChange={(v) => setSettings({ ...settings, firstVipBonusPoints: v })} disabled={!settings.firstVipMode} />
          <NumberRow label="Points to win game" value={settings.targetScore} min={3} max={99}
            onChange={(v) => setSettings({ ...settings, targetScore: v })} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Round detail modal ---------------- */

function RoundDetailModal({ round, teams, settings, onClose }: {
  round: RoundEntry; teams: Team[]; settings: Settings; onClose: () => void;
}) {
  const winner = teams.find((t) => t.id === round.matchWinnerId);
  const info = buildAnimInfo(round, teams, settings);
  const headlineMap: Record<RoundTier, string> = {
    flawless: "Flawless Extraction",
    martyred: "Martyred Victory",
    winIsWin: "A Win Is a Win",
    clean: "Clean Win",
    grind: "Grind Win",
    ffa: "Round Recap",
  };

  const firstKiller = round.firstVipKillerId ? teams.find((t) => t.id === round.firstVipKillerId) : null;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={winner ? teamGradientStyle(winner.color) : undefined}
        className="relative w-full max-w-sm rounded-3xl p-6 text-white shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-black/40 text-white/90 hover:bg-black/60 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
            Round {round.round}
          </div>
          {winner && (
            <div className="mt-3 mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-black/25">
              <TeamIcon id={winner.icon} className="h-12 w-12" />
            </div>
          )}
          <div className="mt-3 font-display text-2xl leading-tight text-stroke-black">
            {headlineMap[info.tier]}
          </div>
        </div>

        <div className={cn("mt-5 grid gap-2 text-center", teams.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
          {teams.map((t) => (
            <div key={t.id} className="rounded-xl bg-black/25 p-3">
              <div className="text-[10px] uppercase tracking-widest text-white/70 truncate">{t.name}</div>
              <div className="font-display text-2xl tabular-nums">+{round.deltas[t.id] || 0}</div>
            </div>
          ))}
        </div>

        <ul className="mt-4 space-y-1.5 text-xs text-white/90">
          <li className="flex items-center gap-2"><Crown className="h-3.5 w-3.5" /> Match winner: <strong className="ml-auto">{winner?.name ?? "—"}</strong></li>
          <li className="flex items-start gap-2"><Skull className="h-3.5 w-3.5 mt-0.5" /> VIP kills:
            <strong className="ml-auto text-right">
              {round.vipKillerIds.length === 0 ? "None" : round.vipKillerIds.map((id) => teams.find((t) => t.id === id)?.name ?? "?").join(", ")}
            </strong>
          </li>
          {firstKiller && (
            <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-yellow-300" /> First VIP down: <strong className="ml-auto">{firstKiller.name}</strong></li>
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}
