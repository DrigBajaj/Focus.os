/**
 * Tactile Web Audio retro sound effects synthesizer.
 * Simulates vintage handheld console chiptune and mechanical clicks.
 */

let audioCtx: AudioContext | null = null;
let ambientRainSource: AudioBufferSourceNode | null = null;
let ambientRainGain: GainNode | null = null;
let ambientRainFilterLow: BiquadFilterNode | null = null;
let ambientRainFilterHigh: BiquadFilterNode | null = null;
let ambientRainDropletTimer: NodeJS.Timeout | null = null;
let ambientRainCleanupTimer: NodeJS.Timeout | null = null;
let isAmbientRainActive = false;
let cachedRainBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playMechanicalClick(soundEnabled: boolean = true) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.03);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export function playChiptuneBeep(freq = 523.25, soundEnabled: boolean = true) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.07);
  } catch {
    // Ignore
  }
}

export function playGentleBreathTone(soundEnabled: boolean = true) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(432, ctx.currentTime);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    // Ignore
  }
}

export function playQuestComplete(soundEnabled: boolean = true) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);

      gain.gain.setValueAtTime(0.09, ctx.currentTime + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.07 + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.07);
      osc.stop(ctx.currentTime + idx * 0.07 + 0.12);
    });
  } catch {
    // Ignore
  }
}

export function playVictoryFanfare(soundEnabled: boolean = true) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const melody = [
      { f: 587.33, d: 0.1 }, // D5
      { f: 659.25, d: 0.1 }, // E5
      { f: 783.99, d: 0.12 }, // G5
      { f: 880.00, d: 0.12 }, // A5
      { f: 1046.50, d: 0.28 }, // C6
    ];
    let time = ctx.currentTime;
    melody.forEach(note => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(note.f, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + note.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + note.d);
      time += note.d * 0.85;
    });
  } catch {
    // Ignore
  }
}

function createRainAudioBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedRainBuffer && cachedRainBuffer.sampleRate === ctx.sampleRate) {
    return cachedRainBuffer;
  }
  const sampleRate = ctx.sampleRate;
  const duration = 5.0; // 5-second seamless loop
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    // Paul Kellet's Pink Noise Filter + Brown Noise warmth
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    let brown = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      b6 = white * 0.115926;

      brown = (brown + 0.025 * white) / 1.025;

      // Realistic rain spectrum mix (soothing rain texture with clear acoustic presence)
      data[i] = pink * 0.15 + brown * 0.45;
    }

    // Seamless loop smoothing crossfade (first 0.3s and last 0.3s)
    const fade = Math.floor(sampleRate * 0.3);
    for (let i = 0; i < fade; i++) {
      const ratio = i / fade;
      data[i] = data[i] * ratio + data[length - fade + i] * (1 - ratio);
    }
  }

  cachedRainBuffer = buffer;
  return buffer;
}

function scheduleOrganicRaindrop(ctx: AudioContext, destination: AudioNode) {
  if (!isAmbientRainActive) return;
  try {
    const osc = ctx.createOscillator();
    const dropGain = ctx.createGain();
    const now = ctx.currentTime;

    // Droplet frequencies: 1200Hz - 2800Hz with downward pitch bend
    const startFreq = 1200 + Math.random() * 1600;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(100, startFreq * 0.45), now + 0.04);

    const dropVol = 0.015 + Math.random() * 0.02;
    dropGain.gain.setValueAtTime(dropVol, now);
    dropGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

    osc.connect(dropGain);
    dropGain.connect(destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {
    // Ignore transient audio error
  }
}

export function setAmbientWhiteNoise(enable: boolean) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ambientRainCleanupTimer) {
      clearTimeout(ambientRainCleanupTimer);
      ambientRainCleanupTimer = null;
    }

    if (!enable) {
      isAmbientRainActive = false;
      if (ambientRainDropletTimer) {
        clearInterval(ambientRainDropletTimer);
        ambientRainDropletTimer = null;
      }

      if (ambientRainGain) {
        // Smoothly fade out over 0.25s
        try {
          ambientRainGain.gain.setValueAtTime(ambientRainGain.gain.value, ctx.currentTime);
          ambientRainGain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        } catch {
          // Ignore
        }

        ambientRainCleanupTimer = setTimeout(() => {
          if (!isAmbientRainActive) {
            if (ambientRainSource) {
              try {
                ambientRainSource.stop();
                ambientRainSource.disconnect();
              } catch {}
              ambientRainSource = null;
            }
            if (ambientRainGain) {
              try {
                ambientRainGain.disconnect();
              } catch {}
              ambientRainGain = null;
            }
          }
        }, 280);
      }
      return;
    }

    // User wants rain ENABLED
    isAmbientRainActive = true;

    // Ensure audio context is running
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // If source & gain are already active, simply ramp volume back up
    if (ambientRainSource && ambientRainGain) {
      try {
        ambientRainGain.gain.setValueAtTime(ambientRainGain.gain.value, ctx.currentTime);
        ambientRainGain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 0.3);
      } catch {}
      return;
    }

    // Create rain nodes
    const buffer = createRainAudioBuffer(ctx);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(3200, ctx.currentTime);

    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(150, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.24, ctx.currentTime + 0.35);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(ctx.destination);

    source.start();

    ambientRainSource = source;
    ambientRainGain = gain;
    ambientRainFilterLow = lowpass;
    ambientRainFilterHigh = highpass;

    // Start gentle random raindrop generator
    if (ambientRainDropletTimer) clearInterval(ambientRainDropletTimer);
    ambientRainDropletTimer = setInterval(() => {
      if (isAmbientRainActive && gain) {
        scheduleOrganicRaindrop(ctx, gain);
      }
    }, 450);
  } catch (err) {
    console.error('Ambient rain audio error:', err);
  }
}

// Built-in Retro Lo-Fi synth player
let musicInterval: NodeJS.Timeout | null = null;
let isLofiPlaying = false;

export function toggleRetroLofi(enable: boolean, volume = 0.08) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (!enable) {
      isLofiPlaying = false;
      if (musicInterval) {
        clearInterval(musicInterval);
        musicInterval = null;
      }
      return;
    }

    if (isLofiPlaying) return;
    isLofiPlaying = true;

    // Cozy jazz/lo-fi chords: Cmaj7, Am7, Dm7, G7 in gentle 8-bit soft pulse
    const chords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 392.00], // Am7
      [293.66, 349.23, 440.00, 523.25], // Dm7
      [196.00, 246.94, 293.66, 349.23], // G7
    ];

    let chordIdx = 0;
    const playChord = () => {
      if (!isLofiPlaying) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      currentChord.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, ctx.currentTime);

        const startTime = ctx.currentTime + i * 0.04;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(volume / (i === 0 ? 1 : 1.8), startTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.8);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 1.9);
      });
    };

    playChord();
    musicInterval = setInterval(playChord, 2000);
  } catch {
    // Ignore
  }
}

