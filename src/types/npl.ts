export type NplPlayer = {
  id?: number;
  name: string;
  sourceUrl: string;
  registrationUrl?: string;
  jerseyNumber?: number | null;
  dateOfBirth?: string | null;
  role: string;
  batting: string;
  bowling: string;
  imageUrl: string | null;
  nationality: string | null;
  isCaptain: boolean;
  isOverseas: boolean;
  bio?: string | null;
};

export type NplTeam = {
  id?: number;
  playerCount?: number;
  logoSourceUrl?: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  city: string | null;
  ownerName: string | null;
  coach?: string | null;
  captain?: string | null;
  venueName?: string | null;
  website?: string | null;
  championships?: number;
  sourceUrl: string;
  squadUrl: string;
  players: NplPlayer[];
};

export type NplFixture = {
  sourceId: string;
  number: string;
  stage: string;
  home: string;
  away: string;
  homeScore: string | null;
  awayScore: string | null;
  startTime: string;
  venue: string;
  status: string;
  result: string | null;
  sourceUrl: string;
  secondarySource?: boolean;
};

export type NplSeason = {
  season: string;
  seasonNumber?: number;
  sourceProvider?: "nplt20league" | "cricnepal" | "onlinekhabar";
  startDate?: string;
  endDate?: string;
  statistics?: {
    matches: number;
    teams: number;
    venues: number;
    league: number;
    playoffs: number;
    players: number;
  };
  pagination?: { page: number; pageSize: number; total: number; totalPages: number };
  standings?: {
    name: string;
    position: number;
    played: number;
    won: number;
    lost: number;
    tied: number;
    noResult: number;
    points: number;
    netRunRate: number;
  }[];
  name: string;
  fetchedAt: string;
  rostersFetchedAt: string;
  tournamentId?: number;
  sourceUrl: string;
  teams: NplTeam[];
  fixtures: NplFixture[];
  warnings: string[];
  error?: string | null;
};
