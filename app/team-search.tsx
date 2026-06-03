"use client";

import { useState, useRef } from "react";

type GameRow = {
  id: string;
  scheduledTime: string | null;
  court: string | null;
  opponent: string | null;
  gameType: string;
  label: string | null;
  status: string;
};

export type TeamEntry = {
  id: string;
  name: string;
  divisionName: string;
  games: GameRow[];
};

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

export function TeamSearch({ teams }: { teams: TeamEntry[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<TeamEntry | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const suggestions =
    q.length >= 1
      ? teams.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 6)
      : [];

  function pick(team: TeamEntry) {
    setSelected(team);
    setQuery(team.name);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          placeholder="Search your team name…"
          className="input w-full pr-10 py-3 text-sm"
        />
        {query && (
          <button
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && !selected && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
            {suggestions.map((team) => (
              <button
                key={team.id}
                onClick={() => pick(team)}
                className="w-full text-left px-4 py-3 hover:bg-[var(--surface-2)] transition-colors border-b border-[var(--border)] last:border-0"
              >
                <span className="text-[var(--foreground)] text-sm font-medium">{team.name}</span>
                <span className="text-[var(--muted)] text-xs ml-2">{team.divisionName}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected team games */}
      {selected && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-4 py-3 bg-[var(--surface-2)] border-b border-[var(--border)]">
            <p className="text-[var(--accent)] text-xs font-semibold tracking-widest uppercase">
              {selected.divisionName}
            </p>
            <p className="text-[var(--foreground)] font-bold text-lg leading-tight">{selected.name}</p>
          </div>

          {selected.games.length === 0 ? (
            <p className="px-4 py-6 text-[var(--muted)] text-sm text-center">
              No upcoming games scheduled yet.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {selected.games.map((g) => {
                const time = g.scheduledTime
                  ? new Date(g.scheduledTime).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      timeZone: "America/New_York",
                    })
                  : null;
                return (
                  <div key={g.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-20 shrink-0">
                      <div className="text-[var(--foreground)] text-sm font-semibold">{time ?? "—"}</div>
                      <div className="text-[var(--muted)] text-xs">{g.court ?? "—"}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[var(--foreground)] text-sm">
                        vs{" "}
                        <span className="font-semibold">
                          {g.opponent ?? "TBD"}
                        </span>
                      </div>
                      <div className="text-[var(--muted)] text-xs">
                        {gameTypeLabel(g.gameType, g.label)}
                      </div>
                    </div>
                    {g.status === "IN_PROGRESS" && (
                      <span className="text-xs text-[var(--accent)] font-semibold shrink-0">Live</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
