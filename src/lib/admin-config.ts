export type AdminResource = {
  key: string;
  title: string;
  table: string;
  description: string;
  upload?: boolean;
  preferredColumns?: string[];
};

export const adminResources = [
  {
    key: "seasons",
    title: "Seasons",
    table: "seasons",
    description: "Create, edit and review NDSC season records.",
    preferredColumns: ["id", "year", "name", "status", "is_active", "locked"],
  },
  {
    key: "teams",
    title: "NDSC Teams",
    table: "teams",
    description: "Manage Buccaneers, Barracudas, Sluggers and team records.",
    preferredColumns: ["id", "name", "slug", "short_name", "status", "active"],
  },
  {
    key: "team-seasons",
    title: "Team Seasons",
    table: "team_seasons",
    description: "Manage each team's year, division and season status.",
    preferredColumns: ["id", "team_id", "season_id", "year", "division", "status"],
  },
  {
    key: "players",
    title: "Players",
    table: "players",
    description: "Create, edit and deactivate player records.",
    upload: true,
    preferredColumns: ["id", "first_name", "last_name", "name", "gender", "status", "active"],
  },
  {
    key: "player-team-seasons",
    title: "Player Team Seasons",
    table: "player_team_seasons",
    description: "Assign players to teams and seasons.",
    preferredColumns: ["id", "player_id", "team_season_id", "team_id", "season_id", "year", "status"],
  },
  {
    key: "calendar",
    title: "Calendar / Fixtures",
    table: "games",
    description: "Use games as the central fixtures, calendar and results table.",
    upload: true,
    preferredColumns: [
      "id",
      "season_id",
      "year",
      "team_id",
      "team",
      "opponent",
      "game_date",
      "date",
      "home_away",
      "status",
      "runs_for",
      "runs_against",
      "location",
      "latitude",
      "longitude",
      "notes",
    ],
  },
  {
    key: "game-stats",
    title: "Player Game Stats",
    table: "player_game_stats",
    description: "Manual entry and editing for raw player game stats.",
    upload: true,
    preferredColumns: [
      "id",
      "game_id",
      "player_id",
      "innings",
      "rbi",
      "runs",
      "walks",
      "singles",
      "doubles",
      "triples",
      "home_runs",
      "batter_out",
      "at_bats",
      "uaos",
      "aos",
    ],
  },
  {
    key: "eos-stats",
    title: "End-of-Season Stats",
    table: "player_season_stats",
    description: "Review generated player season statistics and refresh calculations.",
    preferredColumns: ["id", "year", "team", "player", "avg", "obp", "slg", "ops", "home_runs"],
  },
  {
    key: "archived-eos-stats",
    title: "Archived EOS Stats",
    table: "player_season_stats_archive",
    description: "Review archived season stat snapshots.",
    preferredColumns: ["id", "year", "team", "player", "archived_at", "archived_by"],
  },
  {
    key: "league-standings",
    title: "League Standings",
    table: "league_standings",
    description: "Manage NDSC and non-NDSC standings rows.",
    upload: true,
    preferredColumns: [
      "id",
      "year",
      "division",
      "position",
      "team",
      "points",
      "wins",
      "losses",
      "runs_scored",
      "runs_against",
      "difference",
      "streak",
    ],
  },
  {
    key: "awards",
    title: "Awards",
    table: "awards",
    description: "Manage end-of-season awards and free-text award names.",
    preferredColumns: ["id", "year", "team_id", "team", "player_id", "player", "award_name", "notes"],
  },
] satisfies AdminResource[];

export const tableViews = [
  "v_player_game_stats",
  "v_player_season_totals",
  "v_player_season_stats",
  "v_team_fixtures_results",
  "v_ndsc_calendar",
  "v_league_standings",
];

export function getResource(key: string) {
  return adminResources.find((resource) => resource.key === key);
}
