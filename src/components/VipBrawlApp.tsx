import { useEffect, useRef, useState, forwardRef, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import html2canvas from "html2canvas-pro";
import { Crown, Skull, Swords, Share2, RotateCcw, Settings2, Plus, Minus, ChevronLeft, Zap, Trophy, Undo2, Redo2, X } from "lucide-react";
import { TeamIcon, ICON_IDS, type IconId } from "@/components/TeamIcon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type TeamKey = "A" | "B";

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
  name: string;
  icon: IconId;
  color: TeamColor;
}

interface Settings {
  vipKillPoints: number;
  matchWinPoints: number;
  firstVipBonusPoints: number;
  targetScore: number;
  firstVipMode: boolean;
}

interface RoundEntry {
  round: number;
  matchWinner: TeamKey;
  vipKilledA: boolean; // Team A killed team B's VIP
  vipKilledB: boolean; // Team B killed team A's VIP
  firstVipKiller: TeamKey | null;
  deltaA: number;
  deltaB: number;
}

const DEFAULTS: Settings = {
  vipKillPoints: 2,
  matchWinPoints: 4,
  firstVipBonusPoints: 1,
  targetScore: 15,
  firstVipMode: true,
};

const DEFAULT_TEAMS: Record<TeamKey, Team> = {
  A: { name: "Red Team", icon: "mario", color: "red" },
  B: { name: "Blue Team", icon: "link", color: "blue" },
};

