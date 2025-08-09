import { AnalysisResult, CommanderAnalysisResult, SingleCardAnalysisResult, ChiSquaredResult, PerformanceMetrics } from '../types';
import { TIME_PERIOD_OPTIONS } from '../constants';

function htmlEscape(str: string): string {
    if(!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&#039;');
}

const COMMON_STYLES = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Exo+2:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap');
    :root {
      --color-primary-obsidian: #050608;
      --color-primary-charcoal: #0F1118;
      --color-primary-slate: #1A1D28;
      --color-accent-gold: #C4A66B;
      --color-accent-amber: #B89660;
      --color-accent-copper: #8B6F47;
      --color-ui-background: #070810;
      --color-ui-surface: #0F1118;
      --color-ui-surface-elevated: #181B26;
      --color-ui-border: #252935;
      --color-ui-text-primary: #D1D3D8;
      --color-ui-text-secondary: #8A8F9A;
      --color-ui-text-muted: #5A6069;
      --color-status-success: #4A6B5A;
      --color-status-success-text: #a7f3d0;
      --color-status-warning: #8B6F3A;
      --color-status-warning-text: #fef08a;
      --color-status-error: #6B3A3A;
      --color-status-error-text: #fca5a5;
      --color-status-info: #3A4A6B;
    }
    body {
        font-family: 'Montserrat', sans-serif;
        margin: 0;
        line-height: 1.6;
        background-color: var(--color-ui-background);
        color: var(--color-ui-text-primary);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        background-image:
            radial-gradient(at 20% 20%, hsla(43, 45%, 59%, 0.1) 0px, transparent 50%),
            radial-gradient(at 80% 20%, hsla(40, 50%, 55%, 0.1) 0px, transparent 50%),
            radial-gradient(at 50% 80%, hsla(38, 56%, 44%, 0.1) 0px, transparent 50%);
    }
    .container { max-width: 1024px; margin: 2rem auto; padding: 1rem; }
    .header { text-align: center; margin-bottom: 2rem; }
    .header h1 { color: var(--color-ui-text-primary); margin: 0; font-size: 2.5em; font-weight: 800; font-family: 'Exo 2', sans-serif; }
    .header-subtitle { font-size: 1.1em; color: var(--color-ui-text-secondary); margin-top: 0.5rem;}
    
    .section {
        background: var(--color-ui-surface-elevated);
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        border: 1px solid var(--color-ui-border);
        margin-bottom: 24px;
    }
    .section-title { font-family: 'Exo 2', sans-serif; font-size: 1.5em; font-weight: 700; color: var(--color-ui-text-primary); margin-top:0; margin-bottom: 16px; border-bottom: 1px solid var(--color-ui-border); padding-bottom: 8px; }
    
    .image-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); justify-items: center; align-items: flex-start; gap: 2rem; }
    .card-container { text-align: center; }
    .card-flipper {
        position: relative;
        width: 100%;
        max-width: 240px;
        aspect-ratio: 5/7;
        transition: all 0.3s ease-in-out;
    }
    .card-container:hover .card-flipper { transform: scale(1.05) translateY(-8px); }
    .card-container img { width: 100%; border-radius: 12px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.5); }
    .card-container .card-label { font-size: 1em; margin-top: 0.75rem; font-weight: 600; color: var(--color-ui-text-primary); font-family: 'Exo 2', sans-serif;}
    .card-container .card-name { font-size: 0.9em; color: var(--color-ui-text-secondary); margin-top: 0.25rem; }

    footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--color-ui-border); font-size: 0.9em; color: var(--color-ui-text-muted); }
    .decklist-list { list-style-type: none; margin: 0; padding: 0; max-height: 300px; overflow-y: auto; }
    .decklist-list li a { color: var(--color-accent-gold); text-decoration: none; word-break: break-all;}
    .decklist-list li a:hover { text-decoration: underline; color: var(--color-accent-amber); }

    .dataframe-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .dataframe-table th, .dataframe-table td { padding: 12px 15px; text-align: left; border-bottom: 1px solid var(--color-ui-border); }
    .dataframe-table th { background-color: var(--color-primary-charcoal); color: var(--color-ui-text-secondary); font-weight: 600; text-transform: uppercase; font-size: 0.75em; letter-spacing: 0.05em; }
    .dataframe-table tbody tr:hover { background-color: rgba(37, 41, 53, 0.5); }
    .dataframe-table td, .dataframe-table th { font-family: 'Montserrat', sans-serif; }
    .dataframe-table .mono { font-family: 'JetBrains Mono', monospace; }

    .at-a-glance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
    .glance-card { background-color: var(--color-ui-surface); padding: 1.5rem; border-radius: 12px; text-align: center; border: 1px solid var(--color-ui-border); }
    .glance-card-title { font-size: 1.1em; font-weight: bold; margin-bottom: 12px; color: var(--color-ui-text-primary); }
    
    .glance-comparison-grid { display: flex; justify-content: space-around; align-items: center; margin-bottom: 12px; }
    .glance-comparison-item { padding: 0 10px; }
    .glance-comparison-item .label { font-size: 0.8em; color: var(--color-ui-text-muted); }
    .glance-comparison-item .value { font-size: 1.75rem; font-weight: bold; font-family: 'JetBrains Mono', monospace; }
    .glance-comparison-divider .value { font-size: 1.5rem; }
    
    .value-positive { color: var(--color-status-success-text); }
    .value-negative { color: var(--color-status-error-text); }

    .pills-container { display:flex; justify-content:center; gap: 8px; margin-top: 16px; }
    .pill { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; }
    .pill-sig-green { background-color: rgba(74, 107, 90, 0.3); color: var(--color-status-success-text); }
    .pill-sig-yellow { background-color: rgba(139, 111, 58, 0.3); color: var(--color-status-warning-text); }
    .pill-sig-red { background-color: rgba(107, 58, 58, 0.3); color: var(--color-status-error-text); }
    .pill-sig-gray { background-color: rgba(90, 96, 105, 0.3); color: var(--color-ui-text-muted); }

    .interpretation-card { display: flex; align-items: flex-start; gap: 16px; padding: 16px; border-radius: 8px; border: 1px solid; }
    .interpretation-card-icon { flex-shrink: 0; margin-top: 2px; }
    .interpretation-card-title { font-weight: 600; color: var(--color-ui-text-primary); margin-bottom: 4px; }
    .interpretation-card-text { color: var(--color-ui-text-secondary); margin: 0; }
    .interpretation-card-sig { font-size: 0.9em; margin-top: 4px; }
    .sig-text-green { color: var(--color-status-success-text); font-weight: bold; }
    .sig-text-yellow { color: var(--color-status-warning-text); font-weight: bold; }
    .interpretation-card-container { display: flex; flex-direction: column; gap: 16px; }

    .stats-breakdown-grid { display: grid; grid-template-columns: 1fr; gap: 24px; }
    @media (min-width: 768px) { .stats-breakdown-grid { grid-template-columns: 1fr 1fr; } }
    @media (max-width: 1023px) {
        .glance-comparison-grid {
            flex-direction: column;
            gap: 12px;
        }
        .glance-comparison-item .value {
            font-size: 1.5rem;
        }
    }
    .stats-table { width: 100%; font-size: 0.9em; }
    .stats-table td { padding: 4px 0; border-bottom: 1px solid var(--color-ui-border); }
    .stats-table tr:last-child td { border-bottom: none; }
    .stats-table td:first-child { color: var(--color-ui-text-secondary); }
    .stats-table td:last-child { text-align: right; font-family: 'JetBrains Mono', monospace; color: var(--color-ui-text-primary); }


    .donate-button { display: inline-block; background-color: var(--color-accent-amber); color: var(--color-primary-obsidian); padding: 8px 16px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0 10px; transition: background-color 0.2s; }
    .donate-button:hover { background-color: var(--color-accent-gold); }
