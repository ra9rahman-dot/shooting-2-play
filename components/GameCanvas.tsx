import React, { useRef, useEffect, useState } from 'react';
import { GameAssets, GameOptions } from '../types';
import { checkCollision, lerp } from '../utils/gameLogic';
import { playLaser, playExplosion, playLevelUp, stopMusic, playPowerUp, startMusic } from '../services/audioService';
import { Pause, Play, ShoppingCart, Shield, Zap, Bomb, PaintBucket, Save, Settings, Cpu, Crosshair, LogOut, AlertTriangle, Skull, Heart, X, Lock, Check } from 'lucide-react';

export interface GameStats {
  score: number;
  kills: number;
  level: number;
  weaponLevel: number;
  enemyStats: { drone: number; hunter: number; dasher: number; elite: number; boss: number };
}

interface GameCanvasProps {
  assets: GameAssets;
  options: GameOptions;
  onGameOver: (stats: GameStats) => void;
  onExit: () => void;
}

// DEFINING SKINS WITH PRICES
const SKINS = [
  { name: 'ICE', hue: 0, color: '#22d3ee', price: 0 },        
  { name: 'VENOM', hue: 120, color: '#4ade80', price: 500 },    
  { name: 'ROSE', hue: 300, color: '#f472b6', price: 800 },     
  { name: 'GOLD', hue: 45, color: '#fbbf24', price: 2000 },      
  { name: 'OBSIDIAN', hue: 200, color: '#94a3b8', price: 3000 }, // New
  { name: 'NEBULA', hue: 260, color: '#a855f7', price: 5000 },   // New
];

// Helper to adjust color brightness for dynamic particles
const adjustColor = (hex: string, percent: number) => {
    hex = hex.replace(/^\s*#|\s*$/g, '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    if (percent > 0) {
       r += (255 - r) * percent; g += (255 - g) * percent; b += (255 - b) * percent;
    } else {
       r += r * percent; g += g * percent; b += b * percent;
    }
    const toHex = (n: number) => {
        const h = Math.round(Math.min(255, Math.max(0, n))).toString(16);
        return h.length === 1 ? "0" + h : h;
    };
    return "#" + toHex(r) + toHex(g) + toHex(b);
};

type EnemyType = 'drone' | 'hunter' | 'dasher' | 'elite' | 'boss';

interface Entity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
  hp?: number;
  maxHp?: number;
  targetX?: number;
  targetY?: number; 
  color?: string;
  phase?: number; 
  amplitude?: number; 
  vx?: number; 
  vy?: number; 
  life?: number; 
  angle?: number; 
  hasShield?: boolean;
  hitFlash?: number; 
  enemyType?: EnemyType;
  aiState?: number; 
  rotation?: number; 
  rotationSpeed?: number;
  scale?: number;
  invulnerableUntil?: number;
  bossPhase?: number;
  attackTimer?: number;
  bloodColor?: string;
  gravity?: number;
  friction?: number;
  decay?: number;
  spawnTimer?: number;
}

const SAVE_KEY = 'starDefenderSaveData_v2'; 

