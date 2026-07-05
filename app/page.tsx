// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
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

type Phase = 'idle' | 'fetching' | 'digits' | 'tags' | 'done';

function getRollRarity(score: number) {
  if (score >= 50000) return { name: 'LEGENDARY', class: 'text-yellow-400 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' };
  if (score >= 20000) return { name: 'EPIC', class: 'text-purple-400 border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]' };
  if (score >= 5000) return { name: 'RARE', class: 'text-blue-400 border-blue-400' };
  if (score >= 1000) return { name: 'UNCOMMON', class: 'text-green-400 border-green-400' };
  return { name: 'COMMON', class: 'text-gray-400 border-gray-600' };
}

export default function RNGDle() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RollResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  const [displayDigits, setDisplayDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [revealedTagCount, setRevealedTagCount] = useState<number>(0);

  const handleRoll = async () => {
    if (phase !== 'idle' && phase !== 'done') return;
    
    setPhase('fetching');
    setResult(null);
    setRevealedTagCount(0);
    setDisplayDigits(['', '', '', '', '', '']);
    
    let success = false;
    let currentAttempt = 0;

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

          processedTags.sort((a, b) => a.score - b.score);

          setResult({
            id: data.id,
            title: data.title,
            tags: processedTags,
            totalScore,
          });
          
          setPhase('digits');
        }
      } catch (err) {
        console.error('Roll failed', err);
      }
    }
    
    if (!success) {
      setPhase('idle');
      alert('Failed to roll after 5 attempts. Cloudflare might be blocking requests.');
    }
  };

  // 1. DIGIT ANIMATION HOOK - FIXED
  useEffect(() => {
    if (phase !== 'digits' || !result) return;
    
    const target = String(result.id).padStart(6, '0').split('');
    const startTimes = [0, 500, 1000, 1500, 2000, 2500];
    const lockTimes = [500, 1000, 1500, 2000, 2500, 3000];
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let allLocked = true;

      // Calculate the array of digits outside the state setter
      const nextDigits = target.map((t, i) => {
        if (elapsed < startTimes[i]) {
          allLocked = false;
          return ''; 
        }
        if (elapsed >= lockTimes[i]) {
          return t; 
        }
        allLocked = false;
        return String(Math.floor(Math.random() * 10));
      });

      // Now set the state safely
      setDisplayDigits(nextDigits);

      if (allLocked) {
        clearInterval(interval);
        setTimeout(() => setPhase('tags'), 600);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [phase, result]);

  // 2. TAG REVEAL ANIMATION HOOK
  useEffect(() => {
    if (phase !== 'tags' || !result) return;

    if (result.tags.length === 0) {
      setPhase('done');
      return;
    }

    let currentRevealed = 0;
    const interval = setInterval(() => {
      currentRevealed++;
      setRevealedTagCount(currentRevealed);

      if (currentRevealed >= result.tags.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('done'), 800);
      }
    }, 700);

    return () => clearInterval(interval);
  }, [phase, result]);

  const isRolling = phase === 'fetching' || phase === 'digits' || phase === 'tags';
  const finalRarity = result ? getRollRarity(result.totalScore) : null;

  return (
    <main className="min-h-screen bg-[#1f1f1f] text-gray-200 flex flex-col items-center py-12 px-4 font-sans selection:bg-[#ed2553] selection:text-white">
      <div className="max-w-3xl w-full flex flex-col items-center gap-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black tracking-tighter text-white">
            rng<span className="text-[#ed2553]">dle</span>
          </h1>
          <p className="text-gray-400 font-semibold tracking-wide text-sm">
            GACHA NUKE CODES
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRoll}
          disabled={isRolling}
          className={`px-10 py-4 rounded font-bold tracking-widest uppercase transition-all duration-200 
            ${isRolling 
              ? 'bg-[#141414] text-gray-600 border border-[#333] cursor-not-allowed' 
              : 'bg-[#ed2553] text-white hover:bg-[#c91d44] hover:shadow-[0_0_15px_rgba(237,37,83,0.5)] active:scale-95'
            }`}
        >
          {phase === 'fetching' ? `Locating... (${attempts})` : isRolling ? 'Scanning...' : 'Roll Code'}
        </button>

        {/* Display Area */}
        {(phase !== 'idle') && (
          <div className="w-full bg-[#141414] border-t-4 border-[#ed2553] rounded shadow-2xl p-6 md:p-8">
            
            {/* Slot Digits */}
            <div className="flex justify-center gap-2 md:gap-4 mb-8">
              {displayDigits.map((digit, idx) => (
                <div 
                  key={idx} 
                  className="w-12 h-16 md:w-16 md:h-20 bg-[#1f1f1f] border border-[#333] flex items-center justify-center rounded shadow-inner"
                >
                  <span className="text-3xl md:text-5xl font-mono font-bold text-white">
                    {digit}
                  </span>
                </div>
              ))}
            </div>

            {/* Title */}
            <div className="min-h-[3rem] text-center mb-8">
              {phase !== 'fetching' && phase !== 'digits' && result && (
                <h2 className="text-lg md:text-xl text-gray-300 font-semibold line-clamp-2 animate-fade-in">
                  {result.title}
                </h2>
              )}
            </div>

            {/* Tags */}
            <div className="min-h-[150px]">
              {phase !== 'fetching' && phase !== 'digits' && result && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 justify-center">
                    {result.tags.slice(0, revealedTagCount).map((tag, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center gap-2 border bg-[#1f1f1f] px-3 py-1.5 rounded-md animate-fade-in-up ${tag.colorClass}`}
                        style={{ animationFillMode: 'both' }}
                      >
                        <span className="font-semibold text-sm">{tag.name}</span>
                        <span className="opacity-40 text-xs">|</span>
                        <span className="text-xs font-mono">+{tag.score.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Final Evaluation */}
            <div className={`mt-8 pt-6 border-t border-[#333] text-center transition-opacity duration-1000 ${phase === 'done' ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-gray-500 text-sm uppercase tracking-widest font-bold mb-2">Final Evaluation</p>
              
              {result && finalRarity && (
                <div className="flex flex-col items-center gap-2">
                  <span className={`px-4 py-1 border-2 rounded font-black tracking-widest ${finalRarity.class}`}>
                    {finalRarity.name}
                  </span>
                  <p className="text-5xl font-black text-white mt-2">
                    {result.totalScore.toLocaleString()} <span className="text-lg text-gray-500 font-normal">pts</span>
                  </p>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}