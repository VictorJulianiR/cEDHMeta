

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Loader from './components/Loader';
import SingleCardAnalysisView from './components/SingleCardAnalysisView';
import CommanderAnalysisView from './components/CommanderAnalysisView';
import { getAllCommanderNames, fetchCommanderEntries, fetchCardData } from './services/cedhApi';
import { fetchAllScryfallCardNames } from './services/scryfallApi';
import { analyzeSingleCard, analyzeCommander } from './lib/analysis';
import { generateHtmlOutput } from './lib/generateHtmlReport';
import { Commander, AnalysisResult, ApiError, SingleCardAnalysisResult, CommanderAnalysisResult } from './types';
import { DEFAULT_TIME_PERIOD_KEY, TIME_PERIOD_OPTIONS } from './constants';

const logSearchQuery = async (payload: object) => {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    // Fail silently. The user doesn't need to know if logging failed.
    console.error('Failed to log search query:', error);
  }
};

const App: React.FC = () => {
  const [commanders, setCommanders] = useState<Commander[]>([]);
  const [allCardNames, setAllCardNames] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [timePeriod, setTimePeriod] = useState(TIME_PERIOD_OPTIONS[DEFAULT_TIME_PERIOD_KEY]);
  
  const [commanderCache, setCommanderCache] = useState<Record<string, Commander[]>>({});
  const [imageCache, setImageCache] = useState<Map<string, string | null>>(new Map());

  useEffect(() => {
    const fetchScryfallData = async () => {
        setIsLoading(true);
        setLoadingMessage('Fetching card catalog...');
        try {
            const cardNameList = await fetchAllScryfallCardNames();
            setAllCardNames(cardNameList);
        } catch (err) {
            setError({ message: err instanceof Error ? err.message : 'An unknown error occurred while fetching card data.' });
            setIsLoading(false);
        }
    };
    fetchScryfallData();
  }, []);

  useEffect(() => {
    const fetchCommanders = async () => {
        if (allCardNames.length === 0) return; // Wait for cards to load first

        if (commanderCache[timePeriod]) {
            setCommanders(commanderCache[timePeriod]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const timePeriodKey = Object.keys(TIME_PERIOD_OPTIONS).find(key => TIME_PERIOD_OPTIONS[key] === timePeriod) || '...';
        setLoadingMessage(`Fetching commanders for '${timePeriodKey}'...`);
        setError(null);
        setCommanders([]);

        try {
            const commanderList = await getAllCommanderNames(timePeriod);
            setCommanderCache(prev => ({ ...prev, [timePeriod]: commanderList }));
            setCommanders(commanderList);
        } catch (err) {
            setError({ message: err instanceof Error ? err.message : 'An unknown error occurred while fetching commander data.' });
        } finally {
            setIsLoading(false);
        }
    };

    fetchCommanders();
  }, [timePeriod, commanderCache, allCardNames]);

  const handleAnalyzeCard = useCallback(async (commanderName: string, cardName: string, standingLimit: number, timePeriod: string) => {
    logSearchQuery({ type: 'Single Card Analysis', commander: commanderName, card: cardName, standingLimit, timePeriod });
    setIsLoading(true);
    setLoadingMessage(`Analyzing '${cardName}' in '${commanderName}'...`);
    setError(null);
    setAnalysisHistory([]);
    try {
      const { entries, officialName } = await fetchCommanderEntries(commanderName, standingLimit, timePeriod);
      if (entries.length === 0) {
          throw new Error(`No deck entries found for ${commanderName} with the selected filters.`);
      }
      const analysis = analyzeSingleCard(cardName, entries);
      
      const commanderImageUrls = entries[0]?.commander?.cards
        ?.map(c => c.cardPreviewImageUrl)
        .filter((url): url is string => !!url) ?? [];
        
      const cardData = await fetchCardData(cardName);
      const cardImageUrl = cardData?.cardPreviewImageUrl ?? null;


      const result: SingleCardAnalysisResult = {
        type: 'single_card',
        commanderName: officialName,
        cardName,
        standingLimit,
        timePeriod,
        totalEntries: entries.length,
        commanderImageUrls,
        cardImageUrl,
        ...analysis,
      };
      setAnalysisHistory([result]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown analysis error occurred.';
      if (errorMessage.includes('was not found in any submitted decks')) {
         setError({
            message: `Card '${cardName}' was not found in any decks for commander '${commanderName}' with the current filters. Consider adjusting the 'Standing Limit' or 'Time Period'.`,
            type: 'NotFound',
         });
      } else {
         setError({ message: errorMessage, type: 'ApiError' });
      }
      setAnalysisHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAnalyzeCommander = useCallback(async (commanderName: string, standingLimit: number, timePeriod: string, minInclusion: number, topN: number) => {
    logSearchQuery({ type: 'Commander-Wide Analysis', commander: commanderName, standingLimit, timePeriod, minInclusion: `${minInclusion}%`, topN });
    setIsLoading(true);
    setLoadingMessage(`Performing commander-wide analysis for '${commanderName}'...`);
    setError(null);
    setAnalysisHistory([]);
    try {
        const { entries, officialName } = await fetchCommanderEntries(commanderName, standingLimit, timePeriod);
        if (entries.length === 0) {
          throw new Error(`No deck entries found for ${commanderName} with the selected filters.`);
        }
        const { cardStats, overallMetrics } = analyzeCommander(entries, minInclusion);
        
        const commanderImageUrls = entries[0]?.commander?.cards
            ?.map(c => c.cardPreviewImageUrl)
            .filter((url): url is string => !!url) ?? [];
        
        const initialImageCache = new Map<string, string | null>();
        entries.forEach(entry => {
          entry.maindeck.forEach(card => {
            if (card.name && !initialImageCache.has(card.name)) {
              initialImageCache.set(card.name, card.cardPreviewImageUrl || null);
            }
          });
        });
        setImageCache(initialImageCache);

        const result: CommanderAnalysisResult = {
            type: 'commander',
            commanderName: officialName,
            standingLimit,
            timePeriod,
            commanderImageUrls,
            totalEntries: entries.length,
            cardStats,
            overallMetrics,
            minInclusionPercentage: minInclusion,
            topNCardsToPlot: topN,
        };
        setAnalysisHistory([result]);
    } catch (err) {
        setError({ message: err instanceof Error ? err.message : 'An unknown analysis error occurred.', type: 'ApiError' });
        setAnalysisHistory([]);
    } finally {
        setIsLoading(false);
    }
  }, []);
  
  const handleSaveReport = () => {
    if (analysisHistory.length === 0) return;
    const latestAnalysis = analysisHistory[0];
    
    const htmlContent = generateHtmlOutput(latestAnalysis);
    
    const safeString = (str: string) => str.replace(/[^\w.-]/g, '_');
    const timePeriodStr = Object.keys(TIME_PERIOD_OPTIONS).find(k => TIME_PERIOD_OPTIONS[k] === latestAnalysis.timePeriod) || 'CUSTOM';

    let filename = '';
    if (latestAnalysis.type === 'commander') {
        filename = `cedh_cmdr_${safeString(latestAnalysis.commanderName)}_Top${latestAnalysis.standingLimit}_TP_${safeString(timePeriodStr)}.html`;
    } else {
        filename = `cedh_card_${safeString(latestAnalysis.commanderName)}_Top${latestAnalysis.standingLimit}_${safeString(latestAnalysis.cardName)}_TP_${safeString(timePeriodStr)}.html`;
    }

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader message={loadingMessage} />;
    }
    if (error) {
      if (error.type === 'NotFound') {
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-ui-text-primary">
            <div className="bg-status-warning/20 p-4 rounded-full mb-4 border border-status-warning/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--color-status-warning-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5l-6 6m6-6l-6 6" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold font-heading text-ui-text-primary">Card Not Found</h3>
            <p className="mt-2 max-w-md text-ui-text-secondary">{error.message}</p>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-ui-text-primary">
          <div className="bg-status-error/20 p-4 rounded-full mb-4 border border-status-error/50">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--color-status-error-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
          </div>
          <h3 className="text-2xl font-bold font-heading text-ui-text-primary">An Error Occurred</h3>
          <p className="mt-2 max-w-md text-ui-text-secondary">{error.message}</p>
        </div>
      );
    }
    if (analysisHistory.length > 0) {
      const latestAnalysis = analysisHistory[0];

      if (latestAnalysis.type === 'single_card') {
        return <SingleCardAnalysisView result={latestAnalysis} />;
      }
      if (latestAnalysis.type === 'commander') {
        return <CommanderAnalysisView result={latestAnalysis} imageCache={imageCache} />;
      }
    }
    return (
       <div className="flex flex-col items-center justify-center h-full p-8 text-center text-ui-text-primary">
        <div className="relative mb-6">
            <div className="absolute -inset-2">
                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-brand-gold to-brand-amber rounded-full opacity-20 blur-2xl animate-pulse"></div>
            </div>
             <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-24 w-24 text-ui-text-primary relative" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
        </div>
        <h2 className="text-3xl font-bold tracking-tight font-heading text-ui-text-primary">Welcome to the cEDH Data</h2>
        <p className="mt-4 text-lg max-w-2xl text-ui-text-secondary">
          Unlock competitive insights. Select a commander, choose an analysis type, and let the data guide your deckbuilding decisions.
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans text-ui-text-primary bg-ui-background">
      <Sidebar 
        commanders={commanders}
        allCardNames={allCardNames}
        isLoading={isLoading} 
        onAnalyzeCard={handleAnalyzeCard}
        onAnalyzeCommander={handleAnalyzeCommander}
        onSaveReport={handleSaveReport}
        hasAnalysis={analysisHistory.length > 0}
        timePeriod={timePeriod}
        onTimePeriodChange={setTimePeriod}
      />
      <main className="flex-1 overflow-y-auto bg-ui-background aurora-background">
        <div className="relative z-10 h-full">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;