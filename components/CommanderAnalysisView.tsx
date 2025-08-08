import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CommanderAnalysisResult, CardStat, ChiSquaredResult } from '../types';
import CardImage from './CardImage';
import CardImagePreview from './CardImagePreview';

const sectionClasses = "bg-ui-surface-elevated/50 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-lg ring-1 ring-black/20 border border-ui-border";

interface CommanderAnalysisViewProps {
  result: CommanderAnalysisResult;
  imageCache: Map<string, string | null>;
}

const StatSigPill: React.FC<{ csResult: ChiSquaredResult }> = ({ csResult }) => {
  if (csResult.pValue === null) {
    return <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-ui-text-muted/20 text-ui-text-secondary" title={csResult.text}>N/A</span>;
  }

  const isSignificant = csResult.isStatisticallySignificant;
  const pValueText = `p=${csResult.pValue.toFixed(4)}`;
  const title = csResult.warning ? `${pValueText} (${csResult.warning})` : pValueText;
  
  const pillClass = isSignificant
    ? 'bg-status-success/30 text-[var(--color-status-success-text)]'
    : 'bg-status-warning/30 text-[var(--color-status-warning-text)]';
  
  const text = isSignificant ? 'Yes' : 'No';
  
  return (
    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${pillClass}`} title={title}>
      {text}
    </span>
  );
};

const TrendPill: React.FC<{ winRateDiff: number }> = ({ winRateDiff }) => {
    let className = 'bg-ui-text-muted/20 text-ui-text-secondary';
    let text = '⬌ Similar';

    if (winRateDiff > 0.5) { 
        className = 'bg-status-success/30 text-[var(--color-status-success-text)]';
        text = '▲ Higher';
    } else if (winRateDiff < -0.5) {
        className = 'bg-status-error/30 text-[var(--color-status-error-text)]';
        text = '▼ Lower';
    }
    
    return (
        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${className}`}>
          {text}
        </span>
    );
}

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2.5 bg-ui-surface/80 backdrop-blur-md rounded-lg shadow-lg border border-ui-border text-ui-text-primary">
        {label && <p className="label font-bold mb-1">{`${label}`}</p>}
        {payload.map((pld: any, index: number) => (
          <p key={index} style={{ color: pld.fill || pld.color }} className="text-sm font-medium">
            {`${pld.name}: ${formatter ? formatter(pld.value, pld.name) : pld.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};


const CommanderAnalysisView: React.FC<CommanderAnalysisViewProps> = ({ result, imageCache }) => {
  type SortableKeys = keyof CardStat | 'statSig' | 'trend';
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'winRateIgnoringDraws', direction: 'descending' });
  const [showOnlySignificant, setShowOnlySignificant] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<{ name: string; position: { x: number, y: number } } | null>(null);
  const [visibleRows, setVisibleRows] = useState(50);

  const sortedCards = useMemo(() => {
    let sortableItems = [...result.cardStats];
    
    if (showOnlySignificant) {
        sortableItems = sortableItems.filter(card => card.statSig.isStatisticallySignificant);
    }

    sortableItems.sort((a, b) => {
        let aVal: any, bVal: any;

        if (sortConfig.key === 'statSig') {
          // lower p-value is "better", nulls go last
          aVal = a.statSig.pValue ?? 2;
          bVal = b.statSig.pValue ?? 2;
        } else if (sortConfig.key === 'trend') {
            aVal = a.winRateOverall - (result.overallMetrics.winRateOverall * 100);
            bVal = b.winRateOverall - (result.overallMetrics.winRateOverall * 100);
        } else {
          aVal = a[sortConfig.key as keyof CardStat];
          bVal = b[sortConfig.key as keyof CardStat];
        }
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
             return sortConfig.direction === 'ascending' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }

        if (typeof aVal === 'number' && typeof bVal === 'number') {
            if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    return sortableItems;
  }, [result.cardStats, result.overallMetrics, sortConfig, showOnlySignificant]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'descending';
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    if (key === 'statSig' && sortConfig.key !== 'statSig') {
        direction = 'ascending';
    } else if (key === 'statSig' && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    if (key === 'trend' && sortConfig.key !== 'trend') {
        direction = 'descending';
    } else if (key === 'trend' && sortConfig.direction === 'descending') {
        direction = 'ascending';
    }

    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortableKeys) => {
    if (sortConfig.key !== key) return <span className="text-ui-text-muted/50 group-hover:text-ui-text-muted">◆</span>;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const tableHeaders: { key: SortableKeys | null, label: string, className?: string }[] = [
      { key: 'cardName', label: 'Card Name', className: 'text-left' },
      { key: 'inclusionPercentage', label: 'Inclusion', className: 'text-right' },
      { key: 'winRateIgnoringDraws', label: 'WR (W+L)', className: 'text-right' },
      { key: 'winRateOverall', label: 'WR (Overall)', className: 'text-right' },
      { key: 'trend', label: 'Trend' },
      { key: 'statSig', label: 'Stat. Sig.' },
      { key: 'statSig', label: 'p-value', className: 'text-right' },
      { key: null, label: 'Record (W-L-D)' },
      { key: 'totalGamesWithCard', label: 'Total Games', className: 'text-right' },
  ];

  const topCardsByWR = useMemo(() => {
        return [...result.cardStats]
            .filter(c => c.decksWithGames > 0 && c.inclusionPercentage >= result.minInclusionPercentage)
            .sort((a, b) => b.winRateIgnoringDraws - a.winRateIgnoringDraws)
            .slice(0, result.topNCardsToPlot)
            .sort((a,b) => a.winRateIgnoringDraws - b.winRateIgnoringDraws);
    }, [result.cardStats, result.topNCardsToPlot, result.minInclusionPercentage]);

    const topCardsByOverallWR = useMemo(() => {
        return [...result.cardStats]
            .filter(c => c.decksWithGames > 0 && c.inclusionPercentage >= result.minInclusionPercentage)
            .sort((a, b) => b.winRateOverall - a.winRateOverall)
            .slice(0, result.topNCardsToPlot)
            .sort((a,b) => a.winRateOverall - b.winRateOverall);
    }, [result.cardStats, result.topNCardsToPlot, result.minInclusionPercentage]);

  const handleMouseMove = (event: React.MouseEvent, cardName: string) => {
    setHoveredCard({ name: cardName, position: { x: event.clientX, y: event.clientY } });
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {hoveredCard && createPortal(
          <CardImagePreview 
              name={hoveredCard.name}
              imageUrl={imageCache.get(hoveredCard.name)}
              position={hoveredCard.position}
          />,
          document.body
      )}
      <header className="pb-4 border-b border-ui-border">
        <h2 className="text-3xl font-bold font-heading text-ui-text-primary">Commander-Wide Analysis</h2>
        <p className="text-md text-ui-text-secondary">
          Commander: <span className="font-semibold text-brand-gold">{result.commanderName}</span>
        </p>
      </header>
      
      <div className="flex flex-wrap justify-center gap-6">
        {result.commanderImageUrls.map((url, index) => (
          <CardImage key={index} src={url} alt={result.commanderName.split(' // ')[index] || result.commanderName} label={index === 0 ? "Commander" : "Partner"} />
        ))}
      </div>

      <div className={sectionClasses}>
        <h3 className="text-xl font-semibold font-heading mb-2 text-ui-text-primary">Analysis Summary</h3>
        <p className="text-sm text-ui-text-secondary">
          Analyzed <span className="font-bold text-ui-text-primary">{result.totalEntries}</span> decks. 
          Found <span className="font-bold text-ui-text-primary">{result.cardStats.length}</span> cards with at least <span className="font-bold text-ui-text-primary">{result.minInclusionPercentage}%</span> inclusion.
          {showOnlySignificant ? ` Showing ${sortedCards.length} statistically significant cards.` : ''}
        </p>
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="show-only-significant"
              checked={showOnlySignificant}
              onChange={(e) => setShowOnlySignificant(e.target.checked)}
              className="h-4 w-4 rounded border-ui-border text-brand-gold focus:ring-brand-gold bg-ui-surface accent-brand-gold"
            />
            <label htmlFor="show-only-significant" className="text-sm font-medium text-ui-text-secondary select-none">
              Show only statistically significant cards
            </label>
          </div>
        </div>
      </div>

      <div className={sectionClasses}>
        <div className="overflow-x-auto">
            <table className="min-w-full">
            <thead>
                <tr>
                {tableHeaders.map(({ key, label, className }) => (
                    <th key={label} scope="col" 
                        className={`px-4 py-3 text-xs font-medium text-ui-text-secondary uppercase tracking-wider border-b-2 border-ui-border ${key ? 'cursor-pointer group' : ''} ${className || 'text-center'}`}
                        onClick={key ? () => requestSort(key) : undefined}>
                        <div className={`flex items-center gap-1.5 ${className?.includes('left') ? 'justify-start' : className?.includes('right') ? 'justify-end' : 'justify-center'}`}>
                          <span>{label}</span>
                          {key && getSortIndicator(key)}
                        </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody className="bg-ui-surface/30">
                {sortedCards.slice(0, visibleRows).map((card) => {
                  const winRateDiff = card.winRateOverall - (result.overallMetrics.winRateOverall * 100);
                  return (
                    <tr key={card.cardName} 
                        className="hover:bg-brand-charcoal/50 transition-colors duration-150"
                        onMouseMove={(e) => handleMouseMove(e, card.cardName)}
                        onMouseLeave={handleMouseLeave}
                    >
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-ui-text-primary border-b border-ui-border">{card.cardName}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary text-right border-b border-ui-border">
                          <div>{card.inclusionPercentage.toFixed(2)}%</div>
                          <div className="text-xs text-ui-text-muted">({card.inclusionCount} decks)</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary font-mono text-right border-b border-ui-border">{card.winRateIgnoringDraws.toFixed(2)}%</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary font-mono text-right border-b border-ui-border">{card.winRateOverall.toFixed(2)}%</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary text-center border-b border-ui-border"><TrendPill winRateDiff={winRateDiff} /></td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary text-center border-b border-ui-border">
                          <StatSigPill csResult={card.statSig} />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary font-mono text-right border-b border-ui-border">
                          {card.statSig.pValue !== null ? card.statSig.pValue.toFixed(6) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary font-mono text-center border-b border-ui-border">{`${card.wins}-${card.losses}-${card.draws}`}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-ui-text-secondary font-mono text-right border-b border-ui-border">{card.totalGamesWithCard}</td>
                    </tr>
                  );
                })}
            </tbody>
            </table>
        </div>
         {sortedCards.length > visibleRows && (
            <div className="mt-6 text-center">
                <button 
                    onClick={() => setVisibleRows(prev => prev + 100)} 
                    className="py-2.5 px-4 border rounded-md shadow-sm text-sm font-semibold transition-all duration-300 ease-in-out transform hover:scale-105 text-brand-gold bg-transparent border-brand-gold hover:bg-brand-gold hover:text-brand-obsidian focus:ring-brand-gold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-charcoal"
                >
                    Show More ({sortedCards.length - visibleRows} remaining)
                </button>
            </div>
        )}
      </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            {topCardsByWR.length > 0 && (
                <div className={sectionClasses}>
                    <h3 className="text-xl font-semibold font-heading text-center mb-4 text-ui-text-primary">Top Cards by Win Rate (W+L)</h3>
                    <ResponsiveContainer width="100%" height={Math.max(200, topCardsByWR.length * 35)}>
                        <BarChart data={topCardsByWR} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid stroke="var(--color-ui-border)" strokeOpacity={0.5} />
                            <XAxis type="number" unit="%" domain={[0, 'dataMax + 5']} tick={{fill: 'var(--color-ui-text-secondary)'}} />
                            <YAxis type="category" dataKey="cardName" width={120} tick={{ fontSize: 12, fill: 'var(--color-ui-text-secondary)' }} interval={0}/>
                            <Tooltip content={<CustomTooltip formatter={(value: number) => `${value.toFixed(2)}%`}/>} />
                            <Legend wrapperStyle={{color: 'var(--color-ui-text-secondary)'}}/>
                            <Bar dataKey="winRateIgnoringDraws" name="Win Rate (W+L)" fill="#C4A66B" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            {topCardsByOverallWR.length > 0 && (
                 <div className={sectionClasses}>
                    <h3 className="text-xl font-semibold font-heading text-center mb-4 text-ui-text-primary">Top Cards by Win Rate (Overall)</h3>
                     <ResponsiveContainer width="100%" height={Math.max(200, topCardsByOverallWR.length * 35)}>
                         <BarChart data={topCardsByOverallWR} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                            <CartesianGrid stroke="var(--color-ui-border)" strokeOpacity={0.5} />
                            <XAxis type="number" unit="%" domain={[0, 'dataMax + 5']} tick={{fill: 'var(--color-ui-text-secondary)'}} />
                            <YAxis type="category" dataKey="cardName" width={120} tick={{ fontSize: 12, fill: 'var(--color-ui-text-secondary)' }} interval={0}/>
                            <Tooltip content={<CustomTooltip formatter={(value: number) => `${value.toFixed(2)}%`}/>} />
                            <Legend wrapperStyle={{color: 'var(--color-ui-text-secondary)'}} />
                            <Bar dataKey="winRateOverall" name="Win Rate (Overall)" fill="#3A4A6B" />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
            )}
        </div>
    </div>
  );
};

export default CommanderAnalysisView;