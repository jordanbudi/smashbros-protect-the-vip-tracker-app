import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toPng } from "html-to-image";
import { Crown, Skull, Swords, Share2, RotateCcw, Settings2, Plus, Minus, ChevronLeft, Zap, Trophy } from "lucide-react";
import { TeamIcon, ICON_IDS, type IconId } from "@/components/TeamIcon";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type TeamKey = "A" | "B";

interface Team {
  name: string;
  icon: IconId;
  color: "red" | "blue";
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
  vipKilledA: boolean; // Team A killed team B's VIP (i.e., A got the VIP kill)
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
  const [showSettings, setShowSettings] = useState(false);
  const [pendingAnim, setPendingAnim] = useState<null | {
    winner: TeamKey;
    killedTheirVip: boolean;
    yourVipSurvived: boolean;
    firstBlood: boolean;
    deltaWinner: number;
    deltaLoser: number;
    loserGained: number;
  }>(null);

  useEffect(() => { localStorage.setItem("vb.teams", JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem("vb.settings", JSON.stringify(settings)); }, [settings]);

  const scoreRef = useRef<HTMLDivElement | null>(null);

  function resetGame(keepTeams = true) {
    setScoreA(0); setScoreB(0); setHistory([]);
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
    setScoreA(newA); setScoreB(newB);

    // Animation info
    const winner = matchWinner;
    const killedTheirVip = winner === "A" ? vipKilledB : vipKilledA;
    const yourVipSurvived = winner === "A" ? !vipKilledA : !vipKilledB;
    const firstBlood = settings.firstVipMode && firstVipKiller === winner;
    setPendingAnim({
      winner,
      killedTheirVip,
      yourVipSurvived,
      firstBlood,
      deltaWinner: winner === "A" ? deltaA : deltaB,
      deltaLoser: winner === "A" ? deltaB : deltaA,
      loserGained: winner === "A" ? deltaB : deltaA,
    });

    // Check for game end
    const target = settings.targetScore;
    if (newA >= target || newB >= target) {
      setTimeout(() => setPhase("winner"), 2400);
    }
  }

  async function shareResult() {
    if (!scoreRef.current) return;
    try {
      const dataUrl = await toPng(scoreRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#0b0f1e" });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "vip-brawl-result.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean; share?: (d: ShareData) => Promise<void> };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: "VIP Brawl Results", text: "Check out our match!" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl; a.download = "vip-brawl-result.png"; a.click();
        toast.success("Saved screenshot");
      }
    } catch (e) {
      toast.error("Couldn't share — try again");
      console.error(e);
    }
  }

  const winnerKey: TeamKey | null = phase === "winner" ? (scoreA >= scoreB ? "A" : "B") : null;

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background text-foreground">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 opacity-60">
        <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-team-red-gradient blur-3xl opacity-30" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-team-blue-gradient blur-3xl opacity-30" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col">
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
                onBack={() => setPhase("setup")}
                onOpenSettings={() => setShowSettings(true)}
                onSubmitRound={submitRound}
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

      {/* Round result animation overlay */}
      <AnimatePresence>
        {pendingAnim && (
          <RoundResultOverlay
            key="anim"
            teams={teams}
            info={pendingAnim}
            onDone={() => setPendingAnim(null)}
          />
        )}
      </AnimatePresence>

      {/* Settings sheet */}
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
          <Zap className="h-3.5 w-3.5" /> VIP Brawl Scorekeeper
        </div>
        <h1 className="mt-3 font-display text-4xl leading-none text-stroke-black sm:text-5xl">
          <span className="text-team-red">SMASH</span>{" "}
          <span className="text-team-blue">SCORE</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Two teams. One VIP each. First to {settings.targetScore} wins.</p>
      </header>

      <div className="grid gap-4">
        <TeamCard teamKey="A" team={teams.A} onChange={(t) => setTeams({ ...teams, A: t })} />
        <div className="flex items-center justify-center">
          <div className="rounded-full border border-border bg-card px-4 py-1 font-display text-sm tracking-widest text-muted-foreground">VS</div>
        </div>
        <TeamCard teamKey="B" team={teams.B} onChange={(t) => setTeams({ ...teams, B: t })} />
      </div>

      <section className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="flex items-center gap-2 pb-3">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm tracking-widest text-muted-foreground">RULES</h2>
        </div>
        <div className="grid gap-3">
          <NumberRow label="Points for killing a VIP" value={settings.vipKillPoints} min={0} max={20}
            onChange={(v) => setSettings({ ...settings, vipKillPoints: v })} />
          <NumberRow label="Points for winning the match" value={settings.matchWinPoints} min={0} max={30}
            onChange={(v) => setSettings({ ...settings, matchWinPoints: v })} />
          <NumberRow label="First VIP kill bonus" value={settings.firstVipBonusPoints} min={0} max={10}
            onChange={(v) => setSettings({ ...settings, firstVipBonusPoints: v })} disabled={!settings.firstVipMode} />
          <NumberRow label="Points to win" value={settings.targetScore} min={3} max={99}
            onChange={(v) => setSettings({ ...settings, targetScore: v })} />
          <label className="mt-1 flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div>
              <div className="text-sm font-medium">First VIP down bonus</div>
              <div className="text-xs text-muted-foreground">Reward whoever kills the enemy VIP first.</div>
            </div>
            <Switch checked={settings.firstVipMode} onCheckedChange={(v) => setSettings({ ...settings, firstVipMode: v })} />
          </label>
        </div>
      </section>

      <Button
        onClick={onStart}
        className="h-14 rounded-2xl bg-gold-gradient font-display text-lg tracking-widest text-primary-foreground shadow-[0_10px_40px_-10px_var(--gold-glow)] hover:brightness-110"
      >
        <Swords className="mr-2 h-5 w-5" /> START MATCH
      </Button>
    </div>
  );
}

