import React, { useState, useEffect, useRef } from 'react';
import { GameStatus, GameAssets, GameOptions, GraphicStyle } from './types';
import { generateGameAssets, FALLBACK_PLAYER } from './services/geminiService';
import { GameCanvas, GameStats } from './components/GameCanvas';
import { PuzzleGame } from './components/PuzzleGame';
import { initAudio, setMusicEnabled } from './services/audioService';
import { Rocket, Loader2, Trophy, RotateCcw, Crosshair, Users, User, Medal, LogOut, Palette, Monitor, Play, Zap, Shield, Settings, Signal, X, Download, Laptop, Smartphone, WifiOff, Target, Clock, BarChart3, ChevronRight, Star, Volume2, VolumeX, Sparkles, ScanLine, Activity, Swords, MonitorPlay, MessageSquare, Brain } from 'lucide-react';

const SUGGESTED_THEMES = [
  "Cyberpunk Neon",
  "Alien Insects",
  "Retro 8-bit",
  "Candy Kingdom",
  "Underwater Mechs"
];

// Define Skin Colors (Must match GameCanvas)
const SKINS = [
  { name: 'ICE', hue: 0, color: '#22d3ee', price: 0 },        
  { name: 'VENOM', hue: 120, color: '#4ade80', price: 500 },    
  { name: 'ROSE', hue: 300, color: '#f472b6', price: 800 },     
  { name: 'GOLD', hue: 45, color: '#fbbf24', price: 2000 },      
  { name: 'OBSIDIAN', hue: 200, color: '#94a3b8', price: 3000 }, // New
  { name: 'NEBULA', hue: 260, color: '#a855f7', price: 5000 },   // New
];

const SAVE_KEY = 'starDefenderSaveData_v2'; 

// Simple user interface
interface UserProfile {
  name: string;
  email: string;
}