</style>
`;

function getSignificancePillHtml(csResult: ChiSquaredResult): string {
    let className = 'pill-sig-gray';
    let text = 'No Data';
    let title = csResult.text ? htmlEscape(csResult.text) : 'No data for test';
    if(csResult.warning) title += ` (${csResult.warning})`

    if (csResult.pValue !== null) {
      if (csResult.isStatisticallySignificant) {
          className = 'pill-sig-green';
          text = 'Yes';
      } else {
          className = 'pill-sig-yellow';
          text = 'No';
      }
    }
    return `<div class="pill ${className}" title="${title}">${text}</div>`;
}


function getTrendPillHtml(winRateDiff: number): string {
    let className = 'pill-sig-gray';
    let text = '⬌ Similar';

    if (winRateDiff > 0.5) {
        className = 'pill-sig-green';
        text = '▲ Higher';
    } else if (winRateDiff < -0.5) {
        className = 'pill-sig-red';
        text = '▼ Lower';
    }

    return `<div class="pill ${className}" title="${winRateDiff.toFixed(2)}% vs avg">${text}</div>`;
}

function getInterpretationHtml(title: string, winRateDiff: number, csResult: ChiSquaredResult): string {
    let bgClass = 'border-color: var(--color-ui-border);';
    let mainText = '';
    let significanceText = '';
    let significanceClass = '';
    let iconSvg = '';

    if (winRateDiff > 0.01) {
        bgClass = 'background-color: rgba(74, 107, 90, 0.1); border-color: rgba(74, 107, 90, 0.3);';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" fill="var(--color-status-success)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>`;
    } else if (winRateDiff < -0.01) {
        bgClass = 'background-color: rgba(107, 58, 58, 0.1); border-color: rgba(107, 58, 58, 0.3);';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" fill="var(--color-status-error)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>`;
    } else {
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" fill="var(--color-ui-text-muted)"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd" /></svg>`;
    }

    if (csResult.pValue === null) {
        mainText = 'Insufficient data to perform a comparison.';
        significanceText = `(${csResult.text})`;
        significanceClass = 'sig-text-yellow';
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
            significanceClass = 'sig-text-green';
        } else {
            significanceText = `This is not statistically significant. ${pValueDisplay}`;
            significanceClass = 'sig-text-yellow';
        }
    }

    return `
        <div class="interpretation-card" style="${bgClass}">
            <div class="interpretation-card-icon">${iconSvg}</div>
            <div>
                <h4 class="interpretation-card-title">${htmlEscape(title)}</h4>
                <p class="interpretation-card-text">${htmlEscape(mainText)}</p>
                <p class="interpretation-card-sig ${significanceClass}">${htmlEscape(significanceText)}</p>
            </div>
        </div>
    `;
}