function TeamCard({ teamKey, team, onChange }: { teamKey: TeamKey; team: Team; onChange: (t: Team) => void }) {
  const isRed = team.color === "red";
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-border p-4",
      isRed ? "bg-team-red-gradient shadow-team-red" : "bg-team-blue-gradient shadow-team-blue",
    )}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-black/25 text-white">
          <TeamIcon id={team.icon} className="h-9 w-9" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Team {teamKey}</div>
          <Input
            value={team.name}
            onChange={(e) => onChange({ ...team, name: e.target.value })}
            className="mt-1 h-9 border-white/30 bg-white/10 text-white placeholder:text-white/60 focus-visible:ring-white/60"
            placeholder={teamKey === "A" ? "Red Team" : "Blue Team"}
            maxLength={20}
          />
        </div>
      </div>
      <div className="mt-3">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Pick an icon</div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {ICON_IDS.map((id) => (
            <button
              key={id}
              onClick={() => onChange({ ...team, icon: id })}
              className={cn(
                "grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white transition",
                team.icon === id ? "bg-white/30 ring-2 ring-white" : "bg-black/25 hover:bg-black/40",
              )}
              aria-label={id}
            >
              <TeamIcon id={id} className="h-7 w-7" />
            </button>
          ))}
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
  teams, settings, scoreA, scoreB, history, onBack, onOpenSettings, onSubmitRound,
}: {
  teams: Record<TeamKey, Team>;
  settings: Settings;
  scoreA: number;
  scoreB: number;
  history: RoundEntry[];
  onBack: () => void;
  onOpenSettings: () => void;
  onSubmitRound: (i: { matchWinner: TeamKey; vipKilledA: boolean; vipKilledB: boolean; firstVipKiller: TeamKey | null }) => void;
}) {
  const [vipKilledA, setVipKilledA] = useState(false); // A killed B's VIP
  const [vipKilledB, setVipKilledB] = useState(false); // B killed A's VIP
  const [firstVipKiller, setFirstVipKiller] = useState<TeamKey | null>(null);
  const [matchWinner, setMatchWinner] = useState<TeamKey | null>(null);

  // Sync first VIP options
  useEffect(() => {
    if (!settings.firstVipMode) { setFirstVipKiller(null); return; }
    if (firstVipKiller === "A" && !vipKilledA) setFirstVipKiller(null);
    if (firstVipKiller === "B" && !vipKilledB) setFirstVipKiller(null);
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
        <Button variant="ghost" size="sm" onClick={onOpenSettings} className="text-muted-foreground">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-2 gap-3">
        {(["A", "B"] as TeamKey[]).map((k) => {
          const t = teams[k];
          const score = k === "A" ? scoreA : scoreB;
          return (
            <div key={k} className={cn(
              "relative overflow-hidden rounded-2xl border border-border p-3",
              t.color === "red" ? "bg-team-red-gradient shadow-team-red" : "bg-team-blue-gradient shadow-team-blue",
            )}>
              <div className="flex items-center gap-2 text-white">
                <TeamIcon id={t.icon} className="h-6 w-6" />
                <div className="truncate text-sm font-bold uppercase tracking-wider">{t.name}</div>
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

      {/* Round entry */}
      <div className="rounded-2xl border border-border bg-card/70 p-4">
        <h3 className="font-display text-sm tracking-widest text-muted-foreground">LOG THIS ROUND</h3>

        <div className="mt-3">
          <Label>VIP kills</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <ToggleTile
              active={vipKilledA}
              color={teams.A.color}
              onClick={() => setVipKilledA((v) => !v)}
              icon={<Skull className="h-4 w-4" />}
              label={`${teams.A.name} killed VIP`}
              sub={`+${settings.vipKillPoints}`}
            />
            <ToggleTile
              active={vipKilledB}
              color={teams.B.color}
              onClick={() => setVipKilledB((v) => !v)}
              icon={<Skull className="h-4 w-4" />}
              label={`${teams.B.name} killed VIP`}
              sub={`+${settings.vipKillPoints}`}
            />
          </div>
        </div>

        {settings.firstVipMode && (vipKilledA || vipKilledB) && (
          <div className="mt-4">
            <Label>Who killed the VIP first?</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <ToggleTile
                active={firstVipKiller === "A"}
                color={teams.A.color}
                disabled={!vipKilledA}
                onClick={() => setFirstVipKiller("A")}
                icon={<Zap className="h-4 w-4" />}
                label={teams.A.name}
                sub={`+${settings.firstVipBonusPoints} first blood`}
              />
              <ToggleTile
                active={firstVipKiller === "B"}
                color={teams.B.color}
                disabled={!vipKilledB}
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
              active={matchWinner === "A"}
              color={teams.A.color}
              onClick={() => setMatchWinner("A")}
              icon={<Crown className="h-4 w-4" />}
              label={teams.A.name}
              sub={`+${settings.matchWinPoints}`}
            />
            <ToggleTile
              active={matchWinner === "B"}
              color={teams.B.color}
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
          className="mt-5 h-12 w-full rounded-xl bg-gold-gradient font-display tracking-widest text-primary-foreground shadow-[0_10px_40px_-10px_var(--gold-glow)] hover:brightness-110"
        >
          LOCK IN ROUND
        </Button>
      </div>

      {history.length > 0 && (
        <div className="rounded-2xl border border-border bg-card/70 p-4">
          <h3 className="font-display text-sm tracking-widest text-muted-foreground">HISTORY</h3>
          <ul className="mt-2 divide-y divide-border/50">
            {history.slice().reverse().map((r) => (
              <li key={r.round} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">R{r.round}</span>
                <span className="flex-1 truncate px-2">
                  {teams[r.matchWinner].name} won
                  {r.vipKilledA && ` · ${teams.A.name} VIP kill`}
                  {r.vipKilledB && ` · ${teams.B.name} VIP kill`}
                </span>
                <span className="font-display tabular-nums">
                  <span className={teams.A.color === "red" ? "text-team-red" : "text-team-blue"}>+{r.deltaA}</span>
                  {" / "}
                  <span className={teams.B.color === "red" ? "text-team-red" : "text-team-blue"}>+{r.deltaB}</span>
                </span>
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
  active: boolean; color: "red" | "blue"; onClick: () => void; icon: React.ReactNode; label: string; sub: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
        active
          ? color === "red"
            ? "border-transparent bg-team-red-gradient text-white shadow-team-red"
            : "border-transparent bg-team-blue-gradient text-white shadow-team-blue"
          : "border-border bg-muted/40 text-foreground hover:bg-muted",
        disabled && "opacity-40",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("font-display text-sm tabular-nums", active ? "text-white/90" : "text-muted-foreground")}>{sub}</div>
    </button>
  );
}

/* ---------------- Round result overlay ---------------- */

interface RoundAnimInfo {
  winner: TeamKey;
  killedTheirVip: boolean;
  yourVipSurvived: boolean;
  firstBlood: boolean;
  deltaWinner: number;
  deltaLoser: number;
  loserGained: number;
}

function RoundResultOverlay({ teams, info, onDone }: {
  teams: Record<TeamKey, Team>;
  info: RoundAnimInfo;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  const winner = teams[info.winner];
  // Determine tier
  const flawless = info.killedTheirVip && info.yourVipSurvived; // perfect round
  const tier: "flawless" | "clutch" | "close" | "grind" =
    flawless ? "flawless"
      : info.killedTheirVip ? "clutch"
      : info.yourVipSurvived ? "close"
      : "grind";

  const headline = {
    flawless: "FLAWLESS!",
    clutch: "DOUBLE K.O.!",
    close: "CLEAN WIN!",
    grind: "GRIND WIN",
  }[tier];

  const sub = {
    flawless: "Won the match AND took down their VIP — yours survived.",
    clutch: "Took the VIP with you and still won.",
    close: "Won the match. Your VIP held the line.",
    grind: "Won without the VIP kill. Points still count.",
  }[tier];

  const bg = winner.color === "red" ? "bg-team-red-gradient" : "bg-team-blue-gradient";

  return (
    <motion.div
      className="fixed inset-0 z-40 grid place-items-center bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Sparks for flawless */}
      {(tier === "flawless" || tier === "clutch") && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 26 }).map((_, i) => (
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
        className={cn("relative mx-6 max-w-md rounded-3xl px-8 py-8 text-center text-white shadow-2xl", bg, tier === "grind" && "animate-shake")}
      >
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]">
          <TeamIcon id={winner.icon} className="h-3.5 w-3.5" /> {winner.name}
        </div>
        <div className="font-display text-5xl leading-none text-stroke-black sm:text-6xl">{headline}</div>
        <div className="mt-3 text-sm text-white/90">{sub}</div>

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
          <div className="mt-3 text-xs text-white/70">Losing team still scored +{info.loserGained}</div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Winner screen ---------------- */

import { forwardRef } from "react";

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
      {/* Confetti */}
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
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-gradient px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground animate-pulse-glow text-[var(--gold)]">
            <Trophy className="h-3.5 w-3.5" /> Champion
          </div>
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="mx-auto mt-4"
          >
            <div className={cn(
              "mx-auto grid h-32 w-32 place-items-center rounded-3xl text-white",
              w.color === "red" ? "bg-team-red-gradient shadow-team-red" : "bg-team-blue-gradient shadow-team-blue",
            )}>
              <TeamIcon id={w.icon} className="h-20 w-20 animate-pulse-glow" />
            </div>
          </motion.div>
          <h1 className="mt-4 font-display text-5xl text-stroke-black">
            {w.name.toUpperCase()}
          </h1>
          <p className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">Takes the crown</p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className={cn("rounded-2xl p-4 text-white", w.color === "red" ? "bg-team-red-gradient" : "bg-team-blue-gradient")}>
            <div className="text-[10px] uppercase tracking-widest text-white/80">Winner</div>
            <div className="truncate font-bold">{w.name}</div>
            <div className="mt-1 font-display text-4xl text-stroke-black tabular-nums">{wScore}</div>
          </div>
          <div className={cn("rounded-2xl p-4 text-white opacity-80", l.color === "red" ? "bg-team-red-gradient" : "bg-team-blue-gradient")}>
            <div className="text-[10px] uppercase tracking-widest text-white/80">Runner-up</div>
            <div className="truncate font-bold">{l.name}</div>
            <div className="mt-1 font-display text-4xl text-stroke-black tabular-nums">{lScore}</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-muted/40 p-3">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Rounds played</div>
          <div className="mt-1 font-display text-2xl">{history.length}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <Button onClick={onShare} className="h-12 rounded-xl bg-gold-gradient font-display tracking-widest text-primary-foreground shadow-[0_10px_40px_-10px_var(--gold-glow)] hover:brightness-110">
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
          <NumberRow label="Points for killing a VIP" value={settings.vipKillPoints} min={0} max={20}
            onChange={(v) => setSettings({ ...settings, vipKillPoints: v })} />
          <NumberRow label="Points for winning the match" value={settings.matchWinPoints} min={0} max={30}
            onChange={(v) => setSettings({ ...settings, matchWinPoints: v })} />
          <NumberRow label="First VIP kill bonus" value={settings.firstVipBonusPoints} min={0} max={10}
            onChange={(v) => setSettings({ ...settings, firstVipBonusPoints: v })} disabled={!settings.firstVipMode} />
          <NumberRow label="Points to win" value={settings.targetScore} min={3} max={99}
            onChange={(v) => setSettings({ ...settings, targetScore: v })} />
          <label className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
            <div>
              <div className="text-sm font-medium">First VIP down bonus</div>
              <div className="text-xs text-muted-foreground">Reward killing the enemy VIP first.</div>
            </div>
            <Switch checked={settings.firstVipMode} onCheckedChange={(v) => setSettings({ ...settings, firstVipMode: v })} />
          </label>
        </div>
      </motion.div>
    </motion.div>
  );
}