function loadState<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function VipBrawlApp() {
  const [phase, setPhase] = useState<"setup" | "playing" | "winner">("setup");
  const [teams, setTeams] = useState<Record<TeamKey, Team>>(() => loadState("vb.teams", DEFAULT_TEAMS));
  const [settings, setSettings] = useState<Settings>(() => loadState("vb.settings", DEFAULTS));
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [history, setHistory] = useState<RoundEntry[]>([]);
  const [redoStack, setRedoStack] = useState<RoundEntry[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingAnim, setPendingAnim] = useState<null | RoundAnimInfo>(null);
  const [winnerPending, setWinnerPending] = useState(false);
  const [selectedRound, setSelectedRound] = useState<RoundEntry | null>(null);

  useEffect(() => { localStorage.setItem("vb.teams", JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem("vb.settings", JSON.stringify(settings)); }, [settings]);

  const scoreRef = useRef<HTMLDivElement | null>(null);

  function resetGame(keepTeams = true) {
    setScoreA(0); setScoreB(0); setHistory([]); setRedoStack([]);
    setPhase(keepTeams ? "playing" : "setup");
  }

  function submitRound(input: {
    matchWinner: TeamKey;
    vipKilledA: boolean;
    vipKilledB: boolean;
    firstVipKiller: TeamKey | null;
  }) {
    const { matchWinner, vipKilledA, vipKilledB, firstVipKiller } = input;
    let deltaA = 0, deltaB = 0;
    if (vipKilledA) deltaA += settings.vipKillPoints;
    if (vipKilledB) deltaB += settings.vipKillPoints;
    if (matchWinner === "A") deltaA += settings.matchWinPoints; else deltaB += settings.matchWinPoints;
    if (settings.firstVipMode && firstVipKiller) {
      if (firstVipKiller === "A") deltaA += settings.firstVipBonusPoints;
      else deltaB += settings.firstVipBonusPoints;
    }
    const newA = scoreA + deltaA;
    const newB = scoreB + deltaB;
    const entry: RoundEntry = {
      round: history.length + 1,
      matchWinner, vipKilledA, vipKilledB, firstVipKiller,
      deltaA, deltaB,
    };
    setHistory((h) => [...h, entry]);
    setRedoStack([]); // new action clears redo
    setScoreA(newA); setScoreB(newB);

    setPendingAnim(buildAnimInfo(entry, deltaA, deltaB));

    const target = settings.targetScore;
    if (newA >= target || newB >= target) {
      setWinnerPending(true);
    }
  }

  function undo() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setRedoStack((r) => [...r, last]);
    setScoreA((s) => s - last.deltaA);
    setScoreB((s) => s - last.deltaB);
    setPendingAnim(null);
    toast("Round undone", { description: `R${last.round} rolled back` });
  }

  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((r) => r.slice(0, -1));
    setHistory((h) => [...h, next]);
    setScoreA((s) => s + next.deltaA);
    setScoreB((s) => s + next.deltaB);
    toast("Round restored", { description: `R${next.round} back in play` });
  }

  async function shareResult() {
    if (!scoreRef.current) return;
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
        await nav.share({ files: [file], title: "VIP Brawl Results", text: "Check out our match!" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "vip-brawl-result.png"; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Saved screenshot");
      }
    } catch (e) {
      const err = e as Error;
      if (err?.name === "AbortError") return; // user cancelled share sheet
      toast.error("Couldn't share — try again");
      console.error(e);
    }
  }

  const winnerKey: TeamKey | null = phase === "winner" ? (scoreA >= scoreB ? "A" : "B") : null;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Ambient background — uses the two teams' actual colors */}
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full blur-3xl opacity-30" style={teamGradientStyle(teams.A.color)} />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full blur-3xl opacity-30" style={teamGradientStyle(teams.B.color)} />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col">
        <AnimatePresence mode="wait">
          {phase === "setup" && (
            <motion.div key="setup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <SetupScreen
                teams={teams}
                setTeams={setTeams}
                settings={settings}
                setSettings={setSettings}
                onStart={() => { resetGame(true); setPhase("playing"); }}
              />
            </motion.div>
          )}
          {phase === "playing" && (
            <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlayScreen
                teams={teams}
                settings={settings}
                scoreA={scoreA}
                scoreB={scoreB}
                history={history}
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
          {phase === "winner" && winnerKey && (
            <motion.div key="win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WinnerScreen
                ref={scoreRef}
                teams={teams}
                winner={winnerKey}
                scoreA={scoreA}
                scoreB={scoreB}
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
            teams={teams}
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
            teams={teams}
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

/* ---------------- Setup ---------------- */

function SetupScreen({
  teams, setTeams, settings, setSettings, onStart,
}: {
  teams: Record<TeamKey, Team>;
  setTeams: (t: Record<TeamKey, Team>) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  onStart: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-5 pb-24">
      <header className="pt-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs uppercase tracking-widest text-muted-foreground">
          <Zap className="h-3.5 w-3.5" /> Special Super Smash Bros. Mode Scorekeeper
        </div>
        <h1 className="mt-3 font-display text-4xl leading-none text-stroke-black sm:text-5xl">
          <span style={{ color: teamTextColor(teams.A.color) }}>PROTECT THE</span>{" "}
          <span style={{ color: teamTextColor(teams.B.color) }}>V.I.P.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Two teams. One VIP each. First to {settings.targetScore} wins.</p>
      </header>

      {/* Side-by-side team cards */}
      <div className="grid grid-cols-2 gap-3">
        <TeamCard
          teamKey="A"
          team={teams.A}
          otherColor={teams.B.color}
          onChange={(t) => {
            // If picking the other team's color, swap
            if (t.color !== teams.A.color && t.color === teams.B.color) {
              setTeams({ A: t, B: { ...teams.B, color: teams.A.color } });
            } else {
              setTeams({ ...teams, A: t });
            }
          }}
        />
        <TeamCard
          teamKey="B"
          team={teams.B}
          otherColor={teams.A.color}
          onChange={(t) => {
            if (t.color !== teams.B.color && t.color === teams.A.color) {
              setTeams({ A: { ...teams.A, color: teams.B.color }, B: t });
            } else {
              setTeams({ ...teams, B: t });
            }
          }}
        />
      </div>
      <div className="-my-3 flex items-center justify-center">
        <div className="rounded-full border border-border bg-card px-4 py-1 font-display text-sm tracking-widest text-muted-foreground">VS</div>
      </div>

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
              <div className="text-xs text-muted-foreground">Reward whoever kills the enemy VIP first.</div>
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
    </div>
  );
}

function TeamCard({ teamKey, team, otherColor, onChange }: { teamKey: TeamKey; team: Team; otherColor: TeamColor; onChange: (t: Team) => void }) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl border border-border p-4"
      style={teamGradientStyle(team.color)}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex flex-col items-center">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Team {teamKey}</div>
        <div className="mt-2 flex h-24 w-24 items-center justify-center rounded-2xl bg-black/25 text-white">
          <TeamIcon id={team.icon} className="h-16 w-16" style={{ display: "block" }} />
        </div>
        <div className="mt-3 mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Name Your Team</div>
        <Input
          value={team.name}
          onChange={(e) => onChange({ ...team, name: e.target.value })}
          className="h-10 w-full rounded-xl border border-white/20 bg-white/10 text-center font-normal text-white/90 placeholder:font-normal placeholder:text-white/40 backdrop-blur-sm focus-visible:border-white/40 focus-visible:ring-white/40"
          placeholder={teamKey === "A" ? "Red Team" : "Blue Team"}
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
            const taken = c === otherColor;
            return (
              <button
                key={c}
                onClick={() => onChange({ ...team, color: c })}
                disabled={taken}
                className={cn(
                  "h-8 w-full rounded-lg border transition",
                  team.color === c ? "border-white ring-2 ring-white/80 scale-105" : "border-black/30 hover:brightness-110",
                  taken && "opacity-30 cursor-not-allowed hover:brightness-100",
                )}
                style={teamSolidStyle(c)}
                aria-label={taken ? `${TEAM_COLORS[c].label} (taken)` : TEAM_COLORS[c].label}
                title={taken ? `${TEAM_COLORS[c].label} — used by the other team` : TEAM_COLORS[c].label}
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
  teams, settings, scoreA, scoreB, history, canUndo, canRedo, onUndo, onRedo, onBack, onOpenSettings, onSubmitRound, onRoundClick,
}: {
  teams: Record<TeamKey, Team>;
  settings: Settings;
  scoreA: number;
  scoreB: number;
  history: RoundEntry[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
  onSubmitRound: (i: { matchWinner: TeamKey; vipKilledA: boolean; vipKilledB: boolean; firstVipKiller: TeamKey | null }) => void;
  onRoundClick: (r: RoundEntry) => void;
}) {
  const [vipKilledA, setVipKilledA] = useState(false);
  const [vipKilledB, setVipKilledB] = useState(false);
  const [firstVipKiller, setFirstVipKiller] = useState<TeamKey | null>(null);
  const [matchWinner, setMatchWinner] = useState<TeamKey | null>(null);

  useEffect(() => {
    if (!settings.firstVipMode) { setFirstVipKiller(null); return; }
    if (firstVipKiller === "A" && !vipKilledA) setFirstVipKiller(null);
    if (firstVipKiller === "B" && !vipKilledB) setFirstVipKiller(null);
    // Auto-pick when only one team got a VIP kill
    if (vipKilledA && !vipKilledB) setFirstVipKiller("A");
    else if (vipKilledB && !vipKilledA) setFirstVipKiller("B");
  }, [vipKilledA, vipKilledB, settings.firstVipMode, firstVipKiller]);

  const canSubmit = matchWinner !== null && (!settings.firstVipMode || !(vipKilledA && vipKilledB) || firstVipKiller !== null);

  function submit() {
    if (!matchWinner) return;
    onSubmitRound({ matchWinner, vipKilledA, vipKilledB, firstVipKiller: settings.firstVipMode ? firstVipKiller : null });
    setVipKilledA(false); setVipKilledB(false); setFirstVipKiller(null); setMatchWinner(null);
  }

  const progress = (v: number) => Math.min(100, (v / settings.targetScore) * 100);

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

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3">
        {(["A", "B"] as TeamKey[]).map((k) => {
          const t = teams[k];
          const score = k === "A" ? scoreA : scoreB;
          return (
            <div key={k} className="relative overflow-hidden rounded-2xl border border-border p-3" style={teamGradientStyle(t.color)}>
              <div className="flex items-start gap-2 text-white min-w-0">
                <TeamIcon id={t.icon} className="h-6 w-6 shrink-0" />
                <div className="min-w-0 flex-1 text-xs sm:text-sm font-bold uppercase tracking-wider break-words leading-tight">{t.name}</div>
              </div>
              <motion.div
                key={score}
                initial={{ scale: 1.4, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-1 font-display text-6xl tabular-nums leading-none text-white text-stroke-black"
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
          <Label>VIP kills</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <ToggleTile
              active={vipKilledA} color={teams.A.color}
              onClick={() => setVipKilledA((v) => !v)}
              icon={<Skull className="h-4 w-4" />}
              label={`${teams.A.name} killed VIP`}
              sub={`+${settings.vipKillPoints}`}
            />
            <ToggleTile
              active={vipKilledB} color={teams.B.color}
              onClick={() => setVipKilledB((v) => !v)}
              icon={<Skull className="h-4 w-4" />}
              label={`${teams.B.name} killed VIP`}
              sub={`+${settings.vipKillPoints}`}
            />
          </div>
        </div>

        {settings.firstVipMode && vipKilledA && vipKilledB && (
          <div className="mt-4">
            <Label>Who killed the VIP first?</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <ToggleTile
                active={firstVipKiller === "A"} color={teams.A.color}
                onClick={() => setFirstVipKiller("A")}
                icon={<Zap className="h-4 w-4" />}
                label={teams.A.name}
                sub={`+${settings.firstVipBonusPoints} first blood`}
              />
              <ToggleTile
                active={firstVipKiller === "B"} color={teams.B.color}
                onClick={() => setFirstVipKiller("B")}
                icon={<Zap className="h-4 w-4" />}
                label={teams.B.name}
                sub={`+${settings.firstVipBonusPoints} first blood`}
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <Label>Match winner</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <ToggleTile
              active={matchWinner === "A"} color={teams.A.color}
              onClick={() => setMatchWinner("A")}
              icon={<Crown className="h-4 w-4" />}
              label={teams.A.name}
              sub={`+${settings.matchWinPoints}`}
            />
            <ToggleTile
              active={matchWinner === "B"} color={teams.B.color}
              onClick={() => setMatchWinner("B")}
              icon={<Crown className="h-4 w-4" />}
              label={teams.B.name}
              sub={`+${settings.matchWinPoints}`}
            />
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
            {history.slice().reverse().map((r) => (
              <li key={r.round}>
                <button
                  onClick={() => onRoundClick(r)}
                  className="flex w-full items-center justify-between py-2 text-sm text-left hover:bg-muted/30 rounded-md px-1 -mx-1 transition"
                >
                  <span className="text-muted-foreground">R{r.round}</span>
                  <span className="flex-1 truncate px-2">
                    {teams[r.matchWinner].name} won
                    {r.vipKilledA && ` · ${teams.A.name} VIP kill`}
                    {r.vipKilledB && ` · ${teams.B.name} VIP kill`}
                  </span>
                  <span className="font-display tabular-nums">
                    <span style={{ color: teamTextColor(teams.A.color) }}>+{r.deltaA}</span>
                    {" / "}
                    <span style={{ color: teamTextColor(teams.B.color) }}>+{r.deltaB}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{children}</div>;
}

function ToggleTile({ active, color, onClick, icon, label, sub, disabled }: {
  active: boolean; color: TeamColor; onClick: () => void; icon: React.ReactNode; label: string; sub: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={active ? teamGradientStyle(color) : undefined}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition overflow-hidden w-full",
        active ? "border-transparent text-white" : "border-border bg-muted/40 text-foreground hover:bg-muted",
        disabled && "opacity-40",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider min-w-0 w-full">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("font-display text-sm tabular-nums", active ? "text-white/90" : "text-muted-foreground")}>{sub}</div>
    </button>
  );
}

/* ---------------- Round result overlay ---------------- */

type RoundTier = "flawless" | "martyred" | "winIsWin" | "clean" | "grind";

interface RoundAnimInfo {
  winnerKey: TeamKey;
  loserKey: TeamKey;
  tier: RoundTier;
  firstBlood: boolean;
  deltaWinner: number;
  loserGained: number;
}

function buildAnimInfo(entry: RoundEntry, deltaA: number, deltaB: number): RoundAnimInfo {
  const winnerKey = entry.matchWinner;
  const loserKey: TeamKey = winnerKey === "A" ? "B" : "A";
  const winnerKilledLoserVip = winnerKey === "A" ? entry.vipKilledA : entry.vipKilledB;
  const winnerVipDied = winnerKey === "A" ? entry.vipKilledB : entry.vipKilledA;
  const firstBlood = entry.firstVipKiller === winnerKey;

  // Determine tier per user's exact permutations
  let tier: RoundTier;
  if (winnerKilledLoserVip && firstBlood && !winnerVipDied) {
    tier = "flawless";               // Flawless Extraction
  } else if (winnerKilledLoserVip && firstBlood && winnerVipDied) {
    tier = "martyred";               // Martyred Victory
  } else if (entry.firstVipKiller === loserKey) {
    tier = "winIsWin";               // A Win Is a Win (their VIP fell first, we still won)
  } else if (winnerKilledLoserVip && !winnerVipDied) {
    tier = "clean";                  // clean win — killed their VIP, ours survived, but not first blood
  } else {
    tier = "grind";                  // grind win — pure match points
  }

  return {
    winnerKey, loserKey, tier,
    firstBlood,
    deltaWinner: winnerKey === "A" ? deltaA : deltaB,
    loserGained: winnerKey === "A" ? deltaB : deltaA,
  };
}

function RoundResultOverlay({ teams, info, onDone }: {
  teams: Record<TeamKey, Team>;
  info: RoundAnimInfo;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3600);
    return () => clearTimeout(t);
  }, [onDone]);

  const winner = teams[info.winnerKey];
  const loser = teams[info.loserKey];

  const headlineMap: Record<RoundTier, string> = {
    flawless: "FLAWLESS EXTRACTION",
    martyred: "MARTYRED VICTORY",
    winIsWin: "A WIN IS A WIN",
    clean: "CLEAN WIN",
    grind: "GRIND WIN",
  };
  const subMap: Record<RoundTier, string> = {
    flawless: `${winner.name} wins, killed ${loser.name} VIP first, ${winner.name} VIP survives.`,
    martyred: `${winner.name} wins, killed ${loser.name} VIP first, but ${winner.name} VIP does not make it out alive.`,
    winIsWin: `${winner.name} VIP dies first, but ${winner.name} still wins.`,
    clean: `${winner.name} takes the match and their VIP walks away.`,
    grind: `${winner.name} grinds out the win on match points alone.`,
  };

  const sparks = info.tier === "flawless" || info.tier === "martyred";
  const shake = info.tier === "grind" || info.tier === "winIsWin";

  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
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
        initial={{ scale: 0.6, rotate: -6, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        style={teamGradientStyle(winner.color)}
        className={cn("relative mx-6 max-w-md rounded-3xl px-8 py-8 text-center text-white shadow-2xl", shake && "animate-shake")}
      >
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
          <TeamIcon id={winner.icon} className="h-3.5 w-3.5" /> {winner.name}
        </div>
        <div className="font-display text-3xl leading-tight text-stroke-black sm:text-4xl">{headlineMap[info.tier]}</div>
        <div className="mt-3 text-sm text-white/90">{subMap[info.tier]}</div>

        <div className="mt-5 flex items-baseline justify-center gap-2">
          <span className="font-display text-6xl text-stroke-black">+{info.deltaWinner}</span>
          <span className="text-xs uppercase tracking-widest text-white/70">pts</span>
        </div>

        {info.firstBlood && (
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-widest text-yellow-300">
            <Zap className="h-3.5 w-3.5" /> First VIP down bonus
          </div>
        )}

        {info.loserGained > 0 && (
          <div className="mt-3 text-xs text-white/70">{loser.name} still scored +{info.loserGained}</div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Winner screen ---------------- */

const WinnerScreen = forwardRef<HTMLDivElement, {
  teams: Record<TeamKey, Team>;
  winner: TeamKey;
  scoreA: number; scoreB: number;
  history: RoundEntry[];
  onShare: () => void; onRematch: () => void; onNewSetup: () => void;
}>(function WinnerScreen({ teams, winner, scoreA, scoreB, history, onShare, onRematch, onNewSetup }, ref) {
  const w = teams[winner];
  const l = teams[winner === "A" ? "B" : "A"];
  const wScore = winner === "A" ? scoreA : scoreB;
  const lScore = winner === "A" ? scoreB : scoreA;

  return (
    <div className="relative flex min-h-[100dvh] flex-col p-5 pb-24">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
          <span
            key={i}
            className="absolute top-0 h-2 w-2 rounded-sm"
            style={{
              left: `${Math.random() * 100}%`,
              background: ["#ff3b3b", "#3b82ff", "#ffd93b", "#3bffb0", "#c33bff"][i % 5],
              animation: `confetti-fall ${3 + Math.random() * 3}s ${Math.random() * 2}s linear infinite`,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        ))}
      </div>

      <div ref={ref} className="relative rounded-3xl border border-border bg-card/80 p-6 backdrop-blur">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground animate-pulse-glow" style={teamGradientStyle("gold")}>
            <Trophy className="h-3.5 w-3.5" /> Champion
          </div>
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="mx-auto mt-4"
          >
            <div className="mx-auto grid h-32 w-32 place-items-center rounded-3xl text-white" style={teamGradientStyle(w.color)}>
              <TeamIcon id={w.icon} className="h-20 w-20 animate-pulse-glow" />
            </div>
          </motion.div>
          <h1 className="mt-4 font-display text-5xl text-stroke-black">
            {w.name.toUpperCase()}
          </h1>
          <p className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">Takes the crown</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 text-white text-center" style={teamGradientStyle(w.color)}>
            <div className="text-[10px] uppercase tracking-widest text-white/80">Winner</div>
            <div className="truncate font-bold">{w.name}</div>
            <div className="mt-1 font-display text-4xl text-stroke-black tabular-nums">{wScore}</div>
          </div>
          <div className="rounded-2xl p-4 text-white opacity-80 text-center" style={teamGradientStyle(l.color)}>
            <div className="text-[10px] uppercase tracking-widest text-white/80">Runner-up</div>
            <div className="truncate font-bold">{l.name}</div>
            <div className="mt-1 font-display text-4xl text-stroke-black tabular-nums">{lScore}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-center">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Rounds played</div>
          <div className="mt-1 font-display text-2xl">{history.length}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <Button onClick={onShare} className="h-12 rounded-xl font-display tracking-widest text-primary-foreground hover:brightness-110" style={teamGradientStyle("gold")}>
          <Share2 className="mr-2 h-4 w-4" /> SHARE RESULT
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onRematch} className="h-11 rounded-xl">
            <RotateCcw className="mr-2 h-4 w-4" /> Rematch
          </Button>
          <Button variant="outline" onClick={onNewSetup} className="h-11 rounded-xl">
            New setup
          </Button>
        </div>
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

function RoundDetailModal({ round, teams, onClose }: {
  round: RoundEntry; teams: Record<TeamKey, Team>; onClose: () => void;
}) {
  const winner = teams[round.matchWinner];
  const loser = teams[round.matchWinner === "A" ? "B" : "A"];
  const info = buildAnimInfo(round, round.deltaA, round.deltaB);
  const headlineMap: Record<RoundTier, string> = {
    flawless: "Flawless Extraction",
    martyred: "Martyred Victory",
    winIsWin: "A Win Is a Win",
    clean: "Clean Win",
    grind: "Grind Win",
  };
  const subMap: Record<RoundTier, string> = {
    flawless: `${winner.name} wins, killed ${loser.name} VIP first, ${winner.name} VIP survives.`,
    martyred: `${winner.name} wins, killed ${loser.name} VIP first, but ${winner.name} VIP does not make it out alive.`,
    winIsWin: `${winner.name} VIP dies first, but ${winner.name} still wins.`,
    clean: `${winner.name} takes the match and their VIP walks away.`,
    grind: `${winner.name} grinds out the win on match points alone.`,
  };

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
        style={teamGradientStyle(winner.color)}
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
          <div className="mt-3 mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-black/25">
            <TeamIcon id={winner.icon} className="h-12 w-12" />
          </div>
          <div className="mt-3 font-display text-2xl leading-tight text-stroke-black">
            {headlineMap[info.tier]}
          </div>
          <div className="mt-2 text-sm text-white/90">{subMap[info.tier]}</div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/70 truncate">{teams.A.name}</div>
            <div className="font-display text-2xl tabular-nums">+{round.deltaA}</div>
          </div>
          <div className="rounded-xl bg-black/25 p-3">
            <div className="text-[10px] uppercase tracking-widest text-white/70 truncate">{teams.B.name}</div>
            <div className="font-display text-2xl tabular-nums">+{round.deltaB}</div>
          </div>
        </div>

        <ul className="mt-4 space-y-1.5 text-xs text-white/90">
          <li className="flex items-center gap-2"><Crown className="h-3.5 w-3.5" /> Match winner: <strong className="ml-auto">{winner.name}</strong></li>
          <li className="flex items-center gap-2"><Skull className="h-3.5 w-3.5" /> {teams.A.name} killed VIP: <strong className="ml-auto">{round.vipKilledA ? "Yes" : "No"}</strong></li>
          <li className="flex items-center gap-2"><Skull className="h-3.5 w-3.5" /> {teams.B.name} killed VIP: <strong className="ml-auto">{round.vipKilledB ? "Yes" : "No"}</strong></li>
          {round.firstVipKiller && (
            <li className="flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-yellow-300" /> First VIP down: <strong className="ml-auto">{teams[round.firstVipKiller].name}</strong></li>
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}

