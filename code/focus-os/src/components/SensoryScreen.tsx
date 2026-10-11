import React, { useState, useEffect, useRef } from 'react';
import { Wind, Play, Pause, RotateCcw, Volume2, CloudRain, Music, EyeOff, Check, Heart, Sparkles, Moon, Sun } from 'lucide-react';
import { playMechanicalClick, playGentleBreathTone } from '../utils/audio';

interface SensoryScreenProps {
  soundEnabled: boolean;
  ambientNoise?: boolean;
  onToggleAmbient?: () => void;
  isRetroLofiActive?: boolean;
  onToggleRetroLofi?: (active: boolean) => void;
  onNavigateToMusic?: () => void;
}

type BreathingPattern = 'box' | '478' | 'gentle';

interface PatternConfig {
  id: BreathingPattern;
  name: string;
  tagline: string;
  phases: { name: string; duration: number; prompt: string }[];
}

const PATTERNS: Record<BreathingPattern, PatternConfig> = {
  box: {
    id: 'box',
    name: 'Box Breathing',
    tagline: '4 · 4 · 4 · 4 Regulates focus and autonomic nervous system',
    phases: [
      { name: 'Inhale', duration: 4, prompt: 'Inhale gently through your nose' },
      { name: 'Hold', duration: 4, prompt: 'Hold gently, keep your chest soft' },
      { name: 'Exhale', duration: 4, prompt: 'Release slowly through parted lips' },
      { name: 'Rest', duration: 4, prompt: 'Rest quietly in the stillness' },
    ],
  },
  '478': {
    id: '478',
    name: '4-7-8 Calm Breath',
    tagline: '4 · 7 · 8 Deep vagal stimulation to soothe anxiety',
    phases: [
      { name: 'Inhale', duration: 4, prompt: 'Breathe in quietly through nose' },
      { name: 'Hold', duration: 7, prompt: 'Hold with ease and relaxed shoulders' },
      { name: 'Exhale', duration: 8, prompt: 'Slow, complete audible exhale' },
    ],
  },
  gentle: {
    id: 'gentle',
    name: 'Gentle Flow',
    tagline: '3 · 2 · 4 Low-effort rhythmic recovery',
    phases: [
      { name: 'Inhale', duration: 3, prompt: 'Soft breath in' },
      { name: 'Hold', duration: 2, prompt: 'Brief pause' },
      { name: 'Exhale', duration: 4, prompt: 'Gentle release' },
    ],
  },
};

const PHYSICAL_RELEASES = [
  { id: 'water', label: 'Take a slow sip of cool water', icon: '💧', tip: 'Hydrates and activates the soothing vagus reflex' },
  { id: 'shoulders', label: 'Drop your shoulders & unclench your jaw', icon: '🫁', tip: 'Releases subconscious fight-or-flight muscle bracing' },
  { id: 'eyes', label: 'Look away at something 20 feet away', icon: '👀', tip: 'Relieves optic ciliary muscle fatigue from screens' },
  { id: 'hands', label: 'Unclench your hands and open your palms', icon: '🤲', tip: 'Signals safety to your nervous system' },
  { id: 'sigh', label: 'Take one long physiological sigh', icon: '🌬️', tip: 'Double inhale through nose, one long slow exhale' },
];

