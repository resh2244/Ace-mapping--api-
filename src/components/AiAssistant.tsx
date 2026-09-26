import React, { useState } from 'react';
import { Sparkles, Compass, Search, Loader2, ExternalLink } from 'lucide-react';

interface AiAssistantProps {
  currentAddress: string;
  validationData: any;
  lat?: number;
  lng?: number;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  currentAddress,
  validationData,
  lat,
  lng
}) => {
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [mode, setMode] = useState<'standard' | 'fast'>('standard');

  const [groundingTab, setGroundingTab] = useState<'maps' | 'search'>('maps');
  const [groundingQuery, setGroundingQuery] = useState('');
  const [groundingResult, setGroundingResult] = useState<{ text: string; chunks: any[] } | null>(null);
  const [groundingLoading, setGroundingLoading] = useState(false);

  const handleAnalyze = async (selectedMode: 'standard' | 'fast') => {
    if (!currentAddress) return;
    setAnalyzing(true);
    setMode(selectedMode);
    try {
      const res = await fetch('/api/ai/analyze-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: currentAddress,
          validationResult: validationData,
          mode: selectedMode
        })
      });
      const data = await res.json();
      if (data.result) {
        setAnalysisResult(data.result);
      } else {
        setAnalysisResult('No analysis generated.');
      }
    } catch (e: any) {
      setAnalysisResult('Error analyzing address: ' + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRunGrounding = async () => {
    setGroundingLoading(true);
    setGroundingResult(null);
    try {
      const endpoint = groundingTab === 'maps' ? '/api/ai/maps-grounding' : '/api/ai/search-grounding';
      const bodyPayload = groundingTab === 'maps'
        ? {
            query: groundingQuery || `What key landmarks, transit stops, and places are right near ${currentAddress}?`,
            lat,
            lng
          }
        : {
            query: groundingQuery || `Area guide and public services around ${currentAddress}`
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      setGroundingResult({
        text: data.text || 'No response returned',
        chunks: data.groundingChunks || []
      });
    } catch (err: any) {
      setGroundingResult({
        text: 'Grounding query failed: ' + err.message,
        chunks: []
      });
    } finally {
      setGroundingLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Gemini Address Intelligence
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Deliverability review, Maps Grounding & Search Grounding
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleAnalyze('fast')}
            disabled={analyzing || !currentAddress}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-50 transition-colors flex items-center space-x-1"
          >
            <span>Fast Audit (Lite)</span>
          </button>
          <button
            onClick={() => handleAnalyze('standard')}
            disabled={analyzing || !currentAddress}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors flex items-center space-x-1"
          >
            {analyzing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Deep Audit</span>
          </button>
        </div>
      </div>

      {/* Analysis Result Output */}
      {analysisResult && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Audit Verdict ({mode === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash'})
            </span>
            <button
              onClick={() => setAnalysisResult('')}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-slate-700 dark:text-slate-200">
            {analysisResult}
          </div>
        </div>
      )}

      {/* Grounding Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setGroundingTab('maps')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5 ${
                groundingTab === 'maps'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Google Maps Grounding</span>
            </button>
            <button
              onClick={() => setGroundingTab('search')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center space-x-1.5 ${
                groundingTab === 'search'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Google Search Grounding</span>
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            value={groundingQuery}
            onChange={(e) => setGroundingQuery(e.target.value)}
            placeholder={
              groundingTab === 'maps'
                ? 'e.g. Find closest pharmacies, subway stations, or parking'
                : 'e.g. Recent municipal news, zoning regulations, neighborhood history'
            }
            className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleRunGrounding}
            disabled={groundingLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors flex items-center space-x-1.5"
          >
            {groundingLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>Query</span>
            )}
          </button>
        </div>

        {/* Grounding Output */}
        {groundingResult && (
          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 space-y-3">
            <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
              {groundingResult.text}
            </div>

            {/* Render grounding citations & links */}
            {groundingResult.chunks && groundingResult.chunks.length > 0 && (
              <div className="pt-3 border-t border-blue-200/50 dark:border-blue-900/50">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
                  Verified Grounding References:
                </p>
                <div className="flex flex-wrap gap-2">
                  {groundingResult.chunks.map((chunk, i) => {
                    const uri = chunk.maps?.uri || chunk.web?.uri;
                    const title = chunk.maps?.title || chunk.web?.title || uri || `Source ${i + 1}`;
                    if (!uri) return null;
                    return (
                      <a
                        key={i}
                        href={uri}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:underline shadow-xs"
                      >
                        <span className="truncate max-w-[200px]">{title}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