// --- Background Component (Nebula + Stars with Parallax + Space Dust) ---
const WarpBackground: React.FC<{ mouseX: number, mouseY: number }> = ({ mouseX, mouseY }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Stars
    const stars: {x: number, y: number, z: number, size: number}[] = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        size: Math.random() * 2
      });
    }

    // Space Dust (Fast moving streaks)
    const dust: {x: number, y: number, length: number, speed: number, alpha: number}[] = [];
    for (let i = 0; i < 50; i++) {
      dust.push({
         x: Math.random() * width,
         y: Math.random() * height,
         length: Math.random() * 20 + 5,
         speed: Math.random() * 15 + 5,
         alpha: Math.random() * 0.3
      });
    }

    // Nebulas (Floating colored clouds)
    const nebulas = [
        { x: width * 0.2, y: height * 0.3, r: 300, color: 'rgba(6, 182, 212, 0.15)', vx: 0.2, vy: 0.1 }, // Cyan
        { x: width * 0.8, y: height * 0.7, r: 400, color: 'rgba(168, 85, 247, 0.1)', vx: -0.1, vy: -0.2 }, // Purple
        { x: width * 0.5, y: height * 0.5, r: 250, color: 'rgba(59, 130, 246, 0.1)', vx: 0.1, vy: 0.1 }  // Blue
    ];

    let animId: number;
    const render = () => {
      ctx.fillStyle = '#020617'; // Slate 950 (Deep Space)
      ctx.fillRect(0, 0, width, height);
      
      const cx = width / 2;
      const cy = height / 2;
      
      // Parallax Offset
      const pX = (mouseX - cx) * 0.02;
      const pY = (mouseY - cy) * 0.02;

      // Draw Nebulas
      ctx.globalCompositeOperation = 'screen';
      nebulas.forEach(n => {
          n.x += n.vx;
          n.y += n.vy;
          // Bounce
          if(n.x < -100 || n.x > width + 100) n.vx *= -1;
          if(n.y < -100 || n.y > height + 100) n.vy *= -1;

          const grad = ctx.createRadialGradient(n.x - pX * 0.5, n.y - pY * 0.5, 0, n.x - pX * 0.5, n.y - pY * 0.5, n.r);
          grad.addColorStop(0, n.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(n.x - pX * 0.5, n.y - pY * 0.5, n.r, 0, Math.PI * 2);
          ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';

      // Draw Stars
      ctx.fillStyle = '#e2e8f0';
      stars.forEach(star => {
        star.z -= 2; // speed
        if (star.z <= 0) {
          star.z = width;
          star.x = Math.random() * width - width / 2;
          star.y = Math.random() * height - height / 2;
        }

        const x = ((star.x) / star.z) * width + cx - pX;
        const y = ((star.y) / star.z) * width + cy - pY;
        const size = (1 - star.z / width) * star.size * 2;

        if (x >= 0 && x < width && y >= 0 && y < height) {
           const alpha = (1 - star.z / width);
           ctx.globalAlpha = alpha;
           ctx.beginPath();
           ctx.arc(x, y, size, 0, Math.PI * 2);
           ctx.fill();
        }
      });
      
      // Draw Space Dust (Warp Lines)
      ctx.fillStyle = '#94a3b8';
      dust.forEach(d => {
         d.y += d.speed;
         if (d.y > height) { d.y = -d.length; d.x = Math.random() * width; }
         ctx.globalAlpha = d.alpha;
         ctx.fillRect(d.x - pX * 1.5, d.y - pY * 1.5, 1, d.length);
      });

      ctx.globalAlpha = 1.0;
      animId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
       width = window.innerWidth;
       height = window.innerHeight;
       canvas.width = width;
       canvas.height = height;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [mouseX, mouseY]);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0" />;
};

// --- HANGAR SHIP PREVIEW COMPONENT ---
const HangarPreview: React.FC<{mouseX: number, mouseY: number, skinHue: number}> = ({mouseX, mouseY, skinHue}) => {
    // Calculate tilt based on mouse position relative to center
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const rotX = (mouseY - cy) * 0.05;
    const rotY = (mouseX - cx) * 0.05;

    return (
        <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto mb-8 perspective-1000 group">
            {/* Holographic Base */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-12 bg-cyan-500/20 blur-xl rounded-full animate-pulse transform rotate-x-60"></div>
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-40 h-40 border-2 border-cyan-500/30 rounded-full transform rotate-x-[60deg] animate-[spin_10s_linear_infinite]"></div>
            
            {/* The Ship */}
            <div 
                className="w-full h-full transition-transform duration-100 ease-out drop-shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                style={{ transform: `rotateX(${-rotX}deg) rotateY(${rotY}deg)` }}
            >
                 <img 
                   src={FALLBACK_PLAYER} 
                   alt="Ship" 
                   className="w-full h-full object-contain animate-[float_4s_ease-in-out_infinite]"
                   style={{ filter: `hue-rotate(${skinHue}deg) brightness(1.2)` }} 
                 />
            </div>

            {/* Scanning Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="w-full h-1 bg-cyan-400/50 absolute top-0 animate-[scan_2s_linear_infinite] shadow-[0_0_10px_#22d3ee]"></div>
            </div>

            {/* Stats Lines */}
            <div className="absolute top-10 -right-12 hidden md:flex flex-col gap-2">
                 <div className="flex items-center gap-2">
                     <div className="w-8 h-[1px] bg-cyan-500"></div>
                     <span className="text-[10px] text-cyan-400 font-mono">ENGINES: 100%</span>
                 </div>
                 <div className="flex items-center gap-2 ml-4">
                     <div className="w-8 h-[1px] bg-cyan-500"></div>
                     <span className="text-[10px] text-cyan-400 font-mono">WEAPONS: RDY</span>
                 </div>
            </div>
             <div className="absolute bottom-10 -left-12 hidden md:flex flex-col gap-2 items-end">
                 <div className="flex items-center gap-2">
                     <span className="text-[10px] text-purple-400 font-mono">SHIELD: STABLE</span>
                     <div className="w-8 h-[1px] bg-purple-500"></div>
                 </div>
            </div>
        </div>
    );
};

// --- Mode Card Component ---
interface ModeCardProps {
  onClick: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'cyan' | 'purple' | 'green';
}

const ModeCard: React.FC<ModeCardProps> = ({ onClick, title, subtitle, icon, color }) => {
  const colorClasses = {
    cyan: 'bg-cyan-950/40 hover:bg-cyan-900/60 border-cyan-500/30 text-cyan-400 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    purple: 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-500/30 text-purple-400 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    green: 'bg-green-950/40 hover:bg-green-900/60 border-green-500/30 text-green-400 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)]'
  };

  return (
    <button 
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center p-6 rounded-3xl border backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 w-full h-48 overflow-hidden ${colorClasses[color]}`}
    >
       <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
       <div className={`mb-4 p-4 rounded-full bg-slate-950/50 border border-white/10 relative z-10 transition-transform group-hover:rotate-12`}>
         {icon}
       </div>
       <h3 className="text-xl md:text-2xl font-black text-white italic tracking-wider mb-1 relative z-10 text-center">{title}</h3>
       <p className="text-xs font-bold uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors relative z-10">{subtitle}</p>
       
       {/* Decorative Lines */}
       <div className={`absolute bottom-0 left-0 w-full h-1 bg-${color}-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}></div>
    </button>
  );
};

