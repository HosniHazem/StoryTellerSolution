// Type definitions for Story Builder

export interface MatchInfo {
  id: string;
  description: string;
  date: string;
  contestant: Array<{
    id: string;
    name: string;
    shortName: string;
    position: string;
  }>;
  venue: {
    longName: string;
    shortName: string;
  };
  competition: {
    name: string;
    knownName: string;
  };
}

export interface MatchEvent {
  id: string;
  minute: string;
  period: string;
  second: string;
  type: string;
  teamRef1: string;
  teamRef2?: string;
  playerRef1?: string;
  playerRef2?: string;
  comment: string;
  timestamp: string;
}

export interface EventsData {
  matchInfo: MatchInfo;
  messages: Array<{
    language: string;
    message: MatchEvent[];
  }>;
}

export interface StoryMetrics {
  total_events: number;
  total_goals: number;
  score: string;
  match_date: string;
  venue: string;
}

export interface CoverPage {
  type: 'cover';
  headline: string;
  subheadline: string;
  image: string;
}

export interface HighlightPage {
  type: 'highlight';
  minute: number;
  headline: string;
  caption: string;
  image: string;
  explanation: string;
}

export interface InfoPage {
  type: 'info';
  headline: string;
  body: string;
  image?: string;
}

export type StoryPage = CoverPage | HighlightPage | InfoPage;

export interface Story {
  pack_id: string;
  title: string;
  source: string;
  created_at: string;
  metrics: StoryMetrics;
  pages: StoryPage[];
}

export type StoryPerspective = 'home' | 'away' | 'neutral' | 'team';

export interface StoryConfig {
  /**
   * Which team's perspective the story is told from.
   * - "home": focus slightly more on the home team
   * - "away": focus slightly more on the away team
   * - "neutral": treat both teams equally
   * - "team": use an explicit teamId
   */
  perspective: StoryPerspective;

  /**
   * Optional explicit teamId for "team" perspective.
   * Should match one of matchInfo.contestant[i].id when used.
   */
  teamId?: string | null;

  /**
   * Maximum number of highlight pages (excluding cover + info).
   * Used to keep stories concise and engaging.
   */
  maxHighlightPages: number;

  /**
   * Whether to include big chances for the opponent of the posting team.
   */
  includeOpponentBigChances: boolean;

  /**
   * Whether to include card events as highlights.
   */
  includeCards: boolean;

  /**
   * Only yellow cards before this minute are considered highlight-worthy
   * (red cards are always included when includeCards is true).
   */
  cardMinuteCutoff: number;
}

