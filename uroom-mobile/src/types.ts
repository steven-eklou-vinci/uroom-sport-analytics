export type PlayerMetric = {
  label: string;
  value: string;
};

export type PlayerDataSource = 'PLATFORM_DATA' | 'SCOUT_CREATED';

export type Player = {
  id: string;
  name: string;
  position: string;
  age: number;
  club: string;
  nationality: string;
  photoUrl?: string;
  uroomScore: number;
  trend: 'up' | 'flat' | 'down';
  metrics: PlayerMetric[];
  tags: string[];
  dataSource?: PlayerDataSource;
  createdByScout?: {
    id: string;
    name: string;
    email: string;
  };
  hasMetricsData?: boolean; // true si PLATFORM_DATA, false si SCOUT_CREATED
};

export type ScoutReport = {
  id: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  clubFit?: string[]; // Optionnel car masqué pour les non-clubs
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
};

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  name?: string | null;
  locale?: string | null;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};
