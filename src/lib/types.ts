export type RowData = Record<string, unknown>;

export interface Season {
  id?: number | string;
  year: number;
  name?: string;
  status?: "active" | "completed" | "archived" | "locked" | string;
}

export interface Team {
  id?: number | string;
  name: string;
  slug?: string;
  status?: string;
}

export interface Player {
  id?: number | string;
  name?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  status?: string;
}

export interface Game {
  id?: number | string;
  year?: number;
  team?: string;
  opponent?: string;
  game_date?: string;
  home_away?: "home" | "away" | string;
  status?: "scheduled" | "completed" | "postponed" | "cancelled" | string;
  runs_for?: number;
  runs_against?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}
