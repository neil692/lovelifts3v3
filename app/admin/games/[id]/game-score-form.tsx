"use client";

import { useState } from "react";
import { submitScore, clearScore, startGame } from "@/actions/games";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type Game = {
  id: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: { name: string } | null;
  awayTeam: { name: string } | null;
  gameType: string;
  actualStartTime: Date | string | null;
  scheduledTime: Date | string | null;
};

function toETTimeString(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function GameScoreForm({ game, returnPath = "/admin" }: { game: Game; returnPath?: string }) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState(
    game.homeScore !== null ? String(game.homeScore) : ""
  );
  const [awayScore, setAwayScore] = useState(
    game.awayScore !== null ? String(game.awayScore) : ""
  );
  const [startTime, setStartTime] = useState(
    toETTimeString(game.actualStartTime ?? game.scheduledTime)
  );
  const [loading, setLoading] = useState(false);
  const isComplete = game.status === "COMPLETED";

  async function handleSaveTime() {
    if (!startTime) return;
    setLoading(true);
    const result = await startGame(game.id, startTime);
    setLoading(false);
    if (result && result.cascaded > 0) {
      const dir = result.delayMinutes > 0 ? "pushed back" : "pulled forward";
      const rounded = Math.round(Math.abs(result.delayMinutes) / 5) * 5;
      toast.success(`Start time saved · ${result.cascaded} later game${result.cascaded === 1 ? "" : "s"} on this court ${dir} ${rounded} min`);
    } else {
      toast.success("Start time saved.");
    }
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hs = parseInt(homeScore);
    const as_ = parseInt(awayScore);
    if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) {
      toast.error("Enter valid scores.");
      return;
    }
    setLoading(true);
    await submitScore(game.id, hs, as_);
    setLoading(false);
    toast.success("Score saved!");
    router.push(returnPath);
  }

  async function handleClear() {
    setLoading(true);
    await clearScore(game.id);
    setHomeScore("");
    setAwayScore("");
    setLoading(false);
    toast.success("Score cleared.");
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-6">
      {isComplete && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/30 px-4 py-2 text-green-400 text-sm font-medium">
          Game complete · {game.homeScore} – {game.awayScore}
        </div>
      )}

      {/* Actual start time entry */}
      {!isComplete && (
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
            Start Time (ET)
          </label>
          <div className="flex gap-2">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={handleSaveTime}
              disabled={loading || !startTime}
              className="btn-ghost px-4 text-sm shrink-0"
            >
              Save
            </button>
          </div>
          {game.actualStartTime && (
            <p className="text-[10px] text-emerald-400">
              Start time recorded · cascaded court schedule if late
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Home team */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
            {game.homeTeam?.name ?? "Home Team"}
          </label>
          <input
            type="number"
            min="0"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="input w-full text-2xl font-black text-center py-4"
            placeholder="0"
          />
        </div>

        <div className="text-center text-[var(--muted)] text-sm font-bold">VS</div>

        {/* Away team */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
            {game.awayTeam?.name ?? "Away Team"}
          </label>
          <input
            type="number"
            min="0"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="input w-full text-2xl font-black text-center py-4"
            placeholder="0"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 py-3 text-sm font-semibold"
          >
            {loading ? "Saving…" : isComplete ? "Update Score" : "Save Score"}
          </button>
          {isComplete && (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="btn-ghost px-4 text-sm"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