function getImageHtml(urls: (string | null)[], altText: string, label: string): string {
    if (!urls || urls.length === 0 || urls.every(u => !u)) {
        return `<div class="card-container"><div class="card-label">${htmlEscape(label)} image not found.</div><div class="card-name">${htmlEscape(altText)}</div></div>`;
    }

    const partnerNames = altText.split(/\s*\/{2,3}\s*|\s*\/\s*/).map(p => p.trim()).filter(Boolean);
    
    let imagesHtml = '';
    urls.forEach((url, i) => {
        if (!url) return;
        const individualAlt = htmlEscape(partnerNames[i] || `${altText} part ${i+1}`);
        const imageLabel = htmlEscape(label === 'Commander' && partnerNames.length > 1 ? (i === 0 ? 'Commander' : 'Partner') : label);
        imagesHtml += `
            <div class="card-container">
                <div class="card-flipper">
                    <img src="${url}" alt="${individualAlt}">
                </div>
                <div class="card-label">${imageLabel}</div>
                <div class="card-name">${individualAlt}</div>
            </div>
        `;
    });
    return imagesHtml;
}

function getFooterHtml(result: AnalysisResult, timePeriodDisplayName: string): string {
    const singleCardNote = `<p><small>Note: Statistical significance suggests the observed win rate difference is unlikely due to chance alone in this sample. It does not imply causation.</small></p>`;
    return `
     <footer>
        <div style="text-align: center;">
            <a href="https://www.paypal.com/donate/?hosted_button_id=69S697PCL4378" target="_blank" rel="noopener noreferrer" class="donate-button">Support the Project</a>
        </div>
        <p><small>Data sourced from edhtop16.com GraphQL API. Analysis includes decks up to Top ${result.standingLimit} finishes for time period: ${htmlEscape(timePeriodDisplayName)}.</small></p>
        ${result.type === 'single_card' ? singleCardNote : ''}
        <p><small>Created by <a href="https://github.com/VictorJulianiR" target="_blank" rel="noopener noreferrer" style="color:var(--color-accent-gold);">Victor Juliani</a>. Report generated by cEDH Card Data.</small></p>
    </footer>
    `;
}