// --- Rank Calculator Helper ---
const getRank = (score: number) => {
  if (score < 1000) return { title: 'ROOKIE', grade: 'D', color: 'text-slate-400', next: 1000 };
  if (score < 2500) return { title: 'PILOT', grade: 'C', color: 'text-green-400', next: 2500 };
  if (score < 5000) return { title: 'VETERAN', grade: 'B', color: 'text-blue-400', next: 5000 };
  if (score < 10000) return { title: 'ACE', grade: 'A', color: 'text-purple-400', next: 10000 };
  return { title: 'LEGEND', grade: 'S', color: 'text-yellow-400', next: 20000 };
};

// --- Animated Counter Component ---
const AnimatedCounter: React.FC<{ value: number }> = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const duration = 2000;
    const increment = end / (duration / 16); // 60fps

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
};

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.MENU);
  const [showSettings, setShowSettings] = useState(false); 
  const [themeInput, setThemeInput] = useState("");
  const [assets, setAssets] = useState<GameAssets | null>(null);
  const [gameOptions, setGameOptions] = useState<GameOptions>({ playerCount: 1, startingLevel: 1, quality: 'high' });
  const [graphicStyle, setGraphicStyle] = useState<GraphicStyle>('pixel');
  const [startingLevel, setStartingLevel] = useState(1);
  const [displayMode, setDisplayMode] = useState<'mobile'|'laptop'|'tv'>('mobile'); // Default to mobile for responsive feel
  const [quality, setQuality] = useState<'high' | 'low'>('high'); 
  const [finalStats, setFinalStats] = useState<GameStats>({ score: 0, kills: 0, level: 1, weaponLevel: 0, enemyStats: { drone: 0, hunter: 0, dasher: 0, elite: 0, boss: 0 } }); 
  const [highScore, setHighScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Initializing...");
  const [musicOn, setMusicOn] = useState(true);
  const [currentSkinIdx, setCurrentSkinIdx] = useState(0);
  const [ownedSkins, setOwnedSkins] = useState<number[]>([0]);
  
  // Mouse Position for Parallax
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Load High Score, User, and Skin on mount
  useEffect(() => {
    const savedScore = localStorage.getItem('starDefenderHighScore');
    if (savedScore) {
      setHighScore(parseInt(savedScore, 10));
    }

    const savedUser = localStorage.getItem('starDefenderUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Load persisted skin data
    try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) {
            const data = JSON.parse(savedData);
            if (typeof data.skinIndex === 'number') {
                setCurrentSkinIdx(data.skinIndex);
            }
            if (Array.isArray(data.ownedSkins)) {
                setOwnedSkins(data.ownedSkins);
            }
        }
    } catch(e) { console.error("Error loading save data", e); }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Optional: Auto-show prompt on first visit if desired, but user interaction is better
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleMouseMove = (e: MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
        alert("To install, tap the Share button in your browser and select 'Add to Home Screen'.");
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  const requestPermissions = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) {}
    }
  };

  const handleStartGame = async (playerCount: 1 | 2) => {
    initAudio(); 
    requestPermissions();
    setGameOptions({ playerCount, startingLevel, quality });
    const theme = themeInput.trim() || "Neon Space";
    
    setStatus(GameStatus.LOADING);
    setLoadingMsg("Spinning Up Engines...");
    setError(null);

    try {
      await new Promise(r => setTimeout(r, 800));
      setLoadingMsg("Equipping Assets...");
      const generatedAssets = await generateGameAssets(theme, graphicStyle);
      
      setLoadingMsg("Systems Ready.");
      await new Promise(r => setTimeout(r, 500));

      setAssets(generatedAssets);
      setStatus(GameStatus.PLAYING);
    } catch (err: any) {
      console.error(err);
      setError("Initialization failed. Please restart.");
      setStatus(GameStatus.MENU);
    }
  };

  const handleStartPuzzle = () => {
      initAudio();
      setStatus(GameStatus.PUZZLE);
  };

  const handleLogin = () => {
    const mockUser: UserProfile = { name: "Commander Shepard", email: "commander@alliance.navy" };
    setUser(mockUser);
    localStorage.setItem('starDefenderUser', JSON.stringify(mockUser));
  };

  const handleLogout = () => { setUser(null); localStorage.removeItem('starDefenderUser'); };

  const handleGameOver = (stats: GameStats) => {
    setFinalStats(stats);
    if (stats.score > highScore) {
      setHighScore(stats.score);
      localStorage.setItem('starDefenderHighScore', stats.score.toString());
    }
    setStatus(GameStatus.GAME_OVER);
  };

  const toggleMusic = (enabled: boolean) => {
      setMusicOn(enabled);
      setMusicEnabled(enabled);
  };

  // --- SKIN SELECTION LOGIC ---
  const handleSelectSkin = (index: number) => {
    // Only allow selection if owned
    if (!ownedSkins.includes(index)) return; 

    setCurrentSkinIdx(index);
    try {
        const saved = localStorage.getItem(SAVE_KEY);
        let data = saved ? JSON.parse(saved) : {};
        data = {
            credits: data.credits || 0,
            nukes: data.nukes || 1,
            highScore: data.highScore || 0,
            ...data,
            skinIndex: index
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Failed to save skin", e);
    }
  };

  const sendFeedback = () => {
      window.location.href = "mailto:support@star-defender.com?subject=Game Feedback";
  };

  // Helper for Display Scale
  const getScaleClass = () => {
      if (displayMode === 'laptop') return 'scale-110';
      if (displayMode === 'tv') return 'scale-150';
      return 'scale-100'; // Mobile: No Zoom, just fit
  };

  return (
    <div className={`fixed inset-0 h-[100dvh] bg-slate-950 text-slate-50 font-sans overflow-hidden transition-transform duration-500 ease-in-out ${getScaleClass()}`}>
      
      {/* VIGNETTE AND CRT SCANLINE OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-50 mix-blend-overlay opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiAvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIwLjEiIC8+Cjwvc3ZnPg==')]"></div>
      <div className="absolute inset-0 pointer-events-none z-50 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.6)_100%)]"></div>

      {/* Background active only in Menu/Loading/GameOver */}
      {status !== GameStatus.PLAYING && <WarpBackground mouseX={mousePos.x} mouseY={mousePos.y} />}

      {/* =========================================
          MAIN MENU
         ========================================= */}
      {status === GameStatus.MENU && (
        <div className="relative z-10 h-full flex flex-col p-6 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start mb-6">
             <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <Signal className="w-5 h-5 text-cyan-400 animate-pulse" />
                  <span className="font-bold tracking-wider text-slate-300 text-sm">SYSTEM ONLINE</span>
                </div>
                {user && <span className="text-[10px] text-slate-500 font-mono uppercase bg-slate-900/50 px-2 py-1 rounded">Pilot: {user.name}</span>}
             </div>
             
             <div className="flex items-center gap-3">
                {/* Always Show Install Button if not installed */}
                <button onClick={handleInstallApp} className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-full text-xs font-bold hover:shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all animate-pulse border border-cyan-400/30">
                    <Download className="w-4 h-4" /> <span className="hidden md:inline">INSTALL GAME</span>
                </button>

                {!user ? (
                   <button onClick={handleLogin} className="text-xs font-bold text-cyan-400 hover:text-white transition-colors">LOGIN</button>
                ) : (
                   <button onClick={handleLogout} className="text-slate-600 hover:text-slate-400 transition-colors"><LogOut className="w-4 h-4" /></button>
                )}
                <button onClick={() => setShowSettings(true)} className="bg-slate-800/80 hover:bg-slate-700 text-white p-2.5 rounded-full border border-slate-600 hover:border-cyan-500 transition-all shadow-lg animate-[pulse_3s_infinite]">
                   <Settings className="w-5 h-5" />
                </button>
             </div>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col justify-center items-center text-center w-full max-w-5xl mx-auto">
            
            {/* World's Best Game Badge */}
            <div className="mb-8 animate-in slide-in-from-top-10 duration-1000">
               <div className="bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 p-[1px] rounded-full shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                   <div className="bg-black/80 backdrop-blur px-6 py-2 rounded-full flex items-center gap-3">
                       <Medal className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-bounce" />
                       <span className="text-yellow-100 font-black tracking-widest text-xs">WORLD #1 RATED SPACE SHOOTER</span>
                   </div>
               </div>
            </div>

            {/* New Hangar Preview Component with Active Skin */}
            <HangarPreview mouseX={mousePos.x} mouseY={mousePos.y} skinHue={SKINS[currentSkinIdx].hue} />

            <h1 className="text-6xl md:text-9xl font-black italic tracking-tighter text-white drop-shadow-[0_0_40px_rgba(6,182,212,0.6)] mb-2 animate-in zoom-in-50 duration-700 relative z-20">
              STAR<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-text">DEFENDER</span>
              <span className="absolute -top-6 -right-12 text-sm bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1 rounded-full font-black transform rotate-12 shadow-lg border border-white/20">V2.0 ULTIMATE</span>
            </h1>
            <div className="h-2 w-48 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-full mb-12 shadow-[0_0_20px_#22d3ee]"></div>
            
            <div className="flex flex-col md:flex-row gap-4 mb-12 w-full max-w-md animate-in slide-in-from-bottom-5 duration-1000 delay-300">
               <div className="bg-slate-900/50 backdrop-blur flex-1 py-4 px-6 rounded-2xl border border-slate-700/50 flex flex-col items-center shadow-xl group hover:border-yellow-500/50 transition-colors">
                   <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-yellow-400 transition-colors"><Trophy className="w-3 h-3"/> High Score</span>
                   <span className="text-yellow-400 font-mono font-black text-2xl drop-shadow-md">{highScore.toLocaleString()}</span>
               </div>
               <div className="bg-slate-900/50 backdrop-blur flex-1 py-4 px-6 rounded-2xl border border-slate-700/50 flex flex-col items-center shadow-xl group hover:border-green-500/50 transition-colors">
                   <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-green-400 transition-colors"><Activity className="w-3 h-3"/> Servers</span>
                   <span className="text-green-400 font-mono font-black text-2xl flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div> ONLINE</span>
               </div>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2 animate-pulse">
                 <Shield className="w-4 h-4" /> {error}
              </div>
            )}

            {/* Mode Selection Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl px-4 animate-in slide-in-from-bottom-10 duration-700 delay-100 pb-10">
                <ModeCard onClick={() => handleStartGame(1)} title="SOLO" subtitle="Fighter" icon={<Target className="w-8 h-8" />} color="cyan" />
                <ModeCard onClick={() => handleStartGame(2)} title="CO-OP" subtitle="Squad" icon={<Users className="w-8 h-8" />} color="purple" />
                <ModeCard onClick={handleStartPuzzle} title="PUZZLE" subtitle="Earn Credits" icon={<Brain className="w-8 h-8" />} color="green" />
            </div>
            
            <p className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em] flex items-center justify-center gap-4">
               SECURE CONNECTION ESTABLISHED • GALAXY NET V9.0
            </p>
          </div>
        </div>
      )}

      {/* =========================================
          SETTINGS MODAL
         ========================================= */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-400" /> SYSTEM CONFIG</h2>
              
              <div className="space-y-6">
                
                {/* HULL CUSTOMIZATION (SKINS) */}
                <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block flex items-center gap-2"><Palette className="w-4 h-4" /> Hangar (Owned Skins)</span>
                    <div className="grid grid-cols-4 gap-2">
                        {SKINS.map((skin, idx) => {
                             const isOwned = ownedSkins.includes(idx);
                             return (
                             <button 
                                key={skin.name} 
                                onClick={() => handleSelectSkin(idx)}
                                disabled={!isOwned}
                                className={`relative p-2 rounded-lg border-2 transition-all group ${currentSkinIdx === idx ? 'border-white bg-slate-700 ring-2 ring-cyan-500/50' : 'border-slate-700 bg-slate-900 hover:border-slate-500'} ${!isOwned ? 'opacity-50 cursor-not-allowed' : ''}`}
                             >
                                <div className="w-full h-8 rounded mb-1 shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: skin.color }}></div>
                                <span className={`text-[9px] font-bold block text-center ${currentSkinIdx === idx ? 'text-white' : 'text-slate-500'}`}>{skin.name}</span>
                                {currentSkinIdx === idx && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-500 rounded-full border border-slate-900 flex items-center justify-center">
                                        <div className="w-1 h-1 bg-white rounded-full"></div>
                                    </div>
                                )}
                             </button>
                        )})}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 text-center">Unlock more skins in the Mission Shop!</p>
                </div>

                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700">
                    <span className="text-sm font-bold text-white flex items-center gap-2"><Volume2 className="w-4 h-4" /> Background Music</span>
                    <button onClick={() => toggleMusic(!musicOn)} className={`w-12 h-6 rounded-full transition-colors relative ${musicOn ? 'bg-cyan-500' : 'bg-slate-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${musicOn ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>
                
                {/* DISPLAY MODE */}
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block flex items-center gap-2"><MonitorPlay className="w-4 h-4"/> Display Mode</label>
                   <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => setDisplayMode('mobile')} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${displayMode === 'mobile' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          <Smartphone className="w-5 h-5" />
                          <span className="text-[10px] font-bold">MOBILE</span>
                      </button>
                      <button onClick={() => setDisplayMode('laptop')} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${displayMode === 'laptop' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          <Laptop className="w-5 h-5" />
                          <span className="text-[10px] font-bold">LAPTOP</span>
                      </button>
                      <button onClick={() => setDisplayMode('tv')} className={`py-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${displayMode === 'tv' ? 'bg-blue-600 text-white border-blue-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                          <Monitor className="w-5 h-5" />
                          <span className="text-[10px] font-bold">BIG TV</span>
                      </button>
                   </div>
                </div>

                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Threat Level</label>
                   <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 5].map((lvl) => (
                        <button key={lvl} onClick={() => setStartingLevel(lvl)} className={`py-2 rounded-xl border text-sm font-bold transition-all ${startingLevel === lvl ? 'bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'}`}>LVL {lvl}</button>
                      ))}
                   </div>
                </div>

                {/* FEEDBACK BUTTON */}
                <button onClick={sendFeedback} className="w-full bg-slate-800 text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" /> SEND FEEDBACK
                </button>

              </div>
              <div className="mt-8">
                <button onClick={() => setShowSettings(false)} className="w-full bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">SAVE CONFIGURATION</button>
              </div>
           </div>
        </div>
      )}

      {/* =========================================
          LOADING SCREEN
         ========================================= */}
      {status === GameStatus.LOADING && (
        <div className="relative z-10 h-full flex flex-col items-center justify-center p-8">
          <div className="relative mb-8">
             <div className="absolute inset-0 bg-cyan-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
             <Loader2 className="w-12 h-12 text-cyan-400 animate-spin relative z-10" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-2">LOADING MISSION</h2>
          <p className="text-cyan-400 font-mono mb-4 text-sm animate-pulse">{loadingMsg}</p>
          <div className="h-1 w-48 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-cyan-500 animate-[width_1s_ease-in-out_infinite]" style={{width: '50%'}}></div>
          </div>
          <p className="mt-4 text-[10px] text-slate-500 font-mono tracking-widest">GALAXY OS v3.1</p>
        </div>
      )}

      {/* =========================================
          PUZZLE GAME
         ========================================= */}
      {status === GameStatus.PUZZLE && (
         <PuzzleGame onExit={() => setStatus(GameStatus.MENU)} />
      )}

      {/* =========================================
          GAMEPLAY CANVAS
         ========================================= */}
      {status === GameStatus.PLAYING && assets && (
        <GameCanvas assets={assets} options={gameOptions} onGameOver={handleGameOver} onExit={() => setStatus(GameStatus.MENU)} />
      )}

      {/* =========================================
          GAME OVER SCREEN (KILLING PAGE DETAIL)
         ========================================= */}
      {status === GameStatus.GAME_OVER && (
        <div className="relative z-20 h-full w-full flex flex-col items-center justify-center p-6 overflow-y-auto">
          {/* Detailed background for game over */}
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,24,27,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(255,0,0,0.02),rgba(255,0,0,0.06))] bg-[length:100%_4px,6px_100%] pointer-events-none"></div>

          <div className="w-full max-w-2xl animate-in zoom-in-95 duration-500 relative z-10">
             
             {/* Header */}
             <div className="text-center mb-6">
                 <h2 className="text-6xl font-black text-white italic tracking-tighter mb-1 drop-shadow-[0_0_25px_rgba(239,68,68,0.5)]">
                    MISSION <span className="text-red-500">TERMINATED</span>
                 </h2>
                 <div className="flex items-center justify-center gap-4 text-slate-500 text-xs font-mono uppercase tracking-widest bg-black/40 py-2 rounded-full border border-slate-800/50 inline-flex px-6">
                    <span className="flex items-center gap-2"><Clock className="w-3 h-3" /> T+{Math.floor(finalStats.score / 10)}s</span>
                    <span className="w-px h-3 bg-slate-700"></span>
                    <span>SECTOR 7G</span>
                    <span className="w-px h-3 bg-slate-700"></span>
                    <span>LOG #{Math.floor(Math.random()*9999)}</span>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Score Card */}
                <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-50"></div>
                    
                    <div className="flex justify-between items-end mb-8 relative z-10">
                        <div>
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">Total Score</span>
                            <span className="text-5xl font-mono text-white font-bold drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]">
                            <AnimatedCounter value={finalStats.score} />
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-2">Rank</span>
                            <span className={`text-6xl font-black italic ${getRank(finalStats.score).color} drop-shadow-md`}>
                            {getRank(finalStats.score).grade}
                            </span>
                        </div>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-black/40 p-3 rounded-xl border border-slate-700/50 flex flex-col">
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1"><Crosshair className="w-3 h-3" /> Confirmed Kills</div>
                            <div className="text-2xl font-mono text-red-400">{finalStats.kills}</div>
                        </div>
                        <div className="bg-black/40 p-3 rounded-xl border border-slate-700/50 flex flex-col">
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase mb-1"><BarChart3 className="w-3 h-3" /> Wave Reached</div>
                            <div className="text-2xl font-mono text-cyan-400">{finalStats.level}</div>
                        </div>
                    </div>
                </div>

                {/* Kill Breakdown (The Detail Page) */}
                <div className="bg-slate-900/80 border border-slate-700 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col">
                    <h3 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <Swords className="w-4 h-4" /> Threat Analysis
                    </h3>
                    <div className="flex-1 space-y-3">
                        <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                            <span className="text-cyan-400 text-xs font-bold">DRONES</span>
                            <span className="text-white font-mono">{finalStats.enemyStats?.drone || 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                            <span className="text-purple-400 text-xs font-bold">HUNTERS</span>
                            <span className="text-white font-mono">{finalStats.enemyStats?.hunter || 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                            <span className="text-green-400 text-xs font-bold">DASHERS</span>
                            <span className="text-white font-mono">{finalStats.enemyStats?.dasher || 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                            <span className="text-red-400 text-xs font-bold">ELITES</span>
                            <span className="text-white font-mono">{finalStats.enemyStats?.elite || 0}</span>
                        </div>
                        <div className="flex justify-between items-center bg-red-900/20 border border-red-500/30 p-2 rounded-lg">
                            <span className="text-red-500 text-xs font-black">MOTHERSHIPS</span>
                            <span className="text-white font-mono">{finalStats.enemyStats?.boss || 0}</span>
                        </div>
                    </div>
                </div>
             </div>

             {/* Action Buttons */}
             <div className="flex flex-col gap-3 mt-8">
               <button onClick={() => setStatus(GameStatus.PLAYING)} className="w-full bg-white text-black font-black py-4 rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.4)] flex items-center justify-center gap-2 uppercase tracking-wide">
                 <RotateCcw className="w-5 h-5" /> Redeploy Fighter
               </button>
               <button onClick={() => setStatus(GameStatus.MENU)} className="w-full bg-slate-800 text-slate-300 font-bold py-4 rounded-2xl hover:bg-slate-700 transition-colors border border-slate-700 flex items-center justify-center gap-2 group">
                 RETURN TO BASE <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;