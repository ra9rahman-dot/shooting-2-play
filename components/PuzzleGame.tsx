import React, { useState, useEffect } from 'react';
import { Zap, Shield, Bomb, Rocket, Cpu, Skull, Heart, Star, Timer, Trophy, RotateCcw, LogOut, Brain } from 'lucide-react';
import { playPowerUp, playLaser, playLevelUp } from '../services/audioService';

const ICONS = [Zap, Shield, Bomb, Rocket, Cpu, Skull, Heart, Star];
const SAVE_KEY = 'starDefenderSaveData_v2';

interface PuzzleGameProps {
  onExit: () => void;
}

interface Card {
  id: number;
  iconId: number;
  isFlipped: boolean;
  isMatched: boolean;
}

export const PuzzleGame: React.FC<PuzzleGameProps> = ({ onExit }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [earnedCredits, setEarnedCredits] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize Game
  useEffect(() => {
    startNewGame();
  }, []);

  // Timer
  useEffect(() => {
    if (gameWon) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameWon]);

  const startNewGame = () => {
    const newCards: Card[] = [];
    const pairs = [...ICONS]; // 8 icons
    // Create pairs
    pairs.forEach((_, index) => {
      newCards.push({ id: index * 2, iconId: index, isFlipped: false, isMatched: false });
      newCards.push({ id: index * 2 + 1, iconId: index, isFlipped: false, isMatched: false });
    });
    // Shuffle
    newCards.sort(() => Math.random() - 0.5);
    setCards(newCards);
    setFlippedIds([]);
    setMatchedPairs(0);
    setMoves(0);
    setTimer(0);
    setGameWon(false);
    setIsProcessing(false);
  };

  const handleCardClick = (id: number) => {
    if (gameWon || isProcessing) return;
    const clickedCard = cards.find(c => c.id === id);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    playLaser();
    
    const newCards = cards.map(c => c.id === id ? { ...c, isFlipped: true } : c);
    setCards(newCards);
    
    const newFlipped = [...flippedIds, id];
    setFlippedIds(newFlipped);

    if (newFlipped.length === 2) {
      setIsProcessing(true);
      setMoves(m => m + 1);
      checkForMatch(newFlipped, newCards);
    }
  };

  const checkForMatch = (currentFlippedIds: number[], currentCards: Card[]) => {
    const [id1, id2] = currentFlippedIds;
    const card1 = currentCards.find(c => c.id === id1);
    const card2 = currentCards.find(c => c.id === id2);

    if (card1 && card2 && card1.iconId === card2.iconId) {
      // Match
      setTimeout(() => playPowerUp(), 200);
      const updatedCards = currentCards.map(c => 
        (c.id === id1 || c.id === id2) ? { ...c, isMatched: true, isFlipped: true } : c
      );
      setCards(updatedCards);
      setFlippedIds([]);
      setMatchedPairs(prev => {
        const newCount = prev + 1;
        if (newCount === 8) handleWin();
        return newCount;
      });
      setIsProcessing(false);
    } else {
      // No Match
      setTimeout(() => {
        const resetCards = currentCards.map(c => 
          (c.id === id1 || c.id === id2) ? { ...c, isFlipped: false } : c
        );
        setCards(resetCards);
        setFlippedIds([]);
        setIsProcessing(false);
      }, 800);
    }
  };

  const handleWin = () => {
    setGameWon(true);
    playLevelUp();
    
    // Calculate Reward based on speed
    // Base 50 + bonus for time under 60s
    const timeBonus = Math.max(0, 60 - timer) * 3;
    const reward = 100 + timeBonus;
    setEarnedCredits(reward);

    // Save Credits to Global Store
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        let data = saved ? JSON.parse(saved) : {};
        data = {
            ...data,
            credits: (data.credits || 0) + reward
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) { console.error("Save failed", e); }
  };

  return (
     <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4">
        <style>{`
            .preserve-3d { transform-style: preserve-3d; }
            .backface-hidden { backface-visibility: hidden; }
            .rotate-y-180 { transform: rotateY(180deg); }
        `}</style>

        {/* Header HUD */}
        <div className="w-full max-w-lg flex justify-between items-center mb-6 bg-slate-900/80 p-4 rounded-2xl border border-slate-700 backdrop-blur shadow-xl">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-cyan-400" />
                    <span className="font-mono text-xl text-white font-bold">{timer}s</span>
                </div>
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span className="font-mono text-xl text-white font-bold">{moves}</span>
                </div>
            </div>
            <button onClick={onExit} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-bold"><LogOut className="w-4 h-4" /> ABORT</button>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-4 gap-3 md:gap-4 max-w-lg w-full aspect-square relative z-10">
            {cards.map(card => {
                const Icon = ICONS[card.iconId];
                return (
                    <button 
                        key={card.id}
                        onClick={() => handleCardClick(card.id)}
                        className={`relative w-full h-full rounded-xl transition-all duration-500 preserve-3d ${card.isFlipped ? 'rotate-y-180' : ''} ${card.isMatched ? 'opacity-40 cursor-default' : 'cursor-pointer hover:scale-105'} shadow-lg`}
                    >
                        {/* Front (Hidden state) */}
                        <div className={`absolute inset-0 bg-slate-800 border-2 border-slate-700 rounded-xl flex items-center justify-center backface-hidden z-20`}>
                            <Brain className="w-8 h-8 text-slate-700" />
                        </div>
                        
                        {/* Back (Revealed state) */}
                        <div className={`absolute inset-0 bg-gradient-to-br from-cyan-950 to-slate-900 border-2 border-cyan-400 rounded-xl flex items-center justify-center backface-hidden rotate-y-180 z-10 box-border`}>
                            <Icon className="w-1/2 h-1/2 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                        </div>
                    </button>
                );
            })}
        </div>

        <div className="mt-6 text-slate-500 text-xs font-mono uppercase tracking-widest">
            MATCH GLYPHS TO EXTRACT CREDITS
        </div>

        {/* Win Modal */}
        {gameWon && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300 p-4">
                <div className="bg-slate-900 border border-cyan-500 rounded-3xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-in zoom-in-95">
                    <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-[bounce_1s_infinite]" />
                    <h2 className="text-3xl font-black text-white italic mb-2 tracking-tighter">HACK COMPLETE</h2>
                    <p className="text-slate-400 mb-8 font-mono text-sm">SYSTEM ACCESS GRANTED</p>
                    
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-8 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                        <span className="text-xs text-slate-500 uppercase font-bold tracking-widest block mb-2">Credits Extracted</span>
                        <div className="text-5xl font-black text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]">+{earnedCredits}</div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button onClick={startNewGame} className="w-full bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-2 text-lg">
                             <RotateCcw className="w-5 h-5" /> RESTART HACK
                        </button>
                        <button onClick={onExit} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 text-lg">
                             RETURN TO MENU
                        </button>
                    </div>
                </div>
            </div>
        )}
     </div>
  );
};