function getAtAGlanceCardHtml(title: string, metricsWithCard: PerformanceMetrics, metricsWithoutCard: PerformanceMetrics, csResult: ChiSquaredResult, winRateDiff: number, metric: 'winRateIgnoringDraws' | 'winRateOverall') {
    const withCardVal = (metricsWithCard[metric] * 100).toFixed(2);
    const withoutCardVal = (metricsWithoutCard[metric] * 100).toFixed(2);

    const diffText = `${winRateDiff >= 0 ? '+' : ''}${winRateDiff.toFixed(2)}%`;
    let diffColorClass = '';
    if (winRateDiff > 0.5) diffColorClass = 'value-positive';
    if (winRateDiff < -0.5) diffColorClass = 'value-negative';

    return `
        <div class="glance-card">
            <h4 class="glance-card-title">${htmlEscape(title)}</h4>
            <div class="glance-comparison-grid">
                <div class="glance-comparison-item">
                    <div class="label">With Card</div>
                    <div class="value with-card-value">${withCardVal}%</div>
                </div>
                <div class="glance-comparison-item glance-comparison-divider">
                     <div class="label">Change</div>
                     <div class="value ${diffColorClass}">${diffText}</div>
                </div>
                <div class="glance-comparison-item">
                     <div class="label">Without Card</div>
                     <div class="value without-card-value">${withoutCardVal}%</div>
                </div>
            </div>
            <div class="pills-container">
                ${getTrendPillHtml(winRateDiff)}
                ${getSignificancePillHtml(csResult)}
            </div>
        </div>
    `;
}