export const SensoryScreen: React.FC<SensoryScreenProps> = ({
  soundEnabled,
  ambientNoise = false,
  onToggleAmbient,
  isRetroLofiActive = false,
  onToggleRetroLofi,
  onNavigateToMusic,
}) => {
  // Breathing state
  const [selectedPattern, setSelectedPattern] = useState<BreathingPattern>('box');
  const [isBreathingActive, setIsBreathingActive] = useState<boolean>(false);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState<number>(0);
  const [secondsRemainingInPhase, setSecondsRemainingInPhase] = useState<number>(PATTERNS.box.phases[0].duration);
  const [completedCycles, setCompletedCycles] = useState<number>(0);

  // Somatic Checklist state
  const [completedReleases, setCompletedReleases] = useState<string[]>([]);

  // 2-Minute Rest Mode
  const [restModeActive, setRestModeActive] = useState<boolean>(false);
  const [restSecondsLeft, setRestSecondsLeft] = useState<number>(120);

  const activePattern = PATTERNS[selectedPattern];
  const activePhase = activePattern.phases[currentPhaseIdx];

  // Breath timer loop
  useEffect(() => {
    if (!isBreathingActive) return;

    const timer = setInterval(() => {
      setSecondsRemainingInPhase((prev) => {
        if (prev <= 1) {
          // Advance to next phase
          const nextIdx = (currentPhaseIdx + 1) % activePattern.phases.length;
          setCurrentPhaseIdx(nextIdx);

          if (nextIdx === 0) {
            setCompletedCycles((c) => c + 1);
          }

          // Gentle chime on phase change
          playGentleBreathTone(soundEnabled);

          return activePattern.phases[nextIdx].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isBreathingActive, currentPhaseIdx, activePattern, soundEnabled]);

  // Rest mode timer loop
  useEffect(() => {
    if (!restModeActive) return;

    const timer = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev <= 1) {
          setRestModeActive(false);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [restModeActive]);

  const handleToggleBreathing = () => {
    playMechanicalClick(soundEnabled);
    if (!isBreathingActive) {
      playGentleBreathTone(soundEnabled);
      setIsBreathingActive(true);
    } else {
      setIsBreathingActive(false);
    }
  };

  const handleSelectPattern = (pattern: BreathingPattern) => {
    playMechanicalClick(soundEnabled);
    setSelectedPattern(pattern);
    setCurrentPhaseIdx(0);
    setSecondsRemainingInPhase(PATTERNS[pattern].phases[0].duration);
  };

  const handleResetBreath = () => {
    playMechanicalClick(soundEnabled);
    setIsBreathingActive(false);
    setCurrentPhaseIdx(0);
    setSecondsRemainingInPhase(activePattern.phases[0].duration);
  };

  const toggleRelease = (id: string) => {
    playMechanicalClick(soundEnabled);
    setCompletedReleases((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Breathing Visual Scale Calculation
  const isExpanding = activePhase.name === 'Inhale';
  const isContracting = activePhase.name === 'Exhale';
  const isHolding = activePhase.name === 'Hold';

  const scaleClass = isExpanding
    ? 'scale-110 sm:scale-125 duration-1000'
    : isContracting
    ? 'scale-90 duration-1000'
    : isHolding
    ? 'scale-105 duration-500'
    : 'scale-95 duration-500';

  const phaseColor = isExpanding
    ? 'bg-[#7FB685] text-[#2D3142]'
    : isContracting
    ? 'bg-[#CADBFB] text-[#2D3142]'
    : 'bg-[#F4A261] text-[#2D3142]';

  return (
    <div className="w-full space-y-4">
      {/* 2-Minute Screen Rest Overlay */}
      {restModeActive && (
        <div className="fixed inset-0 z-50 bg-[#1e212b]/95 text-[#FAF8F5] flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-[#2D3142] border-2 border-[#7FB685] p-6 sm:p-8 pixel-shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-3 text-[#7FB685]">
              <Moon className="w-6 h-6 animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest">
                QUIET REST MODE
              </span>
            </div>

            <div className="font-mono text-4xl sm:text-5xl font-bold text-[#FAF8F5] my-4">
              {Math.floor(restSecondsLeft / 60)}:
              {String(restSecondsLeft % 60).padStart(2, '0')}
            </div>

            <p className="font-sans text-sm sm:text-base text-[#FAF8F5]/90 mb-6 leading-relaxed">
              Close your eyes or gaze gently at something far away. Let your shoulders drop. There is nothing to fix or accomplish right now.
            </p>

            <button
              id="exit-rest-mode-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                setRestModeActive(false);
                setRestSecondsLeft(120);
              }}
              className="pixel-btn px-6 py-2.5 bg-[#FAF8F5] hover:bg-[#F2EFE9] text-[#2D3142] border-2 border-[#FAF8F5] font-mono text-xs font-bold uppercase pixel-shadow-sm"
            >
              Resume Workspace
            </button>
          </div>
        </div>
      )}

      {/* Main Calm Header & Pattern Selector */}
      <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-6 pixel-shadow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-[#2D3142] pb-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#7FB685] border border-[#2D3142] text-[#2D3142] rounded-xs">
                Calm Pacer
              </span>
              <span className="font-mono text-xs font-bold text-[#2D3142]">
                Rhythmic Breathing
              </span>
            </div>
            <p className="font-sans text-xs text-[#2D3142]/70 mt-1">
              Rhythmic breathing guides heart rate and clears mental fog without pressure or timers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="start-rest-mode-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                setRestModeActive(true);
                setRestSecondsLeft(120);
              }}
              title="Dim screen and take a quiet 2-minute visual break"
              className="pixel-btn min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F2EFE9] hover:bg-[#CADBFB] border border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] rounded-xs"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>2-Min Rest</span>
            </button>

            <button
              id="reset-breath-btn"
              onClick={handleResetBreath}
              title="Reset breath pace"
              className="pixel-btn min-h-[38px] min-w-[38px] flex items-center justify-center p-2 bg-[#F2EFE9] hover:bg-[#FAF8F5] border border-[#2D3142] text-[#2D3142] rounded-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Pattern Selection Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-6">
          {(['box', '478', 'gentle'] as BreathingPattern[]).map((patternKey) => {
            const pattern = PATTERNS[patternKey];
            const isSelected = selectedPattern === patternKey;
            return (
              <button
                key={patternKey}
                id={`pattern-tab-${patternKey}`}
                onClick={() => handleSelectPattern(patternKey)}
                className={`pixel-btn min-h-[52px] p-3 border-2 border-[#2D3142] text-left transition-all rounded-xs ${
                  isSelected
                    ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow font-bold'
                    : 'bg-[#F2EFE9] hover:bg-[#FAF8F5] text-[#2D3142]/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold">
                    {pattern.name}
                  </span>
                  <span className="font-mono text-[10px]">
                    {isSelected ? '●' : '○'}
                  </span>
                </div>
                <div className="font-sans text-[11px] text-[#2D3142]/80 leading-snug">
                  {pattern.tagline}
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Breathing Canvas */}
        <div className="bg-[#F2EFE9] border-2 border-[#2D3142] p-6 sm:p-8 pixel-inset-soft flex flex-col items-center justify-center text-center relative overflow-hidden rounded-xs">
          {/* Subtle background rhythm indicator */}
          <div className="mb-4">
            <span className={`font-mono text-xs font-bold px-3 py-1 border border-[#2D3142] rounded-xs tracking-wider ${phaseColor}`}>
              {isBreathingActive ? activePhase.name : 'Ready'}
            </span>
          </div>

          {/* Visual Breathing Ring */}
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 flex items-center justify-center my-3">
            {/* Outer subtle guide ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#2D3142]/20" />

            {/* Dynamic Expanding/Contracting Breathing Orb */}
            <div
              className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-3 border-[#2D3142] flex flex-col items-center justify-center transition-transform ease-in-out ${scaleClass} ${
                isBreathingActive
                  ? isExpanding
                    ? 'bg-[#7FB685]/80 shadow-[0_0_20px_rgba(127,182,133,0.4)]'
                    : isContracting
                    ? 'bg-[#CADBFB]/80 shadow-[0_0_15px_rgba(202,219,251,0.4)]'
                    : 'bg-[#F4A261]/80'
                  : 'bg-[#FAF8F5]'
              }`}
            >
              {isBreathingActive ? (
                <>
                  <span className="font-mono text-3xl sm:text-4xl font-bold text-[#2D3142]">
                    {secondsRemainingInPhase}s
                  </span>
                  <span className="font-mono text-[11px] tracking-wider text-[#2D3142]/80 mt-1">
                    {activePhase.name}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center">
                  <Wind className="w-8 h-8 text-[#2D3142] mb-1 opacity-70" />
                  <span className="font-mono text-xs font-bold text-[#2D3142]">
                    Tap Start
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Calming Prompt Text */}
          <p className="font-sans text-sm sm:text-base font-medium text-[#2D3142] mt-3 max-w-md h-8 flex items-center justify-center">
            {isBreathingActive ? activePhase.prompt : 'Take a comfortable posture, relax your jaw, and begin.'}
          </p>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-4">
            <button
              id="toggle-breath-pacer-btn"
              onClick={handleToggleBreathing}
              className={`pixel-btn min-h-[48px] px-6 py-3 border-2 border-[#2D3142] font-mono text-sm font-bold flex items-center gap-2 pixel-shadow rounded-xs ${
                isBreathingActive
                  ? 'bg-[#F4A261] text-[#2D3142]'
                  : 'bg-[#7FB685] hover:bg-[#A3CFAB] text-[#2D3142]'
              }`}
            >
              {isBreathingActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Breathing</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Breath Pacer</span>
                </>
              )}
            </button>
          </div>

          {completedCycles > 0 && (
            <div className="mt-3 font-mono text-[11px] text-[#2D3142]/70 flex items-center gap-1.5">
              <span>◆</span>
              <span>{completedCycles} calm cycle{completedCycles === 1 ? '' : 's'} completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Two-Column Utility: Somatic De-escalation & Peaceful Audio Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Physical Reset Micro-Actions */}
        <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-5 pixel-shadow">
          <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#2D3142]">
                Physical Reset Micro-Actions
              </span>
            </div>
            <span className="font-mono text-[10px] text-[#2D3142]/70">
              Somatic Comfort
            </span>
          </div>

          <p className="font-sans text-xs text-[#2D3142]/75 mb-3 leading-relaxed">
            ADHD & overstimulation physically brace muscles. Tap each micro-action as you try it:
          </p>

          <div className="space-y-2">
            {PHYSICAL_RELEASES.map((item) => {
              const isChecked = completedReleases.includes(item.id);
              return (
                <button
                  key={item.id}
                  id={`physical-release-${item.id}`}
                  onClick={() => toggleRelease(item.id)}
                  className={`pixel-btn min-h-[50px] w-full text-left p-2.5 border-2 border-[#2D3142] flex items-start gap-2.5 transition-all rounded-xs select-none ${
                    isChecked
                      ? 'bg-[#EBF3EC] text-[#2D3142]'
                      : 'bg-[#F2EFE9] hover:bg-[#FAF8F5] text-[#2D3142]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-xs border-2 border-[#2D3142] flex items-center justify-center shrink-0 mt-0.5 ${
                      isChecked ? 'bg-[#7FB685] text-[#2D3142]' : 'bg-[#FAF8F5]'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 font-sans text-xs font-semibold text-[#2D3142]">
                      <span>{item.icon}</span>
                      <span className={isChecked ? 'line-through opacity-75' : ''}>
                        {item.label}
                      </span>
                    </div>
                    <div className="font-sans text-[11px] text-[#2D3142]/70 mt-0.5">
                      {item.tip}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Soothing Soundscape & Calming Atmosphere */}
        <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-5 pixel-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2 mb-3">
              <span className="font-mono text-xs font-bold text-[#2D3142]">
                Calming Soundscapes
              </span>
              <span className="font-mono text-[10px] text-[#2D3142]/70">
                Auditory Masking
              </span>
            </div>

            <p className="font-sans text-xs text-[#2D3142]/75 mb-4 leading-relaxed">
              Quiet constant sound reduces sensitivity to abrupt background noises and helps calm racing thoughts.
            </p>

            <div className="space-y-3">
              {/* Brown Noise / Rain Toggle */}
              <div className="p-3 bg-[#F2EFE9] border-2 border-[#2D3142] flex items-center justify-between rounded-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-[#CADBFB] border border-[#2D3142] flex items-center justify-center rounded-xs">
                    <CloudRain className="w-4 h-4 text-[#2D3142]" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-[#2D3142]">
                      Rain & Brown Noise
                    </div>
                    <div className="font-sans text-[11px] text-[#2D3142]/70">
                      Gentle low-frequency sound blanket
                    </div>
                  </div>
                </div>

                <button
                  id="calm-toggle-rain-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    if (onToggleAmbient) onToggleAmbient();
                  }}
                  className={`pixel-btn min-h-[38px] px-3.5 py-1.5 border-2 border-[#2D3142] font-mono text-xs font-bold rounded-xs ${
                    ambientNoise
                      ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm'
                      : 'bg-[#FAF8F5] text-[#2D3142]/70'
                  }`}
                >
                  {ambientNoise ? 'Playing' : 'Play'}
                </button>
              </div>

              {/* Retro Lo-Fi Toggle */}
              <div className="p-3 bg-[#F2EFE9] border-2 border-[#2D3142] flex items-center justify-between rounded-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-[#F4A261] border border-[#2D3142] flex items-center justify-center rounded-xs">
                    <Music className="w-4 h-4 text-[#2D3142]" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-[#2D3142]">
                      Cozy 8-Bit Lo-Fi
                    </div>
                    <div className="font-sans text-[11px] text-[#2D3142]/70">
                      Soft acoustic jazz harmonic chords
                    </div>
                  </div>
                </div>

                <button
                  id="calm-toggle-lofi-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    if (onToggleRetroLofi) onToggleRetroLofi(!isRetroLofiActive);
                  }}
                  className={`pixel-btn min-h-[38px] px-3.5 py-1.5 border-2 border-[#2D3142] font-mono text-xs font-bold rounded-xs ${
                    isRetroLofiActive
                      ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm'
                      : 'bg-[#FAF8F5] text-[#2D3142]/70'
                  }`}
                >
                  {isRetroLofiActive ? 'Playing' : 'Play'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#2D3142]/20 flex items-center justify-between">
            <span className="font-sans text-[11px] text-[#2D3142]/70">
              Looking for Spotify / Apple Music?
            </span>
            <button
              id="calm-open-music-tab-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                if (onNavigateToMusic) onNavigateToMusic();
              }}
              className="font-mono text-xs font-bold text-[#2D3142] underline hover:text-[#35693F]"
            >
              Open Music Tab →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
