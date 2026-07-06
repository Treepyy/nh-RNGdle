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
  digitBonus: { score: number; label: string };
  favorites: number;
  totalScore: number;
  isDeleted?: boolean;
};

type Phase = 'idle' | 'fetching' | 'digits' | 'tags' | 'done';

function getDigitBonus(id: number) {
  const digits = String(id).length;
  switch (digits) {
    case 1: return { score: 200000, label: '1-Digit Relic' }; // 1-9
    case 2: return { score: 50000, label: '2-Digit Antique' }; // 10-99
    case 3: return { score: 10000, label: '3-Digit Classic' }; // 100-999
    case 4: return { score: 2500, label: '4-Digit Vintage' }; // 1000-9999
    case 5: return { score: 500, label: '5-Digit Standard' }; // 10000-99999
    case 6: default: return { score: 0, label: '6-Digit Modern' }; // 100000+
  }
}

function getRollRarity(score: number, tags: RolledTag[], isDeleted?: boolean) {
  if (isDeleted) {
    return { name: 'DELETED', class: 'text-zinc-400 border-black bg-black shadow-[0_0_20px_rgba(0,0,0,0.8)]' };
  }

  if (tags.length === 0) {
    return { name: 'ZERO TAGS', class: 'text-zinc-500 border-dashed border-zinc-600 bg-zinc-900/30' };
  }
  
  if (tags.length > 0 && tags.every(t => t.count >= 50000)) {
    return { name: 'TRASH', class: 'text-stone-500 border-stone-600 shadow-[0_0_10px_rgba(120,113,108,0.3)] bg-stone-900/50' };
  }
  
  if (score >= 100000) return { name: 'MYTHIC', class: 'text-red-500 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' };
  if (score >= 50000) return { name: 'LEGENDARY', class: 'text-yellow-400 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]' };
  if (score >= 20000) return { name: 'EPIC', class: 'text-purple-400 border-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]' };
  if (score >= 5000) return { name: 'RARE', class: 'text-blue-400 border-blue-400' };
  if (score >= 1000) return { name: 'UNCOMMON', class: 'text-green-400 border-green-400' };
  return { name: 'COMMON', class: 'text-gray-400 border-gray-600' };
}

function getRarityEmoji(rarityName: string) {
  switch (rarityName) {
    case 'ZERO TAGS': return '0️⃣';
    case 'DELETED': return '⬛';
    case 'TRASH': return '🟫';
    case 'COMMON': return '⬜';
    case 'UNCOMMON': return '🟩';
    case 'RARE': return '🟦';
    case 'EPIC': return '🟪';
    case 'LEGENDARY': return '🟧';
    case 'MYTHIC': return '🟥';
    default: return '⬜';
  }
}

function getTagEmoji(count: number) {
  if (count < 100) return '🟧'; // Legendary
  if (count < 1000) return '🟪'; // Epic
  if (count < 10000) return '🟦'; // Rare
  if (count < 50000) return '🟩'; // Uncommon
  return '⬜'; // Common
}