export const GameCanvas: React.FC<GameCanvasProps> = ({ assets, options, onGameOver, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [score, setScore] = useState(0);
  const [credits, setCredits] = useState(0);
  const [level, setLevel] = useState(options.startingLevel);
  const [isPaused, setIsPaused] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shopMsg, setShopMsg] = useState<string | null>(null);
  const [aiLog, setAiLog] = useState<string>("SYSTEM ONLINE..."); 
  const [selectedSkinIdx, setSelectedSkinIdx] = useState(0);
  const [ownedSkins, setOwnedSkins] = useState<number[]>([0]); // Default own first skin
  const [bossActive, setBossActive] = useState(false);
  const [bossHpPercent, setBossHpPercent] = useState(0);
  const [playerLives, setPlayerLives] = useState<number[]>([6]); 

  const gameState = useRef({
    players: [] as Entity[],
    bullets: [] as Entity[],
    enemyBullets: [] as Entity[],
    enemies: [] as Entity[],
    particles: [] as Entity[],
    debris: [] as Entity[], 
    floatingTexts: [] as {x: number, y: number, text: string, life: number, color: string, vy: number}[],
    muzzleFlashes: [] as {x: number, y: number, life: number}[],
    background: {
      stars: [] as {x: number, y: number, z: number, size: number, brightness: number}[],
      nebulas: [] as {x: number, y: number, r: number, color: string, vx: number, vy: number}[],
      atmosphericDust: [] as {x: number, y: number, speed: number, alpha: number, size: number}[]
    },
    camera: { x: 0, y: 0, shake: 0, chromaticAberration: 0 },
    lastShotTime: 0,
    lastEnemySpawnTime: 0,
    frameCount: 0,
    score: 0,
    kills: 0,
    killCounts: { drone: 0, hunter: 0, dasher: 0, elite: 0, boss: 0 }, 
    credits: 0,
    level: options.startingLevel,
    weaponLevel: 0,
    isRunning: true,
    isPaused: false,
    images: { player: new Image(), enemy: new Image(), boss: new Image() },
    nukes: 1,
    skinIndex: 0,
    bossSpawned: false
  });

  const addFloatingText = (x: number, y: number, text: string, color: string = '#fff') => {
      gameState.current.floatingTexts.push({
          x, y, text, life: 1.0, color, vy: -1.5 
      });
  };

  const spawnParticles = (x: number, y: number, color: string, count: number, type: 'spark' | 'blood' | 'explosion' | 'thruster' | 'glow') => {
      const state = gameState.current;
      if (state.particles.length > 150) return; // Allow more particles

      const limit = type === 'explosion' ? 8 : (type === 'blood' ? 12 : (type === 'thruster' ? 1 : 2));
      const actualCount = Math.min(count, limit);

      for (let i = 0; i < actualCount; i++) {
          let vx = (Math.random() - 0.5) * 8;
          let vy = (Math.random() - 0.5) * 8;
          let life = 0.5 + Math.random() * 0.3;
          let width = 2;
          let height = 2;
          let gravity = 0;
          let friction = 0.92;
          let decay = 0.08;
          let pColor = color;

          if (type === 'blood') {
              const sizeVar = Math.random();
              width = sizeVar * 5 + 2; 
              height = width; // Square chunks
              
              // Directional spread with speed variation
              const angle = Math.random() * Math.PI * 2;
              const speed = (Math.random() * 6 + 2) * (1.2 - sizeVar * 0.5); 
              vx = Math.cos(angle) * speed;
              vy = Math.sin(angle) * speed;
              
              gravity = 0.15; 
              friction = 0.94;
              life = 0.6 + Math.random() * 0.4;
              decay = 0.03;

              // Dynamic color brightness variation
              try {
                  pColor = adjustColor(color, (Math.random() * 0.6) - 0.3); // +/- 30% brightness
              } catch (e) { pColor = color; }

          } else if (type === 'explosion') {
              width = Math.random() * 4 + 2; height = width;
              life = 0.6;
          } else if (type === 'thruster') {
              vx = (Math.random() - 0.5) * 2; vy = Math.random() * 5 + 2;
              width = 2; height = 2;
              life = 0.2; pColor = '#06b6d4'; decay = 0.15;
          }

          state.particles.push({ 
              id: -1, x, y, width, height, vx, vy, life, color: pColor, 
              active: true, speed: 0, gravity, friction, decay
          });
      }
  };

  const logAi = (msg: string) => setAiLog(msg);

  const triggerGameOver = () => {
    const state = gameState.current;
    state.isRunning = false;
    state.camera.shake = 20;
    playExplosion();
    stopMusic();
    saveGameData(); 
    onGameOver({
      score: state.score,
      kills: state.kills,
      level: state.level,
      weaponLevel: state.weaponLevel,
      enemyStats: state.killCounts
    });
  };

  const saveGameData = () => {
    const currentStoredScore = parseInt(localStorage.getItem('starDefenderHighScore') || '0');
    const newHighScore = Math.max(gameState.current.score, currentStoredScore);
    if (newHighScore > currentStoredScore) {
        localStorage.setItem('starDefenderHighScore', newHighScore.toString());
    }
    const data = {
      credits: gameState.current.credits,
      nukes: gameState.current.nukes,
      skinIndex: gameState.current.skinIndex,
      ownedSkins: ownedSkins,
      highScore: newHighScore
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  };

  const loadGameData = () => {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        gameState.current.credits = data.credits || 0;
        gameState.current.weaponLevel = 0; 
        gameState.current.nukes = data.nukes || 1;
        gameState.current.skinIndex = data.skinIndex || 0;
        
        // Load owned skins, default to [0] if missing
        const loadedSkins = Array.isArray(data.ownedSkins) ? data.ownedSkins : [0];
        setOwnedSkins(loadedSkins);

        setCredits(gameState.current.credits);
        setSelectedSkinIdx(gameState.current.skinIndex);
      } catch (e) { console.error(e); }
    }
  };

  const buyItem = (item: 'weapon' | 'shield' | 'nuke') => {
    const state = gameState.current;
    if (item === 'weapon') {
        const cost = (state.weaponLevel + 1) * 150;
        if (state.weaponLevel < 3 && state.credits >= cost) {
            state.credits -= cost; state.weaponLevel++; setCredits(state.credits); setShopMsg("FIRE POWER UP!"); playPowerUp(); saveGameData();
        } else if (state.weaponLevel >= 3) setShopMsg("MAX POWER REACHED"); else setShopMsg("NEED MORE CREDITS");
    } else if (item === 'shield') {
        if (state.credits >= 100) {
            let needsShield = false; state.players.forEach(p => { if(!p.hasShield) needsShield = true; });
            if (needsShield) { state.credits -= 100; state.players.forEach(p => p.hasShield = true); setCredits(state.credits); setShopMsg("PROTECTION ACTIVE"); playPowerUp(); saveGameData(); } else setShopMsg("SHIELD FULL");
        } else setShopMsg("NEED 100 CREDITS");
    } else if (item === 'nuke') {
        if (state.credits >= 200) { state.credits -= 200; state.nukes++; setCredits(state.credits); setShopMsg("NUKE ACQUIRED"); playPowerUp(); saveGameData(); } else setShopMsg("NEED 200 CREDITS");
    }
    setTimeout(() => setShopMsg(null), 1500);
  };

  const attemptBuySkin = (idx: number) => {
      const state = gameState.current;
      const skin = SKINS[idx];
      
      // If already owned, just equip
      if (ownedSkins.includes(idx)) {
          state.skinIndex = idx;
          setSelectedSkinIdx(idx);
          setShopMsg(`EQUIPPED: ${skin.name}`);
          playPowerUp();
          saveGameData();
      } else {
          // Attempt buy
          if (state.credits >= skin.price) {
              state.credits -= skin.price;
              const newOwned = [...ownedSkins, idx];
              setOwnedSkins(newOwned);
              
              // Auto equip
              state.skinIndex = idx;
              setSelectedSkinIdx(idx);
              setCredits(state.credits);
              
              setShopMsg(`PURCHASED: ${skin.name}`);
              playLevelUp(); // Special sound for purchase
              
              // Important: We must persist the new 'ownedSkins' immediately
              const currentStoredScore = parseInt(localStorage.getItem('starDefenderHighScore') || '0');
              const data = {
                  credits: state.credits,
                  nukes: state.nukes,
                  skinIndex: idx,
                  ownedSkins: newOwned,
                  highScore: Math.max(state.score, currentStoredScore)
              };
              localStorage.setItem(SAVE_KEY, JSON.stringify(data));

          } else {
              setShopMsg(`NEED ${skin.price} CREDITS`);
          }
      }
      setTimeout(() => setShopMsg(null), 1500);
  };

  const activateNuke = () => {
      const state = gameState.current;
      if (state.nukes > 0) {
          state.nukes--;
          state.enemies.forEach(e => {
              if (e.enemyType === 'boss') {
                  e.hp = Math.max(0, (e.hp || 100) - 200);
                  addFloatingText(e.x + e.width/2, e.y, "-200 NUKE", '#ef4444');
                  spawnParticles(e.x + e.width/2, e.y + e.height/2, '#ef4444', 30, 'explosion');
              } else {
                  e.hp = 0; e.active = false;
                  spawnParticles(e.x + e.width/2, e.y + e.height/2, '#fff', 10, 'explosion');
                  state.kills++; if (e.enemyType) state.killCounts[e.enemyType]++;
              }
          });
          state.enemies = state.enemies.filter(e => e.hp! > 0);
          state.camera.shake = 40;
          state.score += 500;
          setScore(state.score);
          logAi("⚠️ SMART BOMB DETONATED");
          playExplosion();
          saveGameData(); 
      }
  };

  useEffect(() => {
    loadGameData();
    gameState.current.weaponLevel = 0;
    gameState.current.level = options.startingLevel;
    gameState.current.killCounts = { drone: 0, hunter: 0, dasher: 0, elite: 0, boss: 0 };
    startMusic();

    const initPlayers: Entity[] = [];
    const playerY = window.innerHeight - 150;
    initPlayers.push({ id: 0, x: 0, y: playerY, width: 64, height: 64, speed: 0, active: true, targetX: 0, targetY: playerY, hasShield: false, hp: 6, maxHp: 6, scale: 0 });
    if (options.playerCount === 2) {
      initPlayers.push({ id: 1, x: 0, y: playerY, width: 64, height: 64, speed: 0, active: true, targetX: 0, targetY: playerY, hasShield: false, hp: 6, maxHp: 6, scale: 0 });
    }
    setPlayerLives(initPlayers.map(p => p.hp || 6));
    gameState.current.players = initPlayers;
    
    gameState.current.images.player.src = assets.playerSprite;
    gameState.current.images.enemy.src = assets.enemySprite;
    gameState.current.images.boss.src = assets.bossSprite;

    const width = window.innerWidth;
    const height = window.innerHeight;
    gameState.current.background.stars = [];
    gameState.current.background.atmosphericDust = [];
    
    for (let i = 0; i < 40; i++) {
      gameState.current.background.stars.push({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width,
        size: Math.random() * 2 + 0.5,
        brightness: Math.random()
      });
    }

    for (let i = 0; i < 25; i++) {
        gameState.current.background.atmosphericDust.push({
            x: Math.random() * width,
            y: Math.random() * height,
            speed: Math.random() * 0.5 + 0.2,
            alpha: Math.random() * 0.4,
            size: Math.random() * 2 + 1
        });
    }

    gameState.current.background.nebulas = [
        { x: width * 0.2, y: height * 0.3, r: 400, color: 'rgba(6, 182, 212, 0.05)', vx: 0.1, vy: 0.05 }, 
        { x: width * 0.8, y: height * 0.7, r: 600, color: 'rgba(168, 85, 247, 0.04)', vx: -0.05, vy: -0.1 }
    ];

    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2); 
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;
        
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);

        const p1 = gameState.current.players[0];
        if(p1) { p1.x = width/2 - 32; p1.y = height - 120; p1.targetX = p1.x; p1.targetY = p1.y; }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      stopMusic();
    };
  }, [assets, options]);

  // --- GAME LOOP ---
  useEffect(() => {
    let animationFrameId: number;
    const ctx = canvasRef.current?.getContext('2d', { alpha: false });
    const preventDefault = (e: Event) => e.preventDefault();
    document.body.addEventListener('touchmove', preventDefault, { passive: false });

    const gameLoop = (timestamp: number) => {
      if (!ctx || !canvasRef.current || !gameState.current.isRunning) return;
      if (gameState.current.isPaused) { animationFrameId = requestAnimationFrame(gameLoop); return; }

      const canvas = canvasRef.current;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      const state = gameState.current;
      state.frameCount++;
      const currentSkin = SKINS[state.skinIndex];

      // --- CLEANUP ---
      if (state.particles.length > 150) state.particles = state.particles.slice(state.particles.length - 150); 
      if (state.debris.length > 5) state.debris = state.debris.slice(state.debris.length - 5);

      // --- LOGIC ---
      if (state.score >= 150 && state.weaponLevel < 1) { state.weaponLevel = 1; logAi("⚡ UPGRADE: TWIN FIRE"); playPowerUp(); saveGameData(); }
      if (state.score >= 300 && state.weaponLevel < 2) { state.weaponLevel = 2; logAi("⚡ UPGRADE: TRIPLE THREAT"); playPowerUp(); saveGameData(); }
      if (state.score >= 600 && state.weaponLevel < 3) { state.weaponLevel = 3; logAi("⚡ MAX POWER: SPREAD FIRE"); playPowerUp(); saveGameData(); }

      let targetLevel = 1; 
      if (state.score >= 1500) targetLevel = 5; // Boss
      else if (state.score >= 600) targetLevel = 3;
      else if (state.score >= 300) targetLevel = 2;
      
      if (targetLevel > state.level) { 
          state.level = targetLevel; setLevel(targetLevel); playLevelUp(); logAi(`⚠ THREAT LEVEL INCREASED: ${state.level}`); saveGameData(); 
      }

      // --- BOSS ---
      if (state.score >= 1500 && !state.bossSpawned && state.enemies.length === 0) {
           state.bossSpawned = true; setBossActive(true);
           const bossHp = 400 + (options.playerCount * 200);
           state.enemies.push({
               id: 999, x: width/2 - 64, y: -150, width: 128, height: 128,
               speed: 1, active: true, hp: bossHp, maxHp: bossHp,
               enemyType: 'boss', aiState: 0, bossPhase: 1, attackTimer: 0,
               scale: 0, hasShield: false, bloodColor: '#f97316', spawnTimer: 120
           });
           logAi("🚨 WARNING: MOTHERSHIP DETECTED");
           state.camera.shake = 20;
      }

      // --- PLAYER ---
      state.players.forEach(p => {
        if (!p.active) return;
        if (p.scale! < 1) p.scale = lerp(p.scale!, 1, 0.05);

        if (state.frameCount % 5 === 0) {
            spawnParticles(p.x + p.width/2 - 10, p.y + p.height - 5, '#06b6d4', 1, 'thruster');
            spawnParticles(p.x + p.width/2 + 10, p.y + p.height - 5, '#06b6d4', 1, 'thruster');
        }

        if (p.targetX !== undefined) p.x = lerp(p.x, p.targetX, 0.2); 
        if (p.targetY !== undefined) p.y = lerp(p.y, p.targetY, 0.2);
        p.x = Math.max(0, Math.min(p.x, width - p.width));
        p.y = Math.max(0, Math.min(p.y, height - p.height));
      });

      // --- SHOOTING ---
      const fireRate = Math.max(120, 300 - (state.weaponLevel * 50));
      if (timestamp - state.lastShotTime > fireRate) { 
        let shotFired = false;
        state.players.forEach(p => {
            if (p.active) {
                let configs: {ox: number, angle: number}[] = [];
                if (state.weaponLevel === 0) configs = [{ox: 0, angle: 0}];
                else if (state.weaponLevel === 1) configs = [{ox: -12, angle: 0}, {ox: 12, angle: 0}];
                else if (state.weaponLevel === 2) configs = [{ox: -18, angle: -0.05}, {ox: 0, angle: 0}, {ox: 18, angle: 0.05}]; 
                else configs = [{ox: -28, angle: -0.1}, {ox: -10, angle: -0.03}, {ox: 10, angle: 0.03}, {ox: 28, angle: 0.1}]; 
                
                configs.forEach(c => {
                    const bx = p.x + p.width / 2 + c.ox - 4;
                    const by = p.y;
                    state.bullets.push({ id: -1, x: bx, y: by, width: 8, height: 24, speed: 18, angle: c.angle, active: true, color: currentSkin.color });
                });
                shotFired = true;
            }
        });
        if (shotFired) { playLaser(); }
        state.lastShotTime = timestamp;
      }

      // --- SPAWNING (Strict 2 then 3) ---
      if (!bossActive) {
          const maxEnemies = state.score >= 600 ? 3 : 2;
          if (state.enemies.length < maxEnemies && timestamp - state.lastEnemySpawnTime > 800) {
                const type = getWeightedEnemyType(state.level);
                const e = createEnemy(Math.random() * (width - 64), -80, type, state.level);
                state.enemies.push(e);
                state.lastEnemySpawnTime = timestamp;
          }
      }

      // --- UPDATES ---
      state.bullets.forEach(b => {
        b.y -= b.speed;
        if (b.angle) b.x += Math.sin(b.angle) * b.speed;
        if (b.y < -50 || b.x < -50 || b.x > width + 50) b.active = false;
      });
      state.enemyBullets.forEach(b => {
        if (b.vx !== undefined && b.vy !== undefined) { b.x += b.vx; b.y += b.vy; } else { b.y += b.speed; }
        if (b.y > height || b.x < -20 || b.x > width + 20) b.active = false;
      });

      state.enemies.forEach(e => {
        if (!e.active) return;
        if (e.spawnTimer && e.spawnTimer > 0) e.spawnTimer--;
        if (e.scale! < 1) e.scale = lerp(e.scale!, 1, 0.05);

        // Boss AI
        if (e.enemyType === 'boss') {
            setBossHpPercent((e.hp! / e.maxHp!) * 100);
            const hpPercent = (e.hp! / e.maxHp!);
            let nextPhase = 1;
            if (hpPercent < 0.3) nextPhase = 3; else if (hpPercent < 0.65) nextPhase = 2;
            if (nextPhase !== e.bossPhase) {
                e.bossPhase = nextPhase;
                if (nextPhase === 2) { logAi("🛡️ BOSS: DEFENSE"); e.hasShield = true; playPowerUp(); }
                if (nextPhase === 3) { logAi("🔥 BOSS: BERSERK"); e.hasShield = false; state.camera.shake = 15; }
            }
            if (e.y < 80) e.y += 0.5; 
            else {
                if (e.bossPhase === 1) e.x += Math.sin(timestamp / 800) * 1.5;
                else if (e.bossPhase === 2) e.x = lerp(e.x, width/2 - e.width/2, 0.05);
                else if (e.bossPhase === 3) e.x += Math.sin(timestamp / 150) * 5;
            }
            e.x = Math.max(0, Math.min(e.x, width - e.width));
            
            e.attackTimer = (e.attackTimer || 0) + 1;
            if (e.bossPhase === 1 && e.attackTimer % 60 === 0) {
                 const target = state.players.find(p => p.active);
                 if (target) {
                     state.enemyBullets.push({ id: -99, x: e.x + e.width/2, y: e.y + e.height, width: 12, height: 24, speed: 6, vx: 0, vy: 6, active: true, color: '#facc15' });
                 }
            } 
            return; 
        }

        e.y += e.speed;
        e.x = Math.max(0, Math.min(e.x, width - e.width));
        if (e.hitFlash && e.hitFlash > 0) e.hitFlash--;
        if (e.y > height) e.active = false;
        
        let baseShootChance = 0.005;
        if (state.score > 600) baseShootChance = 0.01;

        if (Math.random() < baseShootChance) {
           let bColor = '#d946ef'; 
           state.enemyBullets.push({ id: -2, x: e.x + e.width / 2 - 4, y: e.y + e.height, width: 8, height: 16, speed: e.speed + 4, active: true, color: bColor });
        }

        // Collisions Player vs Enemy
        for (const p of state.players) {
            if (p.active && checkCollision(p, e)) {
                if (p.invulnerableUntil && timestamp < p.invulnerableUntil) continue;
                
                if (p.hasShield) {
                    p.hasShield = false; if (e.enemyType !== 'boss') e.active = false;
                    playExplosion(); state.camera.shake = 15;
                    addFloatingText(p.x, p.y, "SHIELD BREACH", '#ef4444'); 
                    p.invulnerableUntil = timestamp + 1500; 
                } else {
                   p.hp = (p.hp || 1) - 1; setPlayerLives(state.players.map(pl => pl.hp || 0)); 
                   p.invulnerableUntil = timestamp + 2500; 
                   state.camera.shake = 20; 
                   playExplosion(); spawnParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444', 8, 'blood');
                   if (p.hp <= 0) {
                      p.active = false; 
                      if (!state.players.some(pl => pl.active)) triggerGameOver();
                   } else addFloatingText(p.x, p.y, "HULL CRITICAL", '#f97316');
                }
            }
        }
      });

      // Bullets vs Enemies
      state.bullets.forEach(b => {
        if (!b.active) return;
        state.enemies.forEach(e => {
          if (!e.active) return;
          if (checkCollision(b, e)) {
            b.active = false; e.hitFlash = 3; 
            if (e.enemyType === 'boss' && e.bossPhase === 2 && e.hasShield) {
                if (e.hp && e.hp > 1) e.hp -= 0.2; return;
            }
            const bloodColor = e.bloodColor || '#fff';
            // Hit effect: Spawn more blood particles
            spawnParticles(b.x, b.y, bloodColor, 6, 'blood'); 
            
            if (e.hp && e.hp > 1) { e.hp -= 1; } else {
                e.active = false; state.kills++; if (e.enemyType) state.killCounts[e.enemyType]++;
                let scoreAdd = 10 * state.level;
                if (e.enemyType === 'boss') {
                    scoreAdd = 2000; setBossActive(false); setBossHpPercent(0); logAi("TARGET NEUTRALIZED"); playLevelUp(); state.killCounts.boss++;
                    state.camera.shake = 50; 
                }
                state.score += scoreAdd; state.credits += Math.floor(scoreAdd / 5); setScore(state.score); setCredits(state.credits);
                state.camera.shake += 2; playExplosion();
                
                // Kill effect: Explosion + Blood Burst
                spawnParticles(e.x + e.width/2, e.y + e.height/2, bloodColor, 6, 'explosion');
                spawnParticles(e.x + e.width/2, e.y + e.height/2, bloodColor, 12, 'blood');
                
                if (state.debris.length < 5) {
                   state.debris.push({ id: -99, x: e.x + e.width/2, y: e.y + e.height/2, width: e.width/2, height: e.height/2, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1.0, rotation: 0, rotationSpeed: 0.1, active: true, speed: 0, enemyType: e.enemyType });
                }
            }
          }
        });
      });

      // Enemy Bullets vs Players
      state.enemyBullets.forEach(b => {
         if (!b.active) return;
         for (const p of state.players) {
             if (p.active && checkCollision(p, b)) {
                 if (p.invulnerableUntil && timestamp < p.invulnerableUntil) { b.active = false; continue; }
                 
                 if (p.hasShield) { 
                     p.hasShield = false; b.active = false; playExplosion(); 
                     p.invulnerableUntil = timestamp + 1500; 
                     state.camera.shake = 5; 
                 } else { 
                     p.hp = (p.hp || 1) - 1; setPlayerLives(state.players.map(pl => pl.hp || 0)); 
                     p.invulnerableUntil = timestamp + 2500; 
                     state.camera.shake = 15; 
                     playExplosion(); b.active = false; 
                     spawnParticles(p.x + p.width/2, p.y + p.height/2, '#ef4444', 5, 'blood'); 
                     if (p.hp <= 0) {
                         p.active = false; 
                         if (!state.players.some(pl => pl.active)) triggerGameOver();
                     } else addFloatingText(p.x, p.y, "WARNING", '#f97316');
                 }
             }
         }
      });

      state.bullets = state.bullets.filter(b => b.active);
      state.enemyBullets = state.enemyBullets.filter(b => b.active);
      state.enemies = state.enemies.filter(e => e.active);
      
      // Update Particles
      state.particles.forEach(p => { 
         if (p.life) { 
             p.x += p.vx!; p.y += p.vy!; 
             if (p.gravity) p.vy! += p.gravity; if (p.friction) { p.vx! *= p.friction; p.vy! *= p.friction; }
             p.life -= (p.decay || 0.05); 
         } 
      });
      state.particles = state.particles.filter(p => p.life! > 0);
      
      state.debris.forEach(d => { if (d.life) { d.x += d.vx!; d.y += d.vy!; d.life -= 0.02; d.rotation! += d.rotationSpeed!; d.vx! *= 0.95; d.vy! *= 0.95; } });
      state.debris = state.debris.filter(d => d.life! > 0);
      state.floatingTexts.forEach(t => { t.y += t.vy; t.life -= 0.02; });
      state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);
      
      state.background.atmosphericDust.forEach(d => {
         d.y += d.speed;
         if (d.y > height) { d.y = -10; d.x = Math.random() * width; }
      });

      // --- RENDER PASS ---
      let shakeX = 0, shakeY = 0;
      if (state.camera.shake > 0) {
          shakeX = (Math.random() - 0.5) * state.camera.shake; shakeY = (Math.random() - 0.5) * state.camera.shake;
          state.camera.shake *= 0.9; if (state.camera.shake < 0.5) state.camera.shake = 0;
      }

      ctx.fillStyle = '#020617'; 
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(shakeX, shakeY);

      state.background.stars.forEach(star => {
        const size = star.size;
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(star.x, star.y, size, 0, Math.PI * 2); ctx.fill();
      });

      ctx.fillStyle = 'rgba(165, 243, 252, 0.3)'; 
      state.background.atmosphericDust.forEach(d => {
          ctx.globalAlpha = d.alpha;
          ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      state.debris.forEach(d => {
          ctx.save(); ctx.translate(d.x + d.width/2, d.y + d.height/2); ctx.rotate(d.rotation || 0);
          ctx.globalAlpha = d.life || 0.5;
          ctx.fillStyle = d.enemyType === 'hunter' ? '#0891b2' : (d.enemyType === 'boss' ? '#ffffff' : '#701a75'); 
          ctx.fillRect(-d.width/2, -d.height/2, d.width, d.height);
          ctx.restore();
      });
      ctx.globalAlpha = 1.0;

      state.particles.forEach(p => {
         ctx.fillStyle = p.color || '#fff'; ctx.globalAlpha = p.life || 1;
         ctx.fillRect(p.x, p.y, p.width, p.height);
      });
      ctx.globalAlpha = 1.0;

      state.players.forEach(p => {
          if (!p.active) return;
          if (p.invulnerableUntil && timestamp < p.invulnerableUntil) {
              if (Math.floor(timestamp / 100) % 2 === 0) {
                   ctx.globalAlpha = 0.5; 
              }
          }

          ctx.save();
          let tilt = 0; if (p.targetX !== undefined) tilt = Math.max(-0.35, Math.min(0.35, (p.targetX - p.x) * 0.01)); 
          ctx.translate(p.x + p.width/2, p.y + p.height/2); ctx.rotate(tilt); ctx.scale(p.scale || 1, p.scale || 1);

          if (state.images.player.complete) {
              ctx.filter = `hue-rotate(${currentSkin.hue}deg) brightness(1.2)`; 
              if (p.id === 1) ctx.filter = `hue-rotate(${currentSkin.hue + 180}deg) brightness(1.2)`; 
              ctx.drawImage(state.images.player, -p.width/2, -p.height/2, p.width, p.height);
              ctx.filter = 'none';
          } else { ctx.fillStyle = currentSkin.color; ctx.fillRect(-p.width/2, -p.height/2, p.width, p.height); }
          ctx.restore();
          
          if (p.hasShield) {
              ctx.beginPath(); ctx.strokeStyle = `rgba(100, 200, 255, ${0.4 + Math.sin(timestamp/200)*0.2})`;
              ctx.lineWidth = 3; 
              ctx.arc(p.x + p.width/2, p.y + p.height/2, (p.width/1.4), 0, Math.PI*2); ctx.stroke(); 
          }
          ctx.globalAlpha = 1.0;
      });

      state.bullets.forEach(b => {
        ctx.fillStyle = '#fbbf24'; 
        ctx.fillRect(b.x, b.y, b.width, b.height);
      });

      state.enemies.forEach(e => {
        if (e.hitFlash && e.hitFlash > 0) {
            ctx.fillStyle = '#fff'; ctx.fillRect(e.x, e.y, e.width, e.height); return;
        }
        ctx.save();
        ctx.translate(e.x + e.width/2, e.y + e.height/2);
        
        if (e.enemyType === 'boss' && state.images.boss.complete) {
             ctx.drawImage(state.images.boss, -e.width/2, -e.height/2, e.width, e.height);
        } else if (state.images.enemy.complete) {
            let filter = 'none';
            if (e.enemyType === 'hunter') filter = 'hue-rotate(90deg) brightness(1.3)'; 
            else if (e.enemyType === 'dasher') filter = 'hue-rotate(40deg) saturate(200%)'; 
            else if (e.enemyType === 'elite') filter = 'invert(10%) sepia(100%) saturate(300%) hue-rotate(-50deg)'; 
            ctx.filter = filter;
            ctx.drawImage(state.images.enemy, -e.width/2, -e.height/2, e.width, e.height);
            ctx.filter = 'none';
        }
        ctx.restore();
      });

      state.enemyBullets.forEach(b => {
        ctx.fillStyle = b.color || '#f0abfc';
        ctx.beginPath(); ctx.arc(b.x + b.width/2, b.y + b.height/2, 6, 0, Math.PI * 2); ctx.fill();
      });

      state.floatingTexts.forEach(t => {
          ctx.fillStyle = t.color; 
          ctx.globalAlpha = Math.max(0, t.life);
          ctx.font = 'bold 16px "Inter", sans-serif';
          ctx.fillText(t.text, t.x, t.y); 
      });
      ctx.globalAlpha = 1.0;

      ctx.restore();
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => { cancelAnimationFrame(animationFrameId); document.body.removeEventListener('touchmove', preventDefault); };
  }, [onGameOver, options]); 

  const getWeightedEnemyType = (lvl: number): EnemyType => {
      const rand = Math.random();
      if (lvl >= 5) { if (rand > 0.8) return 'elite'; if (rand > 0.5) return 'dasher'; if (rand > 0.3) return 'hunter'; return 'drone'; }
      if (lvl >= 4) { if (rand > 0.85) return 'elite'; if (rand > 0.6) return 'dasher'; if (rand > 0.3) return 'hunter'; return 'drone'; }
      if (lvl >= 3) { if (rand > 0.7) return 'hunter'; if (rand > 0.9) return 'dasher'; return 'drone'; }
      if (lvl >= 2) { if (rand > 0.8) return 'hunter'; return 'drone'; }
      return 'drone';
  };

  const createEnemy = (x: number, y: number, type: EnemyType, lvl: number): Entity => {
      let speed = 2; let size = 48; let hp = 1; let bloodColor = '#94a3b8';
      if (type === 'hunter') { speed = 3; hp = 2; bloodColor = '#a855f7'; } 
      if (type === 'dasher') { speed = 5; hp = 1; size = 40; bloodColor = '#84cc16'; } 
      if (type === 'elite') { speed = 1.5; hp = 10; size = 80; bloodColor = '#ef4444'; } 
      if (type === 'drone') { bloodColor = '#22d3ee'; }
      hp += Math.floor(lvl / 1.5);
      if (lvl >= 2) hp += 3; if (lvl >= 3) hp += 5;
      speed += (lvl * 0.2);
      return { id: -1, x, y, width: size, height: size, speed, active: true, hp, maxHp: hp, enemyType: type, aiState: 0, hitFlash: 0, phase: Math.random() * Math.PI * 2, amplitude: 1 + Math.random() * 2, scale: 0, bloodColor, spawnTimer: 45 };
  };

  const handleTouch = (e: React.TouchEvent) => {
      if (gameState.current.isPaused || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      Array.from(e.changedTouches).forEach((touch: React.Touch) => {
          const relativeX = (touch.clientX - rect.left);
          const relativeY = (touch.clientY - rect.top);
          const logicX = relativeX * (canvasRef.current!.width / rect.width / (window.devicePixelRatio || 1));
          const logicY = relativeY * (canvasRef.current!.height / rect.height / (window.devicePixelRatio || 1));

          const player = gameState.current.players.find(p => p.id === (options.playerCount === 1 ? 0 : relativeX < (rect.width/2) ? 0 : 1));
          if (player) { 
              player.targetX = relativeX - player.width / 2; 
              player.targetY = relativeY - player.height / 2; 
          }
      });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
      if (gameState.current.isPaused || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left);
      const relativeY = (e.clientY - rect.top);

      const p1 = gameState.current.players.find(p => p.id === 0);
      if (p1) { 
          p1.targetX = relativeX - p1.width / 2; 
          p1.targetY = relativeY - p1.height / 2; 
      }
  };
  const togglePause = () => { const newState = !gameState.current.isPaused; gameState.current.isPaused = newState; setIsPaused(newState); if (newState) stopMusic(); else startMusic(); saveGameData(); };
  const openShop = () => { gameState.current.isPaused = true; setIsPaused(true); stopMusic(); setShowShop(true); };
  const closeShop = () => { setShowShop(false); gameState.current.isPaused = false; setIsPaused(false); startMusic(); };
  const weaponCost = (gameState.current.weaponLevel + 1) * 150;

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full touch-none select-none overflow-hidden" onTouchStart={handleTouch} onTouchMove={handleTouch} onMouseMove={(e) => { if (e.buttons === 1) handleMouseMove(e); }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ width: '100%', height: '100%' }} />
      
      {/* HUD UI */}
      <div className="absolute top-4 left-0 w-full px-4 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex flex-col gap-2">
            <div className="bg-slate-900/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-6 group">
                <div className="flex items-center gap-1.5"><span className="text-yellow-400 font-bold text-lg drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">$</span><span className="text-white font-mono text-2xl font-bold tracking-tight">{credits}</span></div>
                <div className="w-px h-8 bg-white/20"></div>
                <div className="flex flex-col">
                   <span className="text-cyan-400 font-bold text-[10px] uppercase tracking-wider">Score</span>
                   <span className="text-white font-mono text-xl font-bold leading-none tracking-tight">{score}</span>
                </div>
            </div>
            
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2 w-fit">
                <Cpu className="w-3 h-3 text-cyan-500 animate-pulse" />
                <span className="text-[10px] text-cyan-200 font-mono tracking-wider">{aiLog}</span>
            </div>
        </div>

        {bossActive && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-lg pointer-events-none animate-in fade-in zoom-in duration-700">
                <div className="flex justify-between items-end mb-1 px-1">
                    <span className="text-red-500 font-black tracking-[0.2em] text-xs uppercase drop-shadow-md animate-pulse">WARNING: CLASS 5 TITAN</span>
                    <span className="text-red-400 font-mono text-xs">{Math.floor(bossHpPercent)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-900/80 border border-red-900/50 rounded-full overflow-hidden relative shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                    <div className="h-full bg-gradient-to-r from-red-600 via-red-500 to-red-600 transition-all duration-300 ease-out relative" style={{ width: `${bossHpPercent}%` }}>
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:20px_20px] animate-[pulse_1s_infinite]"></div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-col items-end gap-3 pointer-events-auto">
            <div className="flex gap-1.5 bg-slate-900/40 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-lg">
               {playerLives.map((lives, pIndex) => (
                   <div key={pIndex} className="flex gap-1 items-center">
                       {[...Array(6)].map((_, i) => (
                           <Heart key={i} className={`w-5 h-5 transition-all duration-300 ${i < lives ? 'fill-red-500 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'fill-slate-800 text-slate-800'}`} />
                       ))}
                       {options.playerCount > 1 && <span className="text-[10px] text-slate-400 font-bold ml-1">P{pIndex+1}</span>}
                   </div>
               ))}
            </div>

            <div className="flex gap-3">
                <button onClick={openShop} className="bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-slate-900 font-black px-5 rounded-xl shadow-[0_4px_0_#b45309] active:shadow-none active:translate-y-1 transition-all flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> ARMORY</button>
                {gameState.current.nukes > 0 && (<button onClick={activateNuke} className="bg-gradient-to-br from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold p-3 rounded-xl shadow-[0_4px_0_#991b1b] active:shadow-none active:translate-y-1 transition-all animate-pulse"><Bomb className="w-5 h-5" /></button>)}
                <button onClick={togglePause} className="bg-slate-800 hover:bg-slate-700 text-white p-3.5 rounded-xl border border-slate-600 shadow-lg">{isPaused ? <Play className="w-5 h-5 fill-white" /> : <Pause className="w-5 h-5 fill-white" />}</button>
            </div>
        </div>
      </div>

      {showShop && (
          <div onClick={() => { saveGameData(); closeShop(); }} className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
              <div onClick={(e) => e.stopPropagation()} className="bg-slate-900/90 border border-slate-700/50 w-full max-w-5xl rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50"></div>
                  <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl md:text-4xl font-black text-white italic flex items-center gap-3 tracking-tighter"><ShoppingCart className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" /> ARMORY <span className="text-slate-600 text-lg not-italic font-mono font-normal hidden sm:inline">SECURE CHANNEL</span></h2>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 bg-slate-950/50 px-4 py-2 rounded-full border border-white/10"><span className="text-yellow-400 font-bold">$</span><span className="text-white font-mono text-lg md:text-xl">{credits}</span></div>
                          <button onClick={() => { saveGameData(); closeShop(); }} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10"><X className="w-6 h-6" /></button>
                      </div>
                  </div>
                  {shopMsg && (<div className="mb-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-center py-2 rounded-xl font-bold animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.2)]">{shopMsg}</div>)}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <button onClick={() => buyItem('weapon')} disabled={gameState.current.weaponLevel >= 3} className="bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 disabled:opacity-50 p-6 rounded-2xl border border-slate-700 hover:border-cyan-500/50 transition-all group relative overflow-hidden">
                            <Zap className="w-8 h-8 text-cyan-400 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
                            <h3 className="text-white font-black text-sm mb-1 tracking-wide">FIRE POWER</h3>
                            <span className="bg-cyan-950 text-cyan-300 border border-cyan-900 px-3 py-1 rounded-full text-[10px] font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]">{gameState.current.weaponLevel >= 3 ? 'MAX' : `$${weaponCost}`}</span>
                        </button>

                        <button onClick={() => buyItem('shield')} className="bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-blue-500/50 transition-all group relative overflow-hidden">
                            <Shield className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                            <h3 className="text-white font-black text-sm mb-1 tracking-wide">PROTECTION SHIELD</h3>
                            <span className="bg-blue-950 text-blue-300 border border-blue-900 px-3 py-1 rounded-full text-[10px] font-bold">$100</span>
                        </button>

                        <button onClick={() => buyItem('nuke')} className="bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 p-6 rounded-2xl border border-slate-700 hover:border-red-500/50 transition-all group relative overflow-hidden">
                            <Bomb className="w-8 h-8 text-red-400 mb-2 group-hover:scale-110 transition-transform drop-shadow-[0_0_10px_rgba(248,113,113,0.5)]" />
                            <h3 className="text-white font-black text-sm mb-1 tracking-wide">SMART BOMB</h3>
                            <span className="bg-red-950 text-red-300 border border-red-900 px-3 py-1 rounded-full text-[10px] font-bold">$200</span>
                        </button>
                  </div>

                  <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800 flex-1">
                        <h3 className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mb-4 flex items-center gap-2"><PaintBucket className="w-4 h-4" /> Nanobot Skins (Unlock with Coins)</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {SKINS.map((skin, idx) => {
                                const isOwned = ownedSkins.includes(idx);
                                const isEquipped = selectedSkinIdx === idx;
                                return (
                                <button key={skin.name} onClick={() => attemptBuySkin(idx)} className={`relative h-24 rounded-xl border-2 transition-all overflow-hidden group flex flex-col items-center justify-center gap-1 ${isEquipped ? 'border-white ring-2 ring-cyan-500/50' : 'border-slate-700 hover:border-slate-500'}`}>
                                    <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity" style={{ backgroundColor: skin.color }}></div>
                                    <span className="font-black italic text-white text-sm drop-shadow-md z-10">{skin.name}</span>
                                    
                                    {!isOwned && (
                                        <div className="flex items-center gap-1 z-10 bg-black/60 px-2 py-1 rounded">
                                            <Lock className="w-3 h-3 text-slate-400" />
                                            <span className="text-yellow-400 font-mono text-xs font-bold">${skin.price}</span>
                                        </div>
                                    )}
                                    {isOwned && !isEquipped && <span className="text-[10px] text-slate-400 z-10 font-bold">OWNED</span>}
                                    {isEquipped && <div className="absolute top-2 right-2 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow-lg"><Check className="w-3 h-3 text-black" /></div>}
                                </button>
                            )})}
                        </div>
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => { saveGameData(); closeShop(); }} className="bg-white text-slate-950 font-black py-3 px-10 rounded-xl hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] tracking-wide">RESUME MISSION</button>
                  </div>
              </div>
          </div>
      )}
      
      {isPaused && !showShop && (
        <div className="absolute inset-0 z-40 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6">
             <div className="flex flex-col items-center w-full max-w-sm relative">
                 <div className="absolute -top-20 inset-x-0 h-40 bg-cyan-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                 <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 italic mb-10 tracking-tighter drop-shadow-2xl">PAUSED</h2>
                 <div className="flex flex-col gap-4 w-full relative z-10">
                    <button onClick={togglePause} className="w-full bg-cyan-500 text-white font-bold py-5 rounded-2xl hover:scale-105 transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3 text-lg">
                        <Play className="w-6 h-6 fill-current" /> RESUME
                    </button>
                    <button onClick={onExit} className="w-full bg-slate-800 text-slate-300 font-bold py-5 rounded-2xl hover:bg-red-900/50 hover:text-red-200 transition-colors border border-slate-700 flex items-center justify-center gap-3">
                        <LogOut className="w-5 h-5" /> ABORT MISSION
                    </button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};