function generateSingleCardHtml(result: SingleCardAnalysisResult, timePeriodDisplayName: string): string {
    const { commanderName, cardName } = result;

    let decklistLinksHtml = '';
    if (result.decklistLinksWithCard.length > 0) {
        decklistLinksHtml = `
            <div class='section'>
                <h2 class="section-title">Decklists containing '${htmlEscape(cardName)}'</h2>
                <p>Found ${result.decklistLinksWithCard.length} decklist(s) from Moxfield or Topdeck.gg including this card:</p>
                <ul class='decklist-list'>
                    ${result.decklistLinksWithCard.map(link => `<li><a href='${htmlEscape(link)}' target='_blank'>${htmlEscape(link)}</a></li>`).join('')}
                </ul>
            </div>
        `;
    }

    const atAGlanceHtml = `
    <div class='section'>
        <h2 class="section-title" style="text-align:center;">At a Glance Comparison</h2>
        <div class="at-a-glance-grid">
            ${getAtAGlanceCardHtml('Win Rate (W+L)', result.metricsWithCard, result.metricsWithoutCard, result.chiSquaredIgnoringDraws, result.winRateDiffIgnoringDraws, 'winRateIgnoringDraws')}
            ${getAtAGlanceCardHtml('Overall Win Rate (W+L+D)', result.metricsWithCard, result.metricsWithoutCard, result.chiSquaredOverall, result.winRateDiffOverall, 'winRateOverall')}
        </div>
    </div>`;

    const interpretationHtml = `
    <div class="section">
        <h2 class="section-title">Statistical Interpretation</h2>
        <p style="font-size: 0.9em; color: var(--color-ui-text-secondary); margin-top: -12px; margin-bottom: 16px;">
          Based on <strong>${result.totalEntries}</strong> decks (Top ${result.standingLimit}s). Decks with '${htmlEscape(result.cardName)}': <strong>${result.decksWithCardCount}</strong> (${result.inclusionPercentage.toFixed(2)}%).
        </p>
        <div class="interpretation-card-container">
            ${getInterpretationHtml('Based on Win Rate (W+L)', result.winRateDiffIgnoringDraws, result.chiSquaredIgnoringDraws)}
            ${getInterpretationHtml('Based on Overall Win Rate (W+L+D)', result.winRateDiffOverall, result.chiSquaredOverall)}
        </div>
    </div>
    `;

    const statsBreakdownHtml = `
    <div class="section">
        <h2 class="section-title" style="text-align:center;">Detailed Statistical Breakdown</h2>
        <div class="stats-breakdown-grid">
            <div>
                <h3 class="section-title" style="font-size: 1.2em; border:none; margin-bottom: 8px;">With '${htmlEscape(cardName)}'</h3>
                <table class="stats-table">
                    <tbody>
                        <tr><td>Decks with Games:</td><td>${result.metricsWithCard.deckCountWithGames.toLocaleString()}</td></tr>
                        <tr><td>Record (W-L-D):</td><td>${result.metricsWithCard.wins}-${result.metricsWithCard.losses}-${result.metricsWithCard.draws}</td></tr>
                        <tr><td>Win Rate (W+L):</td><td>${(result.metricsWithCard.winRateIgnoringDraws * 100).toFixed(2)}%</td></tr>
                        <tr><td>Win Rate (Overall):</td><td>${(result.metricsWithCard.winRateOverall * 100).toFixed(2)}%</td></tr>
                        <tr><td>p-value (Overall):</td><td>${result.chiSquaredOverall.pValue ? result.chiSquaredOverall.pValue.toFixed(4) : 'N/A'}</td></tr>
                    </tbody>
                </table>
            </div>
            <div>
                <h3 class="section-title" style="font-size: 1.2em; border:none; margin-bottom: 8px;">Without '${htmlEscape(cardName)}'</h3>
                <table class="stats-table">
                    <tbody>
                        <tr><td>Decks with Games:</td><td>${result.metricsWithoutCard.deckCountWithGames.toLocaleString()}</td></tr>
                        <tr><td>Record (W-L-D):</td><td>${result.metricsWithoutCard.wins}-${result.metricsWithoutCard.losses}-${result.metricsWithoutCard.draws}</td></tr>
                        <tr><td>Win Rate (W+L):</td><td>${(result.metricsWithoutCard.winRateIgnoringDraws * 100).toFixed(2)}%</td></tr>
                        <tr><td>Win Rate (Overall):</td><td>${(result.metricsWithoutCard.winRateOverall * 100).toFixed(2)}%</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    `;

    return `
<!DOCTYPE html><html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>cEDH Card Analysis: ${htmlEscape(commanderName)} - ${htmlEscape(cardName)}</title>
    ${COMMON_STYLES}
</head>
<body>
<div class="container">
    <div class="header">
        <h1>cEDH Card Analysis</h1>
        <div class="header-subtitle">Commander: <span style="color: var(--color-accent-gold);">${htmlEscape(commanderName)}</span> | Card: <span style="color: var(--color-accent-amber);">${htmlEscape(cardName)}</span></div>
        <div class="header-subtitle">Time Period: ${htmlEscape(timePeriodDisplayName)}</div>
    </div>
    <div class="section">
      <div class="image-grid">
        ${getImageHtml(result.commanderImageUrls, commanderName, 'Commander')}
        ${getImageHtml(result.cardImageUrl ? [result.cardImageUrl] : [], cardName, 'Analyzed Card')}
      </div>
    </div>
    ${atAGlanceHtml}
    ${interpretationHtml}
    ${statsBreakdownHtml}
    ${decklistLinksHtml}
    ${getFooterHtml(result, timePeriodDisplayName)}
</div>
</body></html>
    `;
}

