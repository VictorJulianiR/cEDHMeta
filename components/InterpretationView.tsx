import React from 'react';

interface InterpretationViewProps {
    interpretation?: string;
    isInterpreting: boolean;
}

const InterpretationLoader: React.FC = () => (
    <div className="flex flex-col items-center justify-center p-6 text-center text-ui-text-secondary">
         <svg className="animate-spin h-8 w-8 text-brand-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="mt-4 text-lg font-medium animate-pulse">Gemini is analyzing the data...</p>
    </div>
);

const InterpretationView: React.FC<InterpretationViewProps> = ({ interpretation, isInterpreting }) => {
    return (
        <div className="bg-ui-surface-elevated/50 backdrop-blur-xl p-4 sm:p-6 rounded-2xl shadow-lg ring-1 ring-black/20 border border-ui-border">
            <h3 className="text-xl font-semibold font-heading mb-4 text-ui-text-primary">Gemini AI Interpretation</h3>
            {isInterpreting ? (
                <InterpretationLoader />
            ) : interpretation ? (
                <div>
                    <div className="whitespace-pre-wrap text-ui-text-primary bg-ui-surface p-4 rounded-lg border border-ui-border prose prose-invert max-w-none prose-p:my-2 prose-headings:my-3">
                        {interpretation}
                    </div>
                    <p className="text-xs text-right mt-2 text-ui-text-muted">Powered by Gemini</p>
                </div>
            ) : null}
        </div>
    );
};

export default InterpretationView;
