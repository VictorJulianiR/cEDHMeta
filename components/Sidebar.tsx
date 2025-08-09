import React, { useState, useMemo, useEffect, useRef } from 'react';
import Fuse from 'fuse.js';
import { TIME_PERIOD_OPTIONS } from '../constants';
import { Commander } from '../types';

interface SidebarProps {
  commanders: Commander[];
  allCardNames: string[];
  isLoading: boolean;
  onAnalyzeCard: (commander: string, card: string, standingLimit: number, timePeriod: string) => void;
  onAnalyzeCommander: (commander: string, standingLimit: number, timePeriod: string, minInclusion: number, topN: number) => void;
  onSaveReport: () => void;
  hasAnalysis: boolean;
  timePeriod: string;
  onTimePeriodChange: (newTimePeriod: string) => void;
}

const STANDING_LIMIT_OPTIONS = [16, 32, 64, 128, 256, 512, 1024];
const MIN_INCLUSION_PERC_OPTIONS = [0.1, 0.5, 1.0, 2.0, 3.0, 5.0, 10.0];

const Sidebar: React.FC<SidebarProps> = ({ commanders, allCardNames, isLoading, onAnalyzeCard, onAnalyzeCommander, onSaveReport, hasAnalysis, timePeriod, onTimePeriodChange }) => {
  const [standingLimit, setStandingLimit] = useState(64);
  const [selectedCommander, setSelectedCommander] = useState('');
  const [cardName, setCardName] = useState('');
  const [minInclusion, setMinInclusion] = useState(2.0);
  const [topNCards, setTopNCards] = useState(25);
  
  // Commander Search State & Refs
  const [commanderSearch, setCommanderSearch] = useState('');
  const [showCommanderList, setShowCommanderList] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Card Search State & Refs
  const [filteredCardNames, setFilteredCardNames] = useState<string[]>([]);
  const [showCardList, setShowCardList] = useState(false);
  const [highlightedCardIndex, setHighlightedCardIndex] = useState(-1);
  const cardListboxRef = useRef<HTMLUListElement>(null);
  const cardInputRef = useRef<HTMLDivElement>(null);

  const commanderNamesSet = useMemo(() => new Set(commanders.map(c => c.name.toLowerCase())), [commanders]);
  const allCardNamesSet = useMemo(() => new Set(allCardNames.map(name => name.toLowerCase())), [allCardNames]);

  const handleAnalyzeCard = () => {
    if (selectedCommander && cardName && !isLoading) {
      onAnalyzeCard(selectedCommander, cardName.trim(), standingLimit, timePeriod);
    }
  };

  const handleAnalyzeCommander = () => {
    if (selectedCommander && !isLoading) {
      onAnalyzeCommander(selectedCommander, standingLimit, timePeriod, minInclusion, topNCards);
    }
  };
  
  const commanderFuse = useMemo(() => {
    return new Fuse(commanders, {
      keys: ['name'],
      threshold: 0.4,
      ignoreLocation: true,
      useExtendedSearch: true,
    });
  }, [commanders]);

  const cardFuse = useMemo(() => {
    return new Fuse(allCardNames, {
      threshold: 0.3,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [allCardNames]);

  const filteredCommanders = useMemo(() => {
    const trimmedSearch = commanderSearch.trim();
    if (!trimmedSearch) {
      return commanders.slice(0, 200); // Limit initial list size
    }
    const searchTerms = trimmedSearch.split(/\s+/).filter(Boolean);
    if (searchTerms.length === 0) {
        return commanders.slice(0, 200);
    }
    
    const fuseQuery = {
        $and: searchTerms.map(term => ({ name: term }))
    };

    return commanderFuse.search(fuseQuery).map(result => result.item);
  }, [commanders, commanderSearch, commanderFuse]);

  useEffect(() => {
    const trimmedQuery = cardName.trim();
    const trimmedQueryLower = trimmedQuery.toLowerCase();

    // Hide if input is an exact match or too short
    if (allCardNamesSet.has(trimmedQueryLower) || trimmedQuery.length < 2) {
        setShowCardList(false);
        setFilteredCardNames([]);
        return;
    }

    // Otherwise, search and show if results exist
    const results = cardFuse.search(trimmedQuery).slice(0, 10).map(r => r.item);
    
    setFilteredCardNames(results);
    setShowCardList(results.length > 0);
    setHighlightedCardIndex(-1);
  }, [cardName, cardFuse, allCardNamesSet]);


  useEffect(() => {
    const trimmedSearchLower = commanderSearch.trim().toLowerCase();

    if (commanderNamesSet.has(trimmedSearchLower)) {
        setShowCommanderList(false);
    }
    
    setHighlightedIndex(-1);
  }, [commanderSearch, commanderNamesSet, filteredCommanders]);
  
  useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
        const item = listboxRef.current.children[highlightedIndex] as HTMLLIElement;
        if (item) {
            item.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [highlightedIndex]);
  
  useEffect(() => {
    if (highlightedCardIndex >= 0 && cardListboxRef.current) {
        const item = cardListboxRef.current.children[highlightedCardIndex] as HTMLLIElement;
        if (item) {
            item.scrollIntoView({ block: 'nearest' });
        }
    }
  }, [highlightedCardIndex]);


  const handleCommanderKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Show list on keydown, unless it's an exact match (handled by useEffect)
    if (!showCommanderList && e.key !== 'Enter' && e.key !== 'Escape') {
      setShowCommanderList(true);
    }
    if (filteredCommanders.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % filteredCommanders.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 + filteredCommanders.length) % filteredCommanders.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) {
        handleSelectCommander(filteredCommanders[highlightedIndex].name);
      }
    } else if (e.key === 'Escape') {
      setShowCommanderList(false);
    }
  };

  const handleCardInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleAnalyzeCard();
        return;
    }
    
    // Show list on keydown, unless it's an exact match (handled by useEffect)
    if (!showCardList && e.key !== 'Enter' && e.key !== 'Escape') {
      setShowCardList(true);
    }

    if (filteredCardNames.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCardIndex(prev => (prev + 1) % filteredCardNames.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCardIndex(prev => (prev - 1 + filteredCardNames.length) % filteredCardNames.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedCardIndex >= 0) {
        handleSelectCard(filteredCardNames[highlightedCardIndex]);
      } else {
        handleAnalyzeCard();
      }
    } else if (e.key === 'Escape') {
      setShowCardList(false);
    }
  };

  const handleSelectCommander = (commanderName: string) => {
    setSelectedCommander(commanderName);
    setCommanderSearch(commanderName);
    setHighlightedIndex(-1);
    setShowCommanderList(false);
  };
  
  const handleSelectCard = (selectedCard: string) => {
    setCardName(selectedCard);
    setHighlightedCardIndex(-1);
    setShowCardList(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowCommanderList(false);
      }
      if (cardInputRef.current && !cardInputRef.current.contains(event.target as Node)) {
        setShowCardList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const timePeriodKey = Object.keys(TIME_PERIOD_OPTIONS).find(key => TIME_PERIOD_OPTIONS[key] === timePeriod) || 'Post Ban';
  
  const inputBaseClasses = "mt-1 block w-full pl-3 pr-4 py-2 text-base sm:text-sm rounded-md shadow-sm transition duration-150 ease-in-out bg-ui-surface text-ui-text-primary border border-ui-border focus:ring-2 focus:ring-brand-gold focus:border-brand-gold focus:outline-none placeholder:text-ui-text-muted";
  const selectClasses = "mt-1 block w-full pl-3 pr-10 py-2 text-base sm:text-sm rounded-md shadow-sm transition duration-150 ease-in-out bg-ui-surface text-ui-text-primary border border-ui-border focus:ring-2 focus:ring-brand-gold focus:border-brand-gold focus:outline-none";
  const buttonBaseClasses = "w-full flex justify-center items-center gap-2 py-2.5 px-4 border rounded-md shadow-sm text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-charcoal disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-105";

  return (
    <aside className="w-full md:w-80 lg:w-96 bg-ui-surface p-6 flex-shrink-0 h-full overflow-y-auto border-r border-ui-border">
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-brand-charcoal p-2 rounded-lg border border-ui-border">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
             </svg>
        </div>
        <h2 className="text-2xl font-bold font-heading text-ui-text-primary">cEDH Data</h2>
      </div>
      
      <div className="space-y-6">
        
        <div className="space-y-4 p-4 bg-ui-surface-elevated/50 rounded-xl border border-ui-border">
          <h3 className="text-lg font-semibold font-heading text-ui-text-primary border-b border-ui-border pb-2 mb-4">General Settings</h3>
          <div>
            <label htmlFor="time-period" className="block text-sm font-medium text-ui-text-secondary">Time Period</label>
            <select id="time-period" value={timePeriodKey} onChange={(e) => onTimePeriodChange(TIME_PERIOD_OPTIONS[e.target.value])} className={selectClasses}>
              {Object.keys(TIME_PERIOD_OPTIONS).map((key) => <option key={key} value={key}>{key}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="standing-limit" className="block text-sm font-medium text-ui-text-secondary">Standing Limit (Top X)</label>
            <select id="standing-limit" value={standingLimit} onChange={(e) => setStandingLimit(Number(e.target.value))} className={selectClasses}>
              {STANDING_LIMIT_OPTIONS.map(limit => <option key={limit} value={limit}>{limit}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2 p-4 bg-ui-surface-elevated/50 rounded-xl border border-ui-border">
          <h3 className="text-lg font-semibold font-heading text-ui-text-primary border-b border-ui-border pb-2 mb-4">Commander Selection</h3>
          <div className="relative" ref={searchInputRef}>
            <input
              type="text"
              placeholder="Search for commander, e.g. Tymna Kraum"
              value={commanderSearch}
              onChange={e => setCommanderSearch(e.target.value)}
              onKeyDown={handleCommanderKeyDown}
              onFocus={() => {
                if (!commanderNamesSet.has(commanderSearch.trim().toLowerCase())) {
                  setShowCommanderList(true);
                }
              }}
              className={inputBaseClasses}
              aria-autocomplete="list"
              aria-controls="commander-listbox"
            />
            {showCommanderList && (
            <ul
              id="commander-listbox"
              ref={listboxRef}
              role="listbox"
              aria-activedescendant={highlightedIndex >= 0 ? `commander-option-${highlightedIndex}` : undefined}
              className="absolute mt-1 w-full bg-ui-surface-elevated border border-ui-border rounded-md shadow-lg max-h-60 overflow-y-auto z-10"
            >
              {isLoading && commanders.length === 0 ? (
                <li className="px-3 py-2 text-ui-text-muted">Loading commanders...</li>
              ) : filteredCommanders.length === 0 && commanderSearch ? (
                <li className="px-3 py-2 text-ui-text-muted">No matches found.</li>
              ) : (
                filteredCommanders.map((c, index) => (
                  <li
                    key={c.id}
                    id={`commander-option-${index}`}
                    role="option"
                    aria-selected={c.name === selectedCommander}
                    onClick={() => handleSelectCommander(c.name)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`px-3 py-2 cursor-pointer text-sm transition-colors duration-150 ${
                      index === highlightedIndex ? 'bg-brand-gold text-brand-obsidian' :
                      'text-ui-text-primary hover:bg-brand-charcoal'
                    }`}
                  >
                    {c.name}
                  </li>
                ))
              )}
            </ul>
            )}
          </div>
          {selectedCommander && <p className="text-sm text-brand-gold font-medium mt-2">Selected: {selectedCommander}</p>}
        </div>

        <div className="space-y-6">
            <div className="p-4 bg-ui-surface-elevated/50 rounded-xl border border-ui-border space-y-4">
                <h3 className="text-base font-semibold font-heading text-ui-text-primary">Single Card Analysis</h3>
                <div className="relative" ref={cardInputRef}>
                  <label htmlFor="card-name" className="block text-sm font-medium text-ui-text-secondary">Card to Analyze</label>
                  <input 
                    type="text"
                    id="card-name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    onKeyDown={handleCardInputKeyDown}
                    onFocus={() => {
                      if (!allCardNamesSet.has(cardName.trim().toLowerCase()) && cardName.trim().length > 1) {
                        setShowCardList(true);
                      }
                    }}
                    placeholder="e.g., Sol Ring (Ctrl+Enter)"
                    className={inputBaseClasses}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-controls="card-listbox"
                   />
                   {showCardList && filteredCardNames.length > 0 && (
                     <ul
                        id="card-listbox"
                        ref={cardListboxRef}
                        role="listbox"
                        aria-activedescendant={highlightedCardIndex >= 0 ? `card-option-${highlightedCardIndex}` : undefined}
                        className="absolute mt-1 w-full bg-ui-surface-elevated border border-ui-border rounded-md shadow-lg max-h-60 overflow-y-auto z-10"
                      >
                       {filteredCardNames.map((name, index) => (
                          <li
                            key={name}
                            id={`card-option-${index}`}
                            role="option"
                            aria-selected={index === highlightedCardIndex}
                            onClick={() => handleSelectCard(name)}
                            onMouseEnter={() => setHighlightedCardIndex(index)}
                            className={`px-3 py-2 cursor-pointer text-sm transition-colors duration-150 ${
                              index === highlightedCardIndex ? 'bg-brand-gold text-brand-obsidian' :
                              'text-ui-text-primary hover:bg-brand-charcoal'
                            }`}
                          >
                            {name}
                          </li>
                       ))}
                      </ul>
                   )}
                </div>
                <button onClick={handleAnalyzeCard} disabled={!selectedCommander || !cardName || isLoading} className={`${buttonBaseClasses} text-brand-obsidian bg-brand-gold hover:bg-brand-amber border-transparent focus:ring-brand-gold`}>
                    {isLoading ? 'Analyzing...' : 'Analyze Card'}
                </button>
            </div>

            <div className="p-4 bg-ui-surface-elevated/50 rounded-xl border border-ui-border space-y-4">
                <h3 className="text-base font-semibold font-heading text-ui-text-primary">Commander-Wide Analysis</h3>
                <div>
                  <label htmlFor="min-inclusion" className="block text-sm font-medium text-ui-text-secondary">Min. Card Inclusion %</label>
                  <select id="min-inclusion" value={minInclusion} onChange={(e) => setMinInclusion(Number(e.target.value))} className={selectClasses}>
                    {MIN_INCLUSION_PERC_OPTIONS.map(perc => <option key={perc} value={perc}>{perc.toFixed(1)}%</option>)}
                  </select>
                </div>
                <div>
                    <label htmlFor="top-n-cards" className="block text-sm font-medium text-ui-text-secondary mb-2"># of Top Cards to Plot: {topNCards}</label>
                    <input
                        id="top-n-cards"
                        type="range"
                        min="5"
                        max="200"
                        step="5"
                        value={topNCards}
                        onChange={e => setTopNCards(Number(e.target.value))}
                        className="w-full h-2 bg-brand-charcoal rounded-lg appearance-none cursor-pointer accent-brand-gold"
                    />
                </div>
                <button onClick={handleAnalyzeCommander} disabled={!selectedCommander || isLoading} className={`${buttonBaseClasses} text-brand-gold bg-transparent border-brand-gold hover:bg-brand-gold hover:text-brand-obsidian focus:ring-brand-gold`}>
                    {isLoading ? 'Analyzing...' : 'Analyze Commander'}
                </button>
            </div>
        </div>
        
        <div className="border-t border-ui-border pt-6">
            <button onClick={onSaveReport} disabled={!hasAnalysis || isLoading} className={`${buttonBaseClasses} text-ui-text-secondary bg-ui-surface-elevated border-ui-border hover:bg-brand-charcoal hover:text-ui-text-primary focus:ring-brand-gold`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Save Analysis as HTML
            </button>
        </div>

        <div className="border-t border-ui-border pt-6 mt-2 text-center text-xs text-ui-text-muted">
          <p>Data from edhtop16.com.</p>
          <p>
            Created by{" "}
            <a
              href="https://github.com/VictorJulianiR"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold hover:underline"
            >
              Victor Juliani
            </a>
            .
          </p>

          <div className="text-center my-4">
            <a
              href="https://www.paypal.com/donate/?hosted_button_id=69S697PCL4378"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Donate with PayPal"
              className="inline-block px-4 py-2 bg-brand-amber text-brand-obsidian rounded-md font-semibold text-sm hover:bg-brand-gold transition-colors"
            >
              Support the Project
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;