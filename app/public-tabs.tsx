"use client";

import { useState } from "react";
import { TeamSearch, type TeamEntry } from "./team-search";
import { PoolResultsCard } from "./admin/results/pool-results-card";

// ─── Schedule types ───────────────────────────────────────────────────────────
export type ScheduleGame = {
  id: string;
  scheduledTime: string | null;
  court: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  gameType: string;
  label: string | null;
  status: string;
  divisionName: string;
};

// ─── Results types ────────────────────────────────────────────────────────────
export type PublicStanding = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  avgPointDiff: number;
  tiebreakReason?: string;
};

export type PublicPoolData = {
  id: string;
  name: string;
  standings: PublicStanding[];
  games: Array<{
    id: string;
    homeTeamName: string | null;
    awayTeamName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    status: string;
    label: string | null;
    time: string | null;
  }>;
};

export type PublicDivision = {
  id: string;
  name: string;
  pools: PublicPoolData[];
  qualifiedIds: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function gameTypeLabel(gameType: string, label: string | null): string {
  if (gameType === "POOL") return "Pool Play";
  if (gameType === "QUALIFYING") return "Play In";
  if (gameType === "ELIMINATION") {
    const l = label ?? "";
    if (l.includes("Quarter")) return "Quarterfinal";
    if (l.includes("Semi")) return "Semifinal";
    return "Final";
  }
  return label ?? "";
}

// ─── Schedule tab ─────────────────────────────────────────────────────────────
function ScheduleTab({ games, teams }: { games: ScheduleGame[]; teams: TeamEntry[] }) {
  return (
    <div className="space-y-6">
      {teams.length > 0 && (
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)] mb-3">
            Find Your Team
          </p>
          <TeamSearch teams={teams} />
        </div>
      )}

      <div>
        <p className="text-xs font-semibold tracking-widest uppercase text-[var(--muted)] mb-3">
          Upcoming Games
        </p>
        {games.length === 0 ? (
          <p className="text-[var(--muted)] text-sm text-center py-10">No upcoming games.</p>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] divide-y divide-[var(--border)]">
            {games.map((g) => {
              const time = g.scheduledTime
                ? new Date(g.scheduledTime).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "America/New_York",
                  })
                : "—";
              return (
                <div key={g.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-20 shrink-0">
                    <div className="text-white text-sm font-semibold">{time}</div>
                    <div className="text-[var(--muted)] text-xs">{g.court ?? "—"}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">
                      {g.homeTeam ?? "TBD"} vs {g.awayTeam ?? "TBD"}
                    </div>
                    <div className="text-[var(--muted)] text-xs">
                      {g.divisionName} · {gameTypeLabel(g.gameType, g.label)}
                    </div>
                  </div>
                  {g.status === "IN_PROGRESS" && (
                    <span className="text-[var(--accent)] text-xs font-bold shrink-0">Live</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Results tab ──────────────────────────────────────────────────────────────
function ResultsTab({ divisions }: { divisions: PublicDivision[] }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const hasAny = divisions.some((d) => d.pools.length > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-[var(--muted)] text-sm flex items-center gap-1.5">
          <span className="text-emerald-400 font-bold">✓</span>
          Team advances to the final bracket
        </p>
        <p className="text-[var(--muted)] text-sm pl-5">
          Tiebreakers: 1) head-to-head result · 2) point differential per game
        </p>
      </div>

      {!hasAny && (
        <p className="text-[var(--muted)] text-sm text-center py-10">Results will appear once pool play begins.</p>
      )}

      {divisions.map((div) => {
        if (div.pools.length === 0) return null;
        const isCollapsed = collapsed.has(div.id);
        return (
          <section key={div.id} className="rounded-xl border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => toggle(div.id)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-2)] hover:bg-[var(--surface)] transition-colors"
            >
              <span className="font-bold text-white text-sm">{div.name}</span>
              <span className="text-[var(--muted)] text-sm">{isCollapsed ? "▸" : "▾"}</span>
            </button>

            {!isCollapsed && (
              <div className="px-4 py-4 space-y-3 bg-[var(--surface)]">
                {div.pools.map((pool) => (
                  <PoolResultsCard
                    key={pool.id}
                    name={pool.name}
                    standings={pool.standings}
                    games={pool.games}
                    qualifiedTeamIds={div.qualifiedIds}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────
export function PublicTabs({
  scheduleGames,
  teams,
  divisions,
}: {
  scheduleGames: ScheduleGame[];
  teams: TeamEntry[];
  divisions: PublicDivision[];
}) {
  const [tab, setTab] = useState<"schedule" | "results">("schedule");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
        {(["schedule", "results"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold capitalize transition-colors ${
              tab === t
                ? "bg-[var(--accent)] text-black"
                : "bg-[var(--surface)] text-[var(--muted)] hover:text-white"
            }`}
          >
            {t === "schedule" ? "Schedule" : "Results"}
          </button>
        ))}
      </div>

      {tab === "schedule" ? (
        <ScheduleTab games={scheduleGames} teams={teams} />
      ) : (
        <ResultsTab divisions={divisions} />
      )}
    </div>
  );
}
