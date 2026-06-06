import type { Team } from "@/app/generated/prisma/client";

export interface ScheduleInput {
  pools: SchedulePool[];
  courts: ScheduleCourt[];
  tournamentDate: Date;
  startHour: number; // 9
  startMinute: number; // 30
  endHour: number; // 16
  slotMinutes: number; // 15
}

export interface SchedulePool {
  id: string;
  divisionId: string;
  teams: Team[];
}

export interface ScheduleCourt {
  id: string;
  order: number;
}

export interface ScheduledGame {
  homeTeamId: string;
  awayTeamId: string;
  poolId: string;
  divisionId: string;
  courtId: string;
  scheduledTime: Date;
  gameType: "POOL";
}

export function generatePoolSchedule(input: ScheduleInput): ScheduledGame[] {
  const { pools, courts, tournamentDate, startHour, startMinute, endHour, slotMinutes } = input;

  const sortedCourts = [...courts].sort((a, b) => a.order - b.order);

  // Build all time slots in Eastern Daylight Time (EDT = UTC-4).
  // startHour/endHour are Eastern hours; add 4 to get UTC hours for storage.
  const EDT_OFFSET = 4;
  const slots: Date[] = [];
  const base = new Date(tournamentDate);
  base.setUTCHours(startHour + EDT_OFFSET, startMinute, 0, 0);
  const end = new Date(tournamentDate);
  end.setUTCHours(endHour + EDT_OFFSET, 0, 0, 0);
  let cur = new Date(base);
  while (cur < end) {
    slots.push(new Date(cur));
    cur = new Date(cur.getTime() + slotMinutes * 60000);
  }

  // Track occupied slots per court and last slot index per team
  const courtOccupied: Map<string, Set<number>> = new Map();
  for (const court of sortedCourts) {
    courtOccupied.set(court.id, new Set());
  }
  const teamLastSlot: Map<string, number> = new Map();

  const results: ScheduledGame[] = [];

  // Pre-generate all rounds per pool, then schedule breadth-first (round 1 of
  // every pool before round 2 of any pool). This ensures every division gets an
  // early slot rather than later divisions being pushed to mid-morning.
  // Sort by most rounds first so pools with more games get the earliest slots.
  const allPoolRounds = pools
    .map((pool) => ({ pool, rounds: generateRounds(pool.teams) }))
    .sort((a, b) => b.rounds.length - a.rounds.length);

  const maxRounds = Math.max(0, ...allPoolRounds.map((pr) => pr.rounds.length));

  for (let roundIdx = 0; roundIdx < maxRounds; roundIdx++) {
    for (const { pool, rounds } of allPoolRounds) {
      const round = rounds[roundIdx];
      if (!round) continue;

      // Schedule each game in the round individually so courts fill up evenly.
      for (const [home, away] of round) {
        for (let si = 0; si < slots.length; si++) {
          const hl = teamLastSlot.get(home.id) ?? -3;
          const al = teamLastSlot.get(away.id) ?? -3;
          if (hl > si - 2 || al > si - 2) continue;

          const freeCourt = sortedCourts.find(
            (c) => !courtOccupied.get(c.id)!.has(si)
          );
          if (!freeCourt) continue;

          courtOccupied.get(freeCourt.id)!.add(si);
          teamLastSlot.set(home.id, si);
          teamLastSlot.set(away.id, si);
          results.push({
            homeTeamId: home.id,
            awayTeamId: away.id,
            poolId: pool.id,
            divisionId: pool.divisionId,
            courtId: freeCourt.id,
            scheduledTime: slots[si],
            gameType: "POOL",
          });
          break;
        }
      }
    }
  }

  return results;
}

// Generate rounds using the circle/Berger method.
// Each round is a set of games that can be played concurrently (no team repeats).
// For 2 teams: 3 rounds of 1 game (same matchup repeated).
// For N teams: enough rounds so every team plays ≥ 3 games.
function generateRounds(teams: Team[]): [Team, Team][][] {
  const n = teams.length;
  if (n < 2) return [];

  if (n === 2) {
    return [
      [[teams[0], teams[1]]],
      [[teams[0], teams[1]]],
      [[teams[0], teams[1]]],
    ];
  }

  // Use circle method. Add a bye for odd N.
  const list: (Team | null)[] = n % 2 === 0 ? [...teams] : [...teams, null];
  const size = list.length;
  const allRounds: [Team, Team][][] = [];

  for (let round = 0; round < size - 1; round++) {
    const roundGames: [Team, Team][] = [];
    for (let i = 0; i < size / 2; i++) {
      const home = list[i];
      const away = list[size - 1 - i];
      if (home !== null && away !== null) {
        roundGames.push([home, away]);
      }
    }
    if (roundGames.length > 0) allRounds.push(roundGames);

    // Rotate: fix position 0, rotate rest right by 1
    const last = list[size - 1];
    for (let i = size - 1; i > 1; i--) {
      list[i] = list[i - 1];
    }
    list[1] = last;
  }

  // Determine how many rounds we need so every team plays ≥ 3 games
  const targetRounds = roundsNeededForThreeGames(n, allRounds);
  return allRounds.slice(0, targetRounds);
}

function roundsNeededForThreeGames(n: number, rounds: [Team, Team][][]): number {
  for (let r = 1; r <= rounds.length; r++) {
    const counts = new Map<string, number>();
    for (let ri = 0; ri < r; ri++) {
      for (const [h, a] of rounds[ri]) {
        counts.set(h.id, (counts.get(h.id) ?? 0) + 1);
        counts.set(a.id, (counts.get(a.id) ?? 0) + 1);
      }
    }
    const min = Math.min(...Array.from(counts.values()));
    if (min >= 3) return r;
  }
  return rounds.length;
}

// Cascade: adjust all future SCHEDULED games on a court by delayMinutes (positive = push later, negative = pull earlier).
// fromTime is the scheduled start of the triggering game — only games scheduled strictly after it are updated.
export function cascadeCourtSchedule(
  games: Array<{ id: string; courtId: string | null; scheduledTime: Date | null; status: string }>,
  courtId: string,
  fromTime: Date,
  delayMinutes: number,
  slotMinutes: number
): Map<string, Date> {
  const roundedMinutes = Math.round(delayMinutes / 5) * 5;
  const delayMs = roundedMinutes * 60000;

  const updates = new Map<string, Date>();
  for (const g of games) {
    if (
      g.courtId === courtId &&
      g.status === "SCHEDULED" &&
      g.scheduledTime &&
      g.scheduledTime > fromTime
    ) {
      updates.set(g.id, new Date(g.scheduledTime.getTime() + delayMs));
    }
  }
  return updates;
}
