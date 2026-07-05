// app/page.tsx
'use client';

import { useState } from 'react';
import { tags as localTags, getTagScore, getRarityColor } from '@/lib/tags';

type RolledTag = {
  name: string;
  count: number;
  score: number;
  colorClass: string;
};

type RollResult = {
  id: number;
  title: string;
  tags: RolledTag[];
  totalScore: number;
};

export default function RNGDle() {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<RollResult | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleRoll = async () => {
    setIsRolling(true);
    setResult(null);
    
    let success = false;
    let currentAttempt = 0;

    // Loop to keep rolling if we hit a 404 (deleted gallery)
    while (!success && currentAttempt < 5) {
      currentAttempt++;
      setAttempts(currentAttempt);
      
      try {
        const res = await fetch('/api/roll');
        const data = await res.json();

        if (data.success) {
          success = true;
          
          let totalScore = 0;
          const processedTags: RolledTag[] = data.tags.map((tagName: string) => {
            // Find tag in your local TS constant, default to 100k count if missing
            const tagData = localTags[tagName] || { count: 100000 }; 
            const score = getTagScore(tagData.count);
            totalScore += score;
            
            return {
              name: tagName,
              count: tagData.count,
              score: score,
              colorClass: getRarityColor(tagData.count),
            };
          });

          // Sort tags by score (highest rarity first)
          processedTags.sort((a, b) => b.score - a.score);

          setResult({
            id: data.id,
            title: data.title,
            tags: processedTags,
            totalScore,
          });
        }
      } catch (err) {
        console.error('Roll failed', err);
      }
    }
    
    setIsRolling(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-12 px-4 font-sans">
      <div className="max-w-3xl w-full flex flex-col items-center gap-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-500">
            RNGDle
          </h1>
          <p className="text-slate-400">Roll a random 6-digit number. Rarer tags = Higher Score.</p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRoll}
          disabled={isRolling}
          className={`px-8 py-4 rounded-xl text-2xl font-bold transition-all duration-200 
            ${isRolling 
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
              : 'bg-gradient-to-r from-pink-600 to-violet-600 hover:scale-105 hover:shadow-[0_0_20px_rgba(219,39,119,0.5)] active:scale-95'
            }`}
        >
          {isRolling ? `Rolling... (Attempt ${attempts})` : 'ROLL NUKE CODE'}
        </button>

        {/* Results Card */}
        {result && (
          <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-fade-in-up">
            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
              <div>
                <span className="bg-slate-800 text-pink-400 font-mono px-3 py-1 rounded-md text-xl font-bold tracking-widest">
                  #{result.id}
                </span>
                <h2 className="text-lg text-slate-300 mt-3 line-clamp-2">{result.title}</h2>
              </div>
              <div className="text-right">
                <p className="text-slate-500 text-sm uppercase tracking-wider font-bold">Total Score</p>
                <p className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                  {result.totalScore.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Tags Grid */}
            <div className="space-y-3">
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Rolled Tags</p>
              {result.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-2 border bg-slate-950/50 px-3 py-1.5 rounded-lg ${tag.colorClass}`}
                    >
                      <span className="font-semibold text-sm">{tag.name}</span>
                      <span className="opacity-50 text-xs">|</span>
                      <span className="text-xs font-mono">+{tag.score.toLocaleString()} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-600 italic">No valid tags found for this roll.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}