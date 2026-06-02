"use client";

import { useState } from "react";

type Standing = {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  avgPointDiff: number;
  tiebreakReason?: string;
};

type GameRow = {
  id: string;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  label: string | null;
  time: string | null;
};

export function PoolResultsCard({
  name,
  standings,
  games,
  qualifiedTeamIds,
}: {
  name: string;
  standings: Standing[];
  games: GameRow[];
  qualifiedTeamIds: string[];
}) {
  const qualifiedSet = new Set(qualifiedTeamIds);
  const [expanded, setExpanded] = useState(false);
  const completedGames = games.filter((g) => g.status === "COMPLETED");

  return (
    <div className="rounded-lg border border-[var(--border)] overflow-hidden">
      {/* Pool name + toggle */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface-2)]">
        <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest">{name}</span>
        {completedGames.length > 0 && (
          <button
            onClick={() => setExpanded((o) => !o)}
            className="text-xs text-[var(--muted)] hover:text-white transition-colors"
          >
            {expanded ? "Hide results" : `Show results (${completedGames.length})`}
          </button>
        )}
      </div>

      {/* Standings table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
            <th className="text-left px-4 py-2 text-xs font-semibold text-[var(--muted)] w-6">#</th>
            <th className="text-left px-2 py-2 text-xs font-semibold text-[var(--muted)]">Team</th>
            <th className="text-center px-2 py-2 text-xs font-semibold text-[var(--muted)] w-8">W</th>
            <th className="text-center px-2 py-2 text-xs font-semibold text-[var(--muted)] w-8">L</th>
            <th className="text-right px-4 py-2 text-xs font-semibold text-[var(--muted)] w-16">Avg PD</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {standings.map((s, i) => {
            const qualified = qualifiedSet.has(s.teamId);
            return (
            <tr key={s.teamId} className="hover:bg-[var(--surface-2)] transition-colors">
              <td className="px-4 py-2.5 text-[var(--muted)] text-xs">{i + 1}</td>
              <td className="px-2 py-2.5">
                <div className="flex items-center gap-1.5">
                  {qualified && (
                    <span className="text-emerald-400 text-xs font-bold leading-none" title="Qualified for bracket">✓</span>
                  )}
                  <span className={qualified ? "text-emerald-400 font-semibold" : "text-white font-medium"}>
                    {s.teamName}
                  </span>
                </div>
                {s.tiebreakReason && (
                  <span className="block text-[10px] text-[var(--muted)] ml-4">{s.tiebreakReason}</span>
                )}
              </td>
              <td className="text-center px-2 py-2.5 text-white font-semibold">{s.wins}</td>
              <td className="text-center px-2 py-2.5 text-[var(--muted)]">{s.losses}</td>
              <td className="text-right px-4 py-2.5 text-[var(--muted)] text-xs tabular-nums">
                {s.avgPointDiff > 0 ? "+" : ""}{s.avgPointDiff.toFixed(1)}
              </td>
            </tr>
            );
          })}
          {standings.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-3 text-[var(--muted)] text-sm">No teams yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Game results (expanded) */}
      {expanded && completedGames.length > 0 && (
        <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
          {completedGames.map((g) => (
            <div key={g.id} className="flex items-center justify-between px-4 py-2.5 bg-[var(--surface)]">
              <div className="text-sm text-[var(--muted)]">
                {g.label && <span className="text-xs text-[var(--muted)] mr-2">{g.label}</span>}
                <span className="text-white">{g.homeTeamName ?? "TBD"}</span>
                <span className="mx-2 text-[var(--muted)]">vs</span>
                <span className="text-white">{g.awayTeamName ?? "TBD"}</span>
              </div>
              <div className="text-sm font-semibold text-white tabular-nums">
                {g.homeScore} – {g.awayScore}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
