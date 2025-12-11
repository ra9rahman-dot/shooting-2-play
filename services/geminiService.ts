import { GameAssets, GraphicStyle } from "../types";

// --- PREMIUM ASSETS (APP STORE QUALITY) ---
// Enhanced with complex geometry, gradients, and lighting effects for a "Modern Retro" look.

export const FALLBACK_PLAYER = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="eng" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#0891b2;stop-opacity:0" />
    </linearGradient>
    <linearGradient id="hull" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#334155;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Engine Trails -->
  <path d="M44 95 L44 125 L50 95 Z" fill="url(#eng)" />
  <path d="M84 95 L84 125 L78 95 Z" fill="url(#eng)" />
  <path d="M58 90 L64 115 L70 90 Z" fill="url(#eng)" />

  <!-- Lower Wings -->
  <path d="M64 20 L100 90 L64 80 L28 90 Z" fill="url(#hull)" stroke="#06b6d4" stroke-width="1.5" />
  
  <!-- Upper Wings / Armor -->
  <path d="M64 40 L110 100 L90 90 L64 60 Z" fill="#0f172a" stroke="#22d3ee" stroke-width="1"/>
  <path d="M64 40 L18 100 L38 90 L64 60 Z" fill="#0f172a" stroke="#22d3ee" stroke-width="1"/>

  <!-- Cockpit Area -->
  <path d="M64 30 L75 60 L64 85 L53 60 Z" fill="#334155" stroke="#0ea5e9" stroke-width="1" />
  <path d="M64 45 L70 55 L58 55 Z" fill="#22d3ee" filter="url(#glow)" />
  
  <!-- Weapon Mounts -->
  <rect x="25" y="85" width="4" height="15" fill="#0ea5e9" />
  <rect x="99" y="85" width="4" height="15" fill="#0ea5e9" />
</svg>
`)}`;

export const FALLBACK_ENEMY = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="alienHull" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4c1d95;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2e1065;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#e879f9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#c026d3;stop-opacity:1" />
    </radialGradient>
    <filter id="enemyGlow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Spiked Wings (Back) -->
  <path d="M64 10 L10 50 L20 20 L64 0 L108 20 L118 50 Z" fill="#2e1065" stroke="#a855f7" stroke-width="1" />

  <!-- Main Chassis -->
  <path d="M64 120 L30 50 L45 20 L64 10 L83 20 L98 50 Z" fill="url(#alienHull)" stroke="#a855f7" stroke-width="2" filter="url(#enemyGlow)"/>
  
  <!-- Inner Bio-Mechanical Detail -->
  <path d="M64 120 L50 60 L78 60 Z" fill="#0f172a" />
  
  <!-- Glowing Core -->
  <circle cx="64" cy="45" r="14" fill="#581c87" />
  <circle cx="64" cy="45" r="8" fill="url(#coreGlow)" filter="url(#enemyGlow)" />
  <circle cx="64" cy="45" r="3" fill="#fff" />

  <!-- Side Cannons -->
  <path d="M20 50 L25 80 L35 50 Z" fill="#c026d3" />
  <path d="M108 50 L103 80 L93 50 Z" fill="#c026d3" />
  
  <!-- Engine Exhaust -->
  <path d="M55 20 L64 5 L73 20 Z" fill="#d8b4fe" />
</svg>
`)}`;

export const FALLBACK_BOSS = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="bossCore" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#e2e8f0;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#94a3b8;stop-opacity:1" />
    </radialGradient>
    <linearGradient id="bossArmor" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#cbd5e1;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#64748b;stop-opacity:1" />
    </linearGradient>
    <filter id="bossGlow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Heavy Armor Plating - White/Silver Theme -->
  <path d="M64 125 L10 50 L20 10 L64 25 L108 10 L118 50 Z" fill="url(#bossArmor)" stroke="#fff" stroke-width="3" filter="url(#bossGlow)" />
  
  <!-- Front Mandibles -->
  <path d="M10 50 L5 100 L35 80 L45 50 Z" fill="#e2e8f0" stroke="#fff" stroke-width="2"/>
  <path d="M118 50 L123 100 L93 80 L83 50 Z" fill="#e2e8f0" stroke="#fff" stroke-width="2"/>
  
  <!-- Central Weapon System -->
  <circle cx="64" cy="65" r="22" fill="#fff" stroke="#94a3b8" stroke-width="2" />
  <circle cx="64" cy="65" r="16" fill="url(#bossCore)" filter="url(#bossGlow)" />
  <circle cx="64" cy="65" r="8" fill="#cyan" opacity="0.8" />

  <!-- Energy Vents -->
  <path d="M40 30 L45 40 L35 40 Z" fill="#06b6d4" />
  <path d="M88 30 L83 40 L93 40 Z" fill="#06b6d4" />
  
  <!-- Spikes -->
  <path d="M64 125 L55 135 L73 135 Z" fill="#fff" />
</svg>
`)}`;

export const generateGameAssets = async (theme: string, style: GraphicStyle): Promise<GameAssets> => {
  // Returns high-quality static assets instantly.
  return {
    playerSprite: FALLBACK_PLAYER,
    enemySprite: FALLBACK_ENEMY,
    bossSprite: FALLBACK_BOSS,
    theme: theme 
  };
};