export default function RNGDle() {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<RollResult | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [hasRolledToday, setHasRolledToday] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  
  const [displayDigits, setDisplayDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [revealedTagCount, setRevealedTagCount] = useState<number>(0);

  // 0. ON MOUNT: Check local storage for today's roll
  useEffect(() => {
    setMounted(true);
    const savedRoll = localStorage.getItem('rngdle_daily');
    
    if (savedRoll) {
      try {
        const parsed = JSON.parse(savedRoll);
        const today = new Date().toDateString();
        
        // If the saved date matches today, restore the game state immediately
        if (parsed.date === today) {
          setHasRolledToday(true);
          setResult(parsed.result);
          setPhase('done');
          setRevealedTagCount(parsed.result.tags.length);
          setDisplayDigits(String(parsed.result.id).padStart(6, '0').split(''));
        }
      } catch (e) {
        console.error('Failed to parse saved roll');
      }
    }
  }, []);

  // 0.5 COUNTDOWN TIMER: Calculates time until midnight
  useEffect(() => {
    if (!hasRolledToday) return;

    const interval = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();
      
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasRolledToday]);

  const handleRoll = async () => {
    if (phase !== 'idle' && phase !== 'done') return;
    if (hasRolledToday) return; // Prevent rolling if already rolled
    
    setPhase('fetching');
    setResult(null);
    setRevealedTagCount(0);
    setIsCopied(false);
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
          const digitBonus = getDigitBonus(data.id);
          const favoritesBonus = data.num_favorites || 0;
          
          // Start with bonuses
          let totalScore = digitBonus.score + favoritesBonus;
          
          const processedTags: RolledTag[] = data.tags.map((tagName: string) => {
            const tagData = localTags[tagName] || { count: 100000 }; 
            const score = getTagScore(tagData.count) * 20; 
            totalScore += score;
            return {
              name: tagName,
              count: tagData.count,
              score: score,
              colorClass: getRarityColor(tagData.count),
            };
          });

          processedTags.sort((a, b) => a.score - b.score);
          
          // Override to 0 if no tags are present
          // if (data.tags.length === 0) totalScore = 0;

          const finalResult = {
            id: data.id,
            title: data.title,
            tags: processedTags,
            digitBonus,
            favorites: favoritesBonus,
            totalScore,
            isDeleted: false
          };

          setResult(finalResult);
          setHasRolledToday(true);
          localStorage.setItem('rngdle_daily', JSON.stringify({ date: new Date().toDateString(), result: finalResult }));
          setPhase('digits');
          
        } else if (data.is404 && data.id) {
          success = true; 
          
          const finalResult = {
            id: data.id,
            title: 'DATA EXPUNGED // GALLERY DELETED',
            tags: [],
            digitBonus: { score: 0, label: '' },
            totalScore: 404,
            favorites: 0,
            isDeleted: true
          };

          setResult(finalResult);
          setHasRolledToday(true);
          localStorage.setItem('rngdle_daily', JSON.stringify({ date: new Date().toDateString(), result: finalResult }));
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

  // 1. DIGIT ANIMATION HOOK
  useEffect(() => {
    // Only run animation if we just fetched it. If it was loaded from local storage, skip.
    if (phase !== 'digits' || !result) return;
    
    const target = String(result.id).padStart(6, '0').split('');
    const startTimes = [0, 500, 1000, 1500, 2000, 2500];
    const lockTimes = [500, 1000, 1500, 2000, 2500, 3000];
    const startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      let allLocked = true;

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

  // Derived values
  const isRolling = phase === 'fetching' || phase === 'digits' || phase === 'tags';
  const finalRarity = result ? getRollRarity(result.totalScore, result.tags, result.isDeleted) : null;

  // 3. SHARE HANDLER
  const handleShare = async () => {
    if (!result || !finalRarity) return;

    const overallEmoji = getRarityEmoji(finalRarity.name);
    let shareText = `nhentai RNGdle 🤨🎲 ${result.id}\n\n`;
    shareText += `${overallEmoji} ${finalRarity.name}\n\n`;
    
    if (!result.isDeleted && result.tags.length > 0) {
      const topTags = [...result.tags].sort((a, b) => b.score - a.score);
      const top3 = topTags.slice(0, 3);
      const remainingCount = result.tags.length - top3.length;

      top3.forEach((tag) => {
        const tagEmoji = getTagEmoji(tag.count);
        shareText += `${tagEmoji} ${tag.name}\n`;
      });

      if (remainingCount > 0) {
        shareText += `+${remainingCount} more\n`;
      }
      shareText += '\n';
    }

    if (result.digitBonus.score > 0 && !result.isDeleted) {
      shareText += `✨ ${result.digitBonus.label}: +${result.digitBonus.score.toLocaleString()}\n`;
    }
    
    if (result.favorites > 0 && !result.isDeleted) {
      shareText += `💕 +${result.favorites.toLocaleString()} Favorites\n`;
    }

    shareText += `${result.totalScore.toLocaleString()} PTS\nhttps://nhentai-rngdle.vercel.app/`;

    try {
      await navigator.clipboard.writeText(shareText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  // Prevent hydration mismatch by rendering empty background until mounted
  if (!mounted) {
    return <main className="min-h-screen bg-[#1f1f1f]"></main>;
  }

  return (
    <main className="min-h-screen bg-[#1f1f1f] text-gray-200 flex flex-col items-center py-12 px-4 font-sans selection:bg-[#ed2553] selection:text-white">
      <div className="max-w-3xl w-full flex flex-col items-center gap-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl font-black tracking-tighter text-white">
            <span className="text-[#ed2553]">nhentai</span> RNGdle
          </h1>
          <p className="text-gray-400 font-semibold tracking-wide text-sm">
            DAILY GACHA NUKE CODES
          </p>
          <p className="mt-8 text-xs text-gray-500 text-center">Note: If you encounter any issues mention or dm @treepy on Discord. This is a parody website.</p>
        </div>

        {/* Action Button */}
        <button
          onClick={handleRoll}
          disabled={isRolling || hasRolledToday}
          className={`px-10 py-4 rounded font-bold tracking-widest uppercase transition-all duration-200 
            ${(isRolling || hasRolledToday)
              ? 'bg-[#141414] text-gray-600 border border-[#333] cursor-not-allowed' 
              : 'bg-[#ed2553] text-white hover:bg-[#c91d44] hover:shadow-[0_0_15px_rgba(237,37,83,0.5)] active:scale-95'
            }`}
        >
          {phase === 'fetching' ? `Locating... (${attempts})` 
            : isRolling ? 'Scanning...' 
            : (hasRolledToday && phase === 'done') ? `Next Code In ${timeLeft}` 
            : 'Roll Daily Code'}
        </button>

        {/* Display Area */}
        {(phase !== 'idle') && (
          <div className="w-full bg-[#141414] border-t-4 border-[#ed2553] rounded shadow-2xl p-6 md:p-8 mb-12">
            
            {/* Slot Digits */}
            <div className="flex justify-center gap-2 md:gap-4 mb-8">
              {displayDigits.map((digit, idx) => (
                <div 
                  key={idx} 
                  className={`w-12 h-16 md:w-16 md:h-20 bg-[#1f1f1f] border border-[#333] flex items-center justify-center rounded shadow-inner transition-colors duration-500
                    ${(digit !== '' && digit === '0' && idx < 6 - String(result?.id || '').length) ? 'opacity-30' : 'opacity-100'}
                    ${result?.isDeleted && phase === 'done' ? 'border-red-900 bg-black' : ''}`
                  }
                >
                  <span className={`text-3xl md:text-5xl font-mono font-bold ${result?.isDeleted && phase === 'done' ? 'text-red-600' : 'text-white'}`}>
                    {digit}
                  </span>
                </div>
              ))}
            </div>

            {/* Title */}
            <div className="min-h-[3rem] text-center mb-8">
              {phase !== 'fetching' && phase !== 'digits' && result && (
                <h2 className={`text-lg md:text-xl font-semibold line-clamp-2 animate-fade-in ${result.isDeleted ? 'text-red-500 tracking-widest' : 'text-gray-300'}`}>
                  {result.title}
                </h2>
              )}
            </div>

            {/* Tags */}
            {!result?.isDeleted && (
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
            )}

            {/* Final Evaluation & Share */}
            <div className={`mt-8 pt-6 border-t border-[#333] text-center transition-opacity duration-1000 ${phase === 'done' ? 'opacity-100' : 'opacity-0'}`}>
              <p className="text-gray-500 text-sm uppercase tracking-widest font-bold mb-2">Final Evaluation</p>
              
              {result && finalRarity && (
                <div className="flex flex-col items-center gap-2">
                  <span className={`px-4 py-1 border-2 rounded font-black tracking-widest ${finalRarity.class}`}>
                    {finalRarity.name}
                  </span>
                  
                  {result.digitBonus.score > 0 && !result.isDeleted && (
                    <p className="text-[#ed2553] text-xs font-bold tracking-widest mt-1 animate-pulse uppercase">
                      {result.digitBonus.label} BONUS: +{result.digitBonus.score.toLocaleString()}
                    </p>
                  )}

                  {result.favorites > 0 && !result.isDeleted && (
                    <p className="text-blue-400 text-xs font-bold tracking-widest mt-1 uppercase">
                      FAVORITES BONUS: +{result.favorites.toLocaleString()}
                    </p>
                  )}

                  <p className="text-5xl font-black text-white mt-2">
                    {result.totalScore.toLocaleString()} <span className="text-lg text-gray-500 font-normal">pts</span>
                  </p>

                  {/* Share Button (Only visible when completely done) */}
                  {phase === 'done' && (
                    <button
                      onClick={handleShare}
                      className={`mt-6 px-6 py-2 rounded font-bold tracking-wider uppercase transition-all duration-300
                        ${isCopied 
                          ? 'bg-green-600 text-white border-green-500' 
                          : 'bg-[#1f1f1f] text-gray-300 border border-[#444] hover:bg-[#333] hover:text-white hover:border-gray-400'
                        }`}
                    >
                      {isCopied ? 'Copied to Clipboard! ✓' : 'Share Roll ➦'}
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}