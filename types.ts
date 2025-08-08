

export interface Commander {
  name: string;
  id: string;
}

export interface MaindeckCard {
  name:string;
  cardPreviewImageUrl?: string | null;
}

export interface DeckEntry {
  id: string;
  wins: number;
  losses: number;
  draws: number;
  decklist?: string;
  maindeck: MaindeckCard[];
  commander: {
    cards: {
      cardPreviewImageUrl: string | null;
    }[];
  };
}

export interface PerformanceMetrics {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  deckCountWithGames: number;
  winRateIgnoringDraws: number;
  winRateOverall: number;
}

export interface ChiSquaredResult {
  pValue: number | null;
  isStatisticallySignificant: boolean;
  text: string;
  warning?: string;
}

export interface SingleCardAnalysisResult {
  type: 'single_card';
  commanderName: string;
  cardName: string;
  standingLimit: number;
  timePeriod: string;
  commanderImageUrls: (string | null)[];
  cardImageUrl: string | null;
  inclusionPercentage: number;
  totalEntries: number;
  decksWithCardCount: number;
  metricsWithCard: PerformanceMetrics;
  metricsWithoutCard: PerformanceMetrics;
  winRateDiffIgnoringDraws: number;
  winRateDiffOverall: number;
  chiSquaredOverall: ChiSquaredResult;
  chiSquaredIgnoringDraws: ChiSquaredResult;
  decklistLinksWithCard: string[];
}

export interface CardStat {
  cardName: string;
  inclusionCount: number;
  inclusionPercentage: number;
  wins: number;
  losses: number;
  draws: number;
  decksWithGames: number;
  totalGamesWithCard: number;
  winRateIgnoringDraws: number;
  winRateOverall: number;
  statSig: ChiSquaredResult;
}

export interface CommanderAnalysisResult {
  type: 'commander';
  commanderName: string;
  standingLimit: number;
  timePeriod: string;
  commanderImageUrls: (string | null)[];
  totalEntries: number;
  cardStats: CardStat[];
  overallMetrics: PerformanceMetrics;
  minInclusionPercentage: number;
  topNCardsToPlot: number;
}

export type AnalysisResult = SingleCardAnalysisResult | CommanderAnalysisResult;

export interface ApiError {
  message: string;
  type?: 'ApiError' | 'NotFound';
}