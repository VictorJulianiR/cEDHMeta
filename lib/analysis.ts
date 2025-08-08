import jStat from 'jstat';
import { DeckEntry, PerformanceMetrics, ChiSquaredResult, CardStat } from '../types';

function checkCardInMaindeck(maindeck: { name: string }[], cardName: string): boolean {
  if (!maindeck) return false;
  const normalizedCard = cardName.toLowerCase().trim();
  for (const card of maindeck) {
    const apiCardName = card.name.toLowerCase().trim();
    if (normalizedCard === apiCardName) return true;
    if (apiCardName.includes('//') && apiCardName.split('//').map(p => p.trim()).includes(normalizedCard)) {
      return true;
    }
  }
  return false;
}

function calculatePerformanceMetrics(entries: DeckEntry[]): PerformanceMetrics {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let deckCountWithGames = 0;

  for (const entry of entries) {
    if ((entry.wins + entry.losses + entry.draws) > 0) {
      wins += entry.wins;
      losses += entry.losses;
      draws += entry.draws;
      deckCountWithGames++;
    }
  }
  
  const totalGames = wins + losses + draws;
  const winRateIgnoringDraws = (wins + losses) > 0 ? wins / (wins + losses) : 0;
  const winRateOverall = totalGames > 0 ? wins / totalGames : 0;

  return { wins, losses, draws, totalGames, deckCountWithGames, winRateIgnoringDraws, winRateOverall };
}

function runChiSquaredTest(a: number, b: number, c: number, d: number): ChiSquaredResult {
    // a: group1_success, b: group1_failure
    // c: group2_success, d: group2_failure
    const contingencyTable = [[a, b], [c, d]];

    const row1_total = a + b;
    const row2_total = c + d;
    const col1_total = a + c;
    const col2_total = b + d;
    const total = a + b + c + d;

    if (total === 0 || row1_total === 0 || row2_total === 0 || col1_total === 0 || col2_total === 0) {
        return { pValue: null, isStatisticallySignificant: false, text: "N/A (insufficient data)" };
    }

    const expected = [
        [(row1_total * col1_total) / total, (row1_total * col2_total) / total],
        [(row2_total * col1_total) / total, (row2_total * col2_total) / total]
    ];
    
    const lowExpectedFrequency = expected.flat().some(e => e < 5);

    let chi2 = 0;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            if(expected[i][j] === 0) continue;
            // Yates' correction for 2x2 table
            const yatesCorrection = Math.max(0, Math.abs(contingencyTable[i][j] - expected[i][j]) - 0.5);
            chi2 += Math.pow(yatesCorrection, 2) / expected[i][j];
        }
    }

    const pValue = 1 - jStat.chisquare.cdf(chi2, 1); // 1 degree of freedom for a 2x2 table
    
    return {
        pValue: pValue,
        isStatisticallySignificant: pValue < 0.05,
        text: `p=${pValue.toFixed(4)}`,
        warning: lowExpectedFrequency ? "Warning: low expected frequency" : undefined
    };
}


export function analyzeSingleCard(cardName: string, entries: DeckEntry[]) {
    const decksWithCard: DeckEntry[] = [];
    const decksWithoutCard: DeckEntry[] = [];

    for (const entry of entries) {
        if (checkCardInMaindeck(entry.maindeck, cardName)) {
            decksWithCard.push(entry);
        } else {
            decksWithoutCard.push(entry);
        }
    }

    if (decksWithCard.length === 0) {
        throw new Error(`The card '${cardName}' was not found in any submitted decks with the current filters.`);
    }
    
    const metricsWithCard = calculatePerformanceMetrics(decksWithCard);
    const metricsWithoutCard = calculatePerformanceMetrics(decksWithoutCard);
    
    const decklistLinks = decksWithCard
        .map(e => e.decklist)
        .filter((url): url is string => !!url && (url.includes("moxfield.com") || url.includes("topdeck.gg")));

    // Chi-squared for Overall Win Rate (W vs L+D)
    const chiSquaredOverall = runChiSquaredTest(
        metricsWithCard.wins,
        metricsWithCard.losses + metricsWithCard.draws,
        metricsWithoutCard.wins,
        metricsWithoutCard.losses + metricsWithoutCard.draws
    );

    // Chi-squared for Win Rate Ignoring Draws (W vs L)
    const chiSquaredIgnoringDraws = runChiSquaredTest(
        metricsWithCard.wins,
        metricsWithCard.losses,
        metricsWithoutCard.wins,
        metricsWithoutCard.losses
    );

    return {
        decksWithCardCount: decksWithCard.length,
        inclusionPercentage: entries.length > 0 ? (decksWithCard.length / entries.length) * 100 : 0,
        metricsWithCard,
        metricsWithoutCard,
        winRateDiffIgnoringDraws: (metricsWithCard.winRateIgnoringDraws - metricsWithoutCard.winRateIgnoringDraws) * 100,
        winRateDiffOverall: (metricsWithCard.winRateOverall - metricsWithoutCard.winRateOverall) * 100,
        decklistLinksWithCard: decklistLinks,
        chiSquaredOverall,
        chiSquaredIgnoringDraws,
    };
}


export function analyzeCommander(entries: DeckEntry[], minInclusionPercentage: number): { cardStats: CardStat[], overallMetrics: PerformanceMetrics } {
    const cardAggregation: Record<string, {
        wins: number; losses: number; draws: number;
        inclusionCount: number; decksWithGames: number; totalGames: number;
    }> = {};

    const overallMetrics = calculatePerformanceMetrics(entries);

    for (const entry of entries) {
        const uniqueCards = new Set(entry.maindeck.map(c => c.name));
        const hasGames = (entry.wins + entry.losses + entry.draws) > 0;
        
        for (const cardName of uniqueCards) {
            if (!cardAggregation[cardName]) {
                cardAggregation[cardName] = { wins: 0, losses: 0, draws: 0, inclusionCount: 0, decksWithGames: 0, totalGames: 0 };
            }
            cardAggregation[cardName].inclusionCount++;
            cardAggregation[cardName].wins += entry.wins;
            cardAggregation[cardName].losses += entry.losses;
            cardAggregation[cardName].draws += entry.draws;
            if (hasGames) {
              cardAggregation[cardName].decksWithGames++;
              cardAggregation[cardName].totalGames += entry.wins + entry.losses + entry.draws;
            }
        }
    }

    const cardStats: CardStat[] = [];
    for (const cardName in cardAggregation) {
        const stats = cardAggregation[cardName];
        const inclusionPercentage = (stats.inclusionCount / entries.length) * 100;
        if (inclusionPercentage < minInclusionPercentage) continue;

        const wins_wc = stats.wins;
        const non_wins_wc = stats.losses + stats.draws;
        
        const wins_woc = overallMetrics.wins - wins_wc;
        const non_wins_woc = (overallMetrics.losses - stats.losses) + (overallMetrics.draws - stats.draws);
        
        const statSig = runChiSquaredTest(wins_wc, non_wins_wc, wins_woc, non_wins_woc);

        cardStats.push({
            cardName,
            inclusionCount: stats.inclusionCount,
            inclusionPercentage,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            decksWithGames: stats.decksWithGames,
            totalGamesWithCard: stats.totalGames,
            winRateIgnoringDraws: (stats.wins + stats.losses > 0) ? (stats.wins / (stats.wins + stats.losses)) * 100 : 0,
            winRateOverall: (stats.totalGames > 0) ? (stats.wins / stats.totalGames) * 100 : 0,
            statSig
        });
    }

    return { cardStats, overallMetrics };
}