function generateCommanderHtml(result: CommanderAnalysisResult, timePeriodDisplayName: string): string {
    const dfHtml = result.cardStats.length > 0 ? `
        <h2 class="section-title">Card Performance Data</h2>
        <div style="overflow-x:auto;">
        <table class="dataframe-table">
            <thead>
                <tr>
                    <th>Card Name</th>
                    <th style="text-align:right;">Inclusion %</th>
                    <th style="text-align:right;">WR (W+L)</th>
                    <th style="text-align:right;">WR (Overall)</th>
                    <th style="text-align:center;">Trend</th>
                    <th style="text-align:center;">Stat. Sig.</th>
                    <th style="text-align:right;">p-value</th>
                    <th style="text-align:right;">Decks w/ Games</th>
                </tr>
            </thead>
            <tbody>
                ${result.cardStats.sort((a,b) => b.winRateIgnoringDraws - a.winRateIgnoringDraws).map(card => {
                    const winRateDiff = card.winRateOverall - (result.overallMetrics.winRateOverall * 100);
                    return `
                    <tr>
                        <td>${htmlEscape(card.cardName)}</td>
                        <td class="mono" style="text-align:right;">${card.inclusionPercentage.toFixed(2)}%</td>
                        <td class="mono" style="text-align:right;">${card.winRateIgnoringDraws.toFixed(2)}%</td>
                        <td class="mono" style="text-align:right;">${card.winRateOverall.toFixed(2)}%</td>
                        <td style="text-align:center;">${getTrendPillHtml(winRateDiff)}</td>
                        <td style="text-align:center;">
                          ${getSignificancePillHtml(card.statSig)}
                        </td>
                        <td class="mono" style="text-align:right;">${card.statSig.pValue !== null ? card.statSig.pValue.toFixed(6) : 'N/A'}</td>
                        <td class="mono" style="text-align:right;">${card.decksWithGames}</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>
        </div>` : '<p>No cards met the inclusion criteria for display.</p>';

    const resultsText = `
        <p>Analyzed <strong>${result.totalEntries}</strong> Top ${result.standingLimit} entries for commander: <strong>${htmlEscape(result.commanderName)}</strong>.</p>
        <p>Displaying <strong>${result.cardStats.length}</strong> cards found in at least <strong>${result.minInclusionPercentage.toFixed(1)}%</strong> of these decks.</p>
    `;

    return `
<!DOCTYPE html><html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>cEDH Commander Analysis: ${htmlEscape(result.commanderName)}</title>
    ${COMMON_STYLES}
</head>
<body>
<div class="container">
    <div class="header">
        <h1>cEDH Commander-Wide Analysis</h1>
        <div class="header-subtitle">Time Period: ${htmlEscape(timePeriodDisplayName)}</div>
    </div>
    <div class="section">
        <div class="image-grid">${getImageHtml(result.commanderImageUrls, result.commanderName, 'Commander')}</div>
    </div>
    <div class="section">
        <h2 class="section-title">Analysis for: <span style="color: var(--color-accent-gold);">${htmlEscape(result.commanderName)}</span></h2>
        ${resultsText}
    </div>
    <div class="section">
        ${dfHtml}
    </div>
    ${getFooterHtml(result, timePeriodDisplayName)}
</div>
</body></html>
    `;
}

export function generateHtmlOutput(result: AnalysisResult): string {
    const timePeriodDisplayName = Object.keys(TIME_PERIOD_OPTIONS).find(key => TIME_PERIOD_OPTIONS[key] === result.timePeriod) || result.timePeriod;

    if (result.type === 'single_card') {
        return generateSingleCardHtml(result, timePeriodDisplayName);
    } else {
        return generateCommanderHtml(result, timePeriodDisplayName);
    }
}
