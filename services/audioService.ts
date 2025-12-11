// Simple Web Audio API synthesizer for retro sound effects
let audioCtx: AudioContext | null = null;
let schedulerTimer: number | null = null;
let isMusicEnabled = true;

// Timing variables
let nextNoteTime = 0.0;
let currentBeat = 0;
const bpm = 145; // Slower, heavier BPM for Hip-Hop feel
const secondsPerBeat = 60.0 / bpm;
const noteTime = secondsPerBeat / 4; // 16th notes

const getContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
};

export const initAudio = () => {
  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(err => console.log("Audio resume failed:", err));
  }
};

export const setMusicEnabled = (enabled: boolean) => {
  isMusicEnabled = enabled;
  if (!enabled) {
    stopMusic();
  } else {
    // If enabled during gameplay, music needs to be started by the component
  }
};

const makeDistortionCurve = (amount: number) => {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

// --- SCHEDULER ---

const scheduleNote = (beatNumber: number, time: number) => {
    // SIDHU STYLE BEAT PATTERN (Heavy Kick, Sharp Snare, Tumbi-style Synth)
    const step = beatNumber % 16;
    
    // KICK: Heavy 808 pattern
    // X . . X . . X . | . . X . . X . .
    if (step === 0 || step === 7 || step === 10) {
      playKick(time);
    }
    // Double kick
    if (step === 15) playKick(time);

    // SNARE: Hard hitting
    if (step === 4 || step === 12) {
      playSnare(time, 0.9);
    }
    
    // HI-HATS: Trap style rolls
    if (step % 2 === 0) {
       playHiHat(time, 0.05);
    }
    if (step === 13 || step === 14 || step === 15) {
       // Fast roll at end of bar
       playHiHat(time + (noteTime/2), 0.03); 
    }

    // TUMBI SYNTH (High pitched plucked sound)
    // Melody Pattern
    const melody = [
      600, 0, 600, 0,  700, 0, 600, 0,
      500, 0, 500, 0,  600, 600, 0, 0
    ];
    if (melody[step] > 0) {
       playTumbi(time, melody[step]);
    }

    // 808 SUB BASS (Long sustain)
    const bassVol = 2.5; 
    if (step === 0) playBass(time, 45, 0.5, bassVol); // F#1
    if (step === 7) playBass(time, 45, 0.2, bassVol); 
    if (step === 10) playBass(time, 55, 0.3, bassVol); // A1
};

const scheduler = () => {
    const ctx = getContext();
    const scheduleAheadTime = 0.1; 

    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
        scheduleNote(currentBeat, nextNoteTime);
        nextNoteTime += noteTime;
        currentBeat++;
    }
    
    schedulerTimer = window.setTimeout(scheduler, 25);
};

export const startMusic = () => {
  if (!isMusicEnabled) return;
  if (schedulerTimer) return; 

  const ctx = getContext();
  if (ctx.state === 'suspended') {
    ctx.resume().catch(e => console.error(e));
  }

  nextNoteTime = ctx.currentTime + 0.05;
  currentBeat = 0;
  
  scheduler();
};

export const stopMusic = () => {
  if (schedulerTimer) {
    window.clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
};

// --- SYNTH INSTRUMENTS ---

const playKick = (t: number) => {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const distortion = ctx.createWaveShaper();

    distortion.curve = makeDistortionCurve(800); // More distortion for aggressive kick
    distortion.oversample = '4x';

    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(0.01, t + 0.3); // Longer decay
    
    gain.gain.setValueAtTime(1.8, t); 
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.3);
};

const playSnare = (t: number, vol: number = 0.8) => {
    const ctx = getContext();
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; // Thicker snare
    filter.frequency.value = 3000;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
};

const playHiHat = (t: number, vol: number) => {
    const ctx = getContext();
    const bufferSize = ctx.sampleRate * 0.03; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 9000;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.02);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(t);
};

const playTumbi = (t: number, freq: number) => {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square'; // Sharper sound
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq + 50, t + 0.05); // Pitch bend up

    gain.gain.setValueAtTime(0.2, t); 
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);
};

const playBass = (t: number, freq: number, dur: number, vol: number) => {
    const ctx = getContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const distortion = ctx.createWaveShaper();

    distortion.curve = makeDistortionCurve(200); 

    osc.type = 'sine'; // Deep sub
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.8, t + dur); 

    gain.gain.setValueAtTime(vol, t);
    gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + dur);

    osc.connect(distortion);
    distortion.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
};

export const playLaser = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth'; 
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
};

export const playExplosion = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') return;
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  } catch (e) {}
};

export const playLevelUp = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0, now + i * 0.1 + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.2);
    });
  } catch (e) {}
};

export const playPowerUp = () => {
  try {
    const ctx = getContext();
    if (ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.4);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {}
};