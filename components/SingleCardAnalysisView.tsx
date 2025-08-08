import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SingleCardAnalysisResult, ChiSquaredResult, PerformanceMetrics } from '../types';
import CardImage from './CardImage';

const sectionClasses = "bg-ui-surface-elevated/50 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-lg ring-1 ring-black/20 border border-ui-border";

interface SingleCardAnalysisViewProps {
  result: SingleCardAnalysisResult;
}

const SignificancePill: React.FC<{ csResult: ChiSquaredResult }> = ({ csResult }) => {
  let className = 'bg-ui-text-muted/20 text-ui-text-secondary';
  let text = 'No Data';
  let title = csResult.text;

  if (csResult.pValue === null) {
    className = 'bg-ui-text-muted/20 text-ui-text-secondary';
    text = 'No Data';
  } else if (csResult.isStatisticallySignificant) {
    className = 'bg-status-success/30 text-[var(--color-status-success-text)]';
    text = 'Significant';
    title = `p=${csResult.pValue.toFixed(4)}`;
  } else {
    className = 'bg-status-warning/30 text-[var(--color-status-warning-text)]';
    text = 'Not Significant';
     title = `p=${csResult.pValue.toFixed(4)}`;
  }
  if (csResult.warning) title += ` (${csResult.warning})`;

  return (
    <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${className}`} title={title}>
      {text}
    </div>
  );
};

const TrendPill: React.FC<{ winRateDiff: number }> = ({ winRateDiff }) => {
    let className = 'bg-ui-text-muted/20 text-ui-text-secondary';
    let text = '⬌ Similar';

    // winRateDiff is in percentage points, e.g., 5.23 for 5.23%
    if (winRateDiff > 0.5) { 
        className = 'bg-status-success/30 text-[var(--color-status-success-text)]';
        text = '▲ Higher';
    } else if (winRateDiff < -0.5) {
        className = 'bg-status-error/30 text-[var(--color-status-error-text)]';
        text = '▼ Lower';
    }
    
    return (
        <div className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>
          {text}
        </div>
    );
};

const SummaryStatCard: React.FC<{
  title: string;
  metricsWithCard: PerformanceMetrics;
  metricsWithoutCard: PerformanceMetrics;
  csResult: ChiSquaredResult;
  winRateDiff: number;
  metric: 'winRateIgnoringDraws' | 'winRateOverall';
}> = ({ title, metricsWithCard, metricsWithoutCard, csResult, winRateDiff, metric }) => {
  const diffText = `${winRateDiff >= 0 ? '+' : ''}${winRateDiff.toFixed(2)}%`;
  let diffColorClass = 'text-ui-text-primary';
  if (winRateDiff > 0.5) diffColorClass = 'text-[var(--color-status-success-text)]';
  if (winRateDiff < -0.5) diffColorClass = 'text-[var(--color-status-error-text)]';

  return (
    <div className="bg-ui-surface/50 p-4 rounded-xl text-center backdrop-blur-sm border border-ui-border flex flex-col justify-between">
        <div>
            <h4 className="font-bold text-ui-text-primary mb-3">{title}</h4>
            <div className="flex flex-col lg:flex-row justify-around items-center text-center gap-3 lg:gap-2">
                <div className="px-2">
                    <p className="text-xs text-ui-text-muted">With Card</p>
                    <p className="text-xl lg:text-2xl font-bold font-mono text-brand-gold">
                        {(metricsWithCard[metric] * 100).toFixed(2)}%
                    </p>
                </div>
                <div className="px-2">
                    <p className="text-xs text-ui-text-muted">Change</p>
                    <p className={`text-xl lg:text-2xl font-bold font-mono ${diffColorClass}`}>
                        {diffText}
                    </p>
                </div>
                <div className="px-2">
                    <p className="text-xs text-ui-text-muted">Without Card</p>
                    <p className="text-xl lg:text-2xl font-bold font-mono text-brand-amber">
                         {(metricsWithoutCard[metric] * 100).toFixed(2)}%
                    </p>
                </div>
            </div>
        </div>
        <div className="mt-4 flex justify-center items-center gap-2">
            <TrendPill winRateDiff={winRateDiff} />
            <SignificancePill csResult={csResult} />
        </div>
    </div>
  );
};

const AtAGlance: React.FC<{result: SingleCardAnalysisResult}> = ({ result }) => {
    return (
        <div className={sectionClasses}>
            <h3 className="text-xl font-semibold font-heading mb-4 text-ui-text-primary text-center">At a Glance Comparison</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <SummaryStatCard 
                  title="Win Rate (W+L)"
                  metricsWithCard={result.metricsWithCard}
                  metricsWithoutCard={result.metricsWithoutCard}
                  csResult={result.chiSquaredIgnoringDraws}
                  winRateDiff={result.winRateDiffIgnoringDraws}
                  metric="winRateIgnoringDraws"
                />
                <SummaryStatCard 
                  title="Overall Win Rate (W+L+D)"
                  metricsWithCard={result.metricsWithCard}
                  metricsWithoutCard={result.metricsWithoutCard}
                  csResult={result.chiSquaredOverall}
                  winRateDiff={result.winRateDiffOverall}
                  metric="winRateOverall"
                />
            </div>
        </div>
    );
}

const InterpretationCard: React.FC<{ title: string; winRateDiff: number; csResult: ChiSquaredResult; }> = ({ title, winRateDiff, csResult }) => {
    let bgClass = 'bg-ui-surface/50 border-ui-border';
    let mainText = '';
    let significanceText = '';
    let significanceClass = '';
    let Icon: React.ReactNode;

    if (winRateDiff > 0.01) {
        bgClass = 'bg-status-success/10 border-status-success/30';
        Icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-status-success" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
    } else if (winRateDiff < -0.01) {
        bgClass = 'bg-status-error/10 border-status-error/30';
        Icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-status-error" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
    } else {
        Icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ui-text-muted" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>;
    }

    if (csResult.pValue === null) {
        mainText = `Insufficient data to perform a comparison.`;
        significanceText = `(${csResult.text})`;
        significanceClass = 'font-semibold text-status-warning-text';
    } else {
        const diffText = Math.abs(winRateDiff).toFixed(2);
        const pValueDisplay = `(p=${csResult.pValue.toFixed(4)}${csResult.warning ? ', low E.F.' : ''})`;

        if (winRateDiff > 0.01) {
            mainText = `Associated with a ${diffText}% higher win rate.`;
        } else if (winRateDiff < -0.01) {
            mainText = `Associated with a ${diffText}% lower win rate.`;
        } else {
            mainText = `No notable win rate difference observed.`;
        }
        
        if (csResult.isStatisticallySignificant) {
            significanceText = `This is statistically significant. ${pValueDisplay}`;
            significanceClass = 'font-bold text-[var(--color-status-success-text)]';
        } else {
            significanceText = `This is not statistically significant. ${pValueDisplay}`;
            significanceClass = 'font-bold text-[var(--color-status-warning-text)]';
        }
    }

    return (
        <div className={`p-4 rounded-lg flex items-start gap-4 border ${bgClass}`}>
            <div className="flex-shrink-0 mt-0.5">{Icon}</div>
            <div>
                <h4 className="text-md font-semibold text-ui-text-primary mb-1">{title}</h4>
                <p className="text-ui-text-secondary">{mainText}</p>
                <p className={`text-sm mt-1 ${significanceClass}`}>{significanceText}</p>
            </div>
        </div>
    );
};

const StatsTable: React.FC<{ title: string, metrics: PerformanceMetrics, chiSquared?: ChiSquaredResult }> = ({title, metrics, chiSquared}) => (
  <div>
      <h4 className="text-lg font-semibold font-heading text-ui-text-primary mb-2">{title}</h4>
      <table className="w-full text-sm">
          <tbody>
              <tr className="border-b border-ui-border"><td className="py-1 pr-2 text-ui-text-secondary">Decks with Games:</td><td className="font-mono text-right text-ui-text-primary">{metrics.deckCountWithGames.toLocaleString()}</td></tr>
              <tr className="border-b border-ui-border"><td className="py-1 pr-2 text-ui-text-secondary">Record (W-L-D):</td><td className="font-mono text-right text-ui-text-primary">{metrics.wins}-{metrics.losses}-{metrics.draws}</td></tr>
              <tr className="border-b border-ui-border"><td className="py-1 pr-2 text-ui-text-secondary">Win Rate (W+L):</td><td className="font-mono text-right text-ui-text-primary">{(metrics.winRateIgnoringDraws * 100).toFixed(2)}%</td></tr>
              <tr className="border-b border-ui-border"><td className="py-1 pr-2 text-ui-text-secondary">Win Rate (Overall):</td><td className="font-mono text-right text-ui-text-primary">{(metrics.winRateOverall * 100).toFixed(2)}%</td></tr>
              {chiSquared && <tr className="border-b border-ui-border"><td className="py-1 pr-2 text-ui-text-secondary">p-value (Overall):</td><td className="font-mono text-right text-ui-text-primary">{chiSquared.pValue ? chiSquared.pValue.toFixed(4) : 'N/A'}</td></tr>}
          </tbody>
      </table>
  </div>
);

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

const SingleCardAnalysisView: React.FC<SingleCardAnalysisViewProps> = ({ result }) => {
  const pieData = [
    { name: `With '${result.cardName}'`, value: result.decksWithCardCount },
    { name: `Without '${result.cardName}'`, value: result.totalEntries - result.decksWithCardCount },
  ];
  const COLORS = ['#C4A66B', '#3A4A6B'];

  const winRateData = [
    { name: `With Card`, 'Win Rate (W+L)': result.metricsWithCard.winRateIgnoringDraws * 100, 'Overall (W+L+D)': result.metricsWithCard.winRateOverall * 100 },
    { name: `Without Card`, 'Win Rate (W+L)': result.metricsWithoutCard.winRateIgnoringDraws * 100, 'Overall (W+L+D)': result.metricsWithoutCard.winRateOverall * 100 },
  ];
  
  const partnerNames = result.commanderName.split(/\s*\/{2,3}\s*|\s*\/\s*/);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <header className="pb-4 border-b border-ui-border">
        <h2 className="text-3xl font-bold font-heading text-ui-text-primary">Single Card Analysis</h2>
        <p className="text-md text-ui-text-secondary">Commander: <span className="font-semibold text-brand-gold">{result.commanderName}</span></p>
        <p className="text-md text-ui-text-secondary">Card: <span className="font-semibold text-brand-amber">{result.cardName}</span></p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
        {result.commanderImageUrls.length > 0 ? (
          result.commanderImageUrls.map((url, index) => (
             <CardImage key={index} src={url} alt={partnerNames[index] || result.commanderName} label={index === 0 ? "Commander" : `Partner`} />
          ))
        ) : (
          <CardImage src={null} alt={result.commanderName} label="Commander" />
        )}
        <CardImage src={result.cardImageUrl} alt={result.cardName} label="Analyzed Card" />
      </div>
      
      <AtAGlance result={result} />

      <div className={sectionClasses}>
        <h3 className="text-xl font-semibold font-heading mb-4 text-ui-text-primary">Statistical Interpretation</h3>
        <p className="text-sm text-ui-text-secondary -mt-2 mb-4">
          Based on <strong>{result.totalEntries}</strong> decks (Top {result.standingLimit}s). Decks with '{result.cardName}': <strong>{result.decksWithCardCount}</strong> ({result.inclusionPercentage.toFixed(2)}%).
        </p>
        <div className="space-y-4">
          <InterpretationCard title="Based on Win Rate (W+L)" winRateDiff={result.winRateDiffIgnoringDraws} csResult={result.chiSquaredIgnoringDraws} />
          <InterpretationCard title="Based on Overall Win Rate (W+L+D)" winRateDiff={result.winRateDiffOverall} csResult={result.chiSquaredOverall} />
        </div>
      </div>

      <div className={sectionClasses}>
        <h3 className="text-xl font-semibold font-heading text-center mb-4 text-ui-text-primary">Detailed Statistical Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <StatsTable title={`With '${result.cardName}'`} metrics={result.metricsWithCard} chiSquared={result.chiSquaredOverall} />
            <StatsTable title={`Without '${result.cardName}'`} metrics={result.metricsWithoutCard} />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={sectionClasses}>
          <h3 className="text-xl font-semibold font-heading text-center mb-4 text-ui-text-primary">Card Inclusion Rate</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(1)}%`}>
                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip formatter={(value: number, name: string) => `${result.totalEntries > 0 ? (value).toLocaleString() : 0} decks (${(value / result.totalEntries * 100).toFixed(1)}%)`} />} />
              <Legend wrapperStyle={{color: 'var(--color-ui-text-secondary)'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={sectionClasses}>
          <h3 className="text-xl font-semibold font-heading text-center mb-4 text-ui-text-primary">Win Rate Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={winRateData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-ui-border)" strokeOpacity={0.5} />
              <XAxis dataKey="name" tick={{fill: 'var(--color-ui-text-secondary)'}} />
              <YAxis unit="%" domain={[0, 'dataMax + 10']} tick={{fill: 'var(--color-ui-text-secondary)'}} />
              <Tooltip content={<CustomTooltip formatter={(value: number) => `${value.toFixed(2)}%`}/>} />
              <Legend wrapperStyle={{color: 'var(--color-ui-text-secondary)'}}/>
              <Bar dataKey="Win Rate (W+L)" fill="#C4A66B" />
              <Bar dataKey="Overall (W+L+D)" fill="#3A4A6B" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {result.decklistLinksWithCard.length > 0 && (
        <div className={sectionClasses}>
            <h3 className="text-xl font-semibold font-heading mb-4 text-ui-text-primary">Decklists with '{result.cardName}'</h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {result.decklistLinksWithCard.map((link, i) => (
                    <li key={i}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-brand-gold hover:text-brand-amber hover:underline truncate block">
                            {link}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
};

export default SingleCardAnalysisView;