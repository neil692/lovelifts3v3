import type { Game, Team, Pool, PoolTeam } from "@/app/generated/prisma/client";

export type TeamWithPool = Team & { poolTeams: PoolTeam[] };
export type GameWithTeams = Game & {
  homeTeam: Team | null;
  awayTeam: Team | null;
};
export type PoolWithTeams = Pool & {
  teams: (PoolTeam & { team: Team })[];
  games: GameWithTeams[];
};

export interface TeamStanding {
  team: Team;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
  avgPointDiff: number;
  gamesPlayed: number;
  tiebreakReason?: string;
}

export function calculateStandings(pool: PoolWithTeams): TeamStanding[] {
  const standings: Map<string, TeamStanding> = new Map();

  for (const pt of pool.teams) {
    standings.set(pt.teamId, {
      team: pt.team,
      wins: 0,
      losses: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDiff: 0,
      avgPointDiff: 0,
      gamesPlayed: 0,
    });
  }

  // Only count POOL games for standings (exclude QUALIFYING)
  const completedGames = pool.games.filter(
    (g) =>
      g.status === "COMPLETED" &&
      g.homeScore !== null &&
      g.awayScore !== null &&
      (g.gameType === "POOL" || !g.gameType)
  );

  for (const game of completedGames) {
    if (!game.homeTeamId || !game.awayTeamId) continue;
    const home = standings.get(game.homeTeamId);
    const away = standings.get(game.awayTeamId);
    if (!home || !away) continue;

    const hs = game.homeScore!;
    const as_ = game.awayScore!;

    home.pointsFor += hs;
    home.pointsAgainst += as_;
    home.gamesPlayed += 1;
    away.pointsFor += as_;
    away.pointsAgainst += hs;
    away.gamesPlayed += 1;

    if (hs > as_) {
      home.wins += 1;
      away.losses += 1;
    } else if (as_ > hs) {
      away.wins += 1;
      home.losses += 1;
    } else {
      home.losses += 1;
      away.losses += 1;
    }
  }

  for (const s of standings.values()) {
    s.pointDiff = s.pointsFor - s.pointsAgainst;
    s.avgPointDiff = s.gamesPlayed > 0 ? s.pointDiff / s.gamesPlayed : 0;
  }

  const sorted = Array.from(standings.values()).sort((a, b) =>
    compareStandings(a, b, completedGames, standings)
  );

  return sorted;
}

function compareStandings(
  a: TeamStanding,
  b: TeamStanding,
  games: GameWithTeams[],
  allStandings: Map<string, TeamStanding>
): number {
  if (b.wins !== a.wins) return b.wins - a.wins;

  // Head-to-head
  const h2h = getHeadToHead(a.team.id, b.team.id, games);
  if (h2h !== 0) {
    a.tiebreakReason = `Tiebreak: head-to-head vs ${b.team.name}`;
    b.tiebreakReason = `Tiebreak: head-to-head vs ${a.team.name}`;
    return h2h;
  }

  // Average point differential (per game — fair across unequal game counts)
  if (b.avgPointDiff !== a.avgPointDiff) {
    a.tiebreakReason = `Tiebreak: avg point diff (${a.avgPointDiff.toFixed(1)})`;
    b.tiebreakReason = `Tiebreak: avg point diff (${b.avgPointDiff.toFixed(1)})`;
    return b.avgPointDiff - a.avgPointDiff;
  }

  // Points scored per game
  const aPpg = a.gamesPlayed > 0 ? a.pointsFor / a.gamesPlayed : 0;
  const bPpg = b.gamesPlayed > 0 ? b.pointsFor / b.gamesPlayed : 0;
  if (bPpg !== aPpg) {
    a.tiebreakReason = `Tiebreak: points scored per game (${aPpg.toFixed(1)})`;
    b.tiebreakReason = `Tiebreak: points scored per game (${bPpg.toFixed(1)})`;
    return bPpg - aPpg;
  }

  // Fewest points allowed per game
  const aApp = a.gamesPlayed > 0 ? a.pointsAgainst / a.gamesPlayed : 0;
  const bApp = b.gamesPlayed > 0 ? b.pointsAgainst / b.gamesPlayed : 0;
  if (aApp !== bApp) {
    a.tiebreakReason = `Tiebreak: fewest points allowed per game (${aApp.toFixed(1)})`;
    b.tiebreakReason = `Tiebreak: fewest points allowed per game (${bApp.toFixed(1)})`;
    return aApp - bApp;
  }

  // Coin flip (deterministic by team ID)
  a.tiebreakReason = `Tiebreak: coin flip`;
  b.tiebreakReason = `Tiebreak: coin flip`;
  return a.team.id < b.team.id ? -1 : 1;
}

function getHeadToHead(
  teamAId: string,
  teamBId: string,
  games: GameWithTeams[]
): number {
  let aWins = 0;
  let bWins = 0;
  for (const g of games) {
    if (g.status !== "COMPLETED") continue;
    const isH2H =
      (g.homeTeamId === teamAId && g.awayTeamId === teamBId) ||
      (g.homeTeamId === teamBId && g.awayTeamId === teamAId);
    if (!isH2H) continue;
    if (g.winnerId === teamAId) aWins++;
    if (g.winnerId === teamBId) bWins++;
  }
  if (aWins > bWins) return -1;
  if (bWins > aWins) return 1;
  return 0;
}

export function advancingTeamsCount(totalTeams: number): number {
  if (totalTeams <= 3) return 2;
  if (totalTeams <= 9) return 4;
  if (totalTeams <= 14) return 6;
  return 8;
}

export function getAdvancingPerPool(totalTeams: number, poolCount: number): number {
  return advancingTeamsCount(totalTeams) / poolCount;
}

export function getAdvancingTeams(
  pools: PoolWithTeams[],
  advancingPerPool: number
): Team[] {
  const advancing: Team[] = [];
  for (const pool of pools) {
    const standings = calculateStandings(pool);
    advancing.push(
      ...standings.slice(0, advancingPerPool).map((s) => s.team)
    );
  }
  return advancing;
}

export interface BracketGame {
  round: number;
  slot: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSourceSlot: number | null;
  awaySourceSlot: number | null;
  label: string;
}

export function buildBracket(teams: Team[], _divisionName: string): BracketGame[] {
  const n = teams.length;
  if (n === 0) return [];

  if (n === 2) {
    return [
      {
        round: 1, slot: 0,
        homeTeamId: teams[0].id, awayTeamId: teams[1].id,
        homeSourceSlot: null, awaySourceSlot: null,
        label: "Championship",
      },
    ];
  }

  if (n === 4) {
    return [
      { round: 2, slot: 0, homeTeamId: teams[0].id, awayTeamId: teams[3].id, homeSourceSlot: null, awaySourceSlot: null, label: "Semifinal 1" },
      { round: 2, slot: 1, homeTeamId: teams[1].id, awayTeamId: teams[2].id, homeSourceSlot: null, awaySourceSlot: null, label: "Semifinal 2" },
      { round: 1, slot: 0, homeTeamId: null, awayTeamId: null, homeSourceSlot: 0, awaySourceSlot: 1, label: "Championship" },
    ];
  }

  if (n === 6) {
    // Seeds 1 & 2 get byes (top avg point diff). Seeds 3v6 and 4v5 play round 1.
    return [
      { round: 4, slot: 0, homeTeamId: teams[2].id, awayTeamId: teams[5].id, homeSourceSlot: null, awaySourceSlot: null, label: "Round 1 (1)" },
      { round: 4, slot: 1, homeTeamId: teams[3].id, awayTeamId: teams[4].id, homeSourceSlot: null, awaySourceSlot: null, label: "Round 1 (2)" },
      { round: 2, slot: 0, homeTeamId: teams[0].id, awayTeamId: null, homeSourceSlot: null, awaySourceSlot: 0, label: "Semifinal 1" },
      { round: 2, slot: 1, homeTeamId: teams[1].id, awayTeamId: null, homeSourceSlot: null, awaySourceSlot: 1, label: "Semifinal 2" },
      { round: 1, slot: 0, homeTeamId: null, awayTeamId: null, homeSourceSlot: 0, awaySourceSlot: 1, label: "Championship" },
    ];
  }

  if (n === 8) {
    return [
      { round: 4, slot: 0, homeTeamId: teams[0].id, awayTeamId: teams[7].id, homeSourceSlot: null, awaySourceSlot: null, label: "Quarterfinal 1" },
      { round: 4, slot: 1, homeTeamId: teams[3].id, awayTeamId: teams[4].id, homeSourceSlot: null, awaySourceSlot: null, label: "Quarterfinal 2" },
      { round: 4, slot: 2, homeTeamId: teams[1].id, awayTeamId: teams[6].id, homeSourceSlot: null, awaySourceSlot: null, label: "Quarterfinal 3" },
      { round: 4, slot: 3, homeTeamId: teams[2].id, awayTeamId: teams[5].id, homeSourceSlot: null, awaySourceSlot: null, label: "Quarterfinal 4" },
      { round: 2, slot: 0, homeTeamId: null, awayTeamId: null, homeSourceSlot: 0, awaySourceSlot: 1, label: "Semifinal 1" },
      { round: 2, slot: 1, homeTeamId: null, awayTeamId: null, homeSourceSlot: 2, awaySourceSlot: 3, label: "Semifinal 2" },
      { round: 1, slot: 0, homeTeamId: null, awayTeamId: null, homeSourceSlot: 0, awaySourceSlot: 1, label: "Championship" },
    ];
  }

  // Fallback: championship with top 2
  return [
    {
      round: 1, slot: 0,
      homeTeamId: teams[0]?.id ?? null,
      awayTeamId: teams[1]?.id ?? null,
      homeSourceSlot: null, awaySourceSlot: null,
      label: "Championship",
    },
  ];
}
