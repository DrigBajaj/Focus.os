import React, { useState } from 'react';
import {
  X,
  Type,
  Sparkles,
  Heart,
  Volume2,
  VolumeX,
  CloudRain,
  Check,
  RotateCcw,
  Zap,
  Info,
} from 'lucide-react';
import {
  FontSettings,
  FontFamilyOption,
  FontSizeOption,
  PetSpecies,
  PetState,
} from '../types';
import { PET_SPECIES_CONFIGS, getCurrentPetStage } from '../data/petEvolutions';
import { playMechanicalClick, playChiptuneBeep } from '../utils/audio';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  fontSettings: FontSettings;
  onUpdateFontSettings: (settings: FontSettings) => void;
  pet: PetState;
  onUpdatePet: (updatedPet: Partial<PetState>) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  ambientNoise: boolean;
  onToggleAmbient: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  fontSettings,
  onUpdateFontSettings,
  pet,
  onUpdatePet,
  soundEnabled,
  onToggleSound,
  ambientNoise,
  onToggleAmbient,
}) => {
  const [activeTab, setActiveTab] = useState<'fonts' | 'pet' | 'rewards' | 'sound'>('fonts');
  const [petNameInput, setPetNameInput] = useState(pet.name);

  if (!isOpen) return null;

  const fontFamilies: { id: FontFamilyOption; label: string; desc: string; sample: string }[] = [
    {
      id: 'default',
      label: 'Plus Jakarta Sans',
      desc: 'Clean, modern, highly legible geometric sans-serif',
      sample: 'Focus gently, one step at a time.',
    },
    {
      id: 'mono',
      label: 'Space Mono',
      desc: 'Retro 8-bit chiptune monospace typewriter aesthetic',
      sample: 'RUNNING FOCUS_LOOP.EXE // 100% OK',
    },
    {
      id: 'lexend',
      label: 'Lexend',
      desc: 'Scientifically designed to maximize reading speed & fluency',
      sample: 'Designed for effortless visual scanning.',
    },
    {
      id: 'dyslexic',
      label: 'Comic Neue / Dyslexia-Friendly',
      desc: 'Distinct letterforms that reduce character reversal & visual crowding',
      sample: 'Clear b/d/p/q distinction with gentle organic curves.',
    },
    {
      id: 'arcade',
      label: 'VT323 Pixel Arcade',
      desc: 'Authentic retro CRT arcade console scanline font',
      sample: 'INSERT COIN TO INITIALIZE QUEST >>',
    },
  ];

  const fontSizes: { id: FontSizeOption; label: string; pct: string }[] = [
    { id: 'compact', label: 'Compact', pct: '92%' },
    { id: 'standard', label: 'Standard', pct: '100%' },
    { id: 'large', label: 'Relaxed', pct: '108%' },
    { id: 'extralarge', label: 'Accessible', pct: '118%' },
  ];

  const speciesList: PetSpecies[] = ['sprout', 'ember', 'bubbles', 'pip', 'mochi'];
  const currentSpeciesConfig = PET_SPECIES_CONFIGS[pet.id] || PET_SPECIES_CONFIGS.sprout;

  const handleSelectFontFamily = (family: FontFamilyOption) => {
    playMechanicalClick(soundEnabled);
    onUpdateFontSettings({ ...fontSettings, family });
  };

  const handleSelectFontSize = (size: FontSizeOption) => {
    playMechanicalClick(soundEnabled);
    onUpdateFontSettings({ ...fontSettings, size });
  };

  const handleToggleSpacing = () => {
    playMechanicalClick(soundEnabled);
    onUpdateFontSettings({
      ...fontSettings,
      increasedSpacing: !fontSettings.increasedSpacing,
    });
  };

  const handleSelectSpecies = (species: PetSpecies) => {
    playMechanicalClick(soundEnabled);
    playChiptuneBeep(700, soundEnabled);
    const newConfig = PET_SPECIES_CONFIGS[species];
    onUpdatePet({
      id: species,
      name: petNameInput === currentSpeciesConfig.defaultName ? newConfig.defaultName : petNameInput,
    });
    if (petNameInput === currentSpeciesConfig.defaultName) {
      setPetNameInput(newConfig.defaultName);
    }
  };

  const handleSavePetName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petNameInput.trim()) return;
    playMechanicalClick(soundEnabled);
    onUpdatePet({ name: petNameInput.trim() });
    playChiptuneBeep(880, soundEnabled);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#2D3142]/70 backdrop-blur-xs select-none animate-in fade-in duration-150"
    >
      {/* Backdrop Dismiss */}
      <div
        className="absolute inset-0"
        onClick={() => {
          playMechanicalClick(soundEnabled);
          onClose();
        }}
      />

      {/* Main Console Modal Chassis */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-[#FAF8F5] border-3 border-[#2D3142] rounded-xl pixel-shadow-lg flex flex-col overflow-hidden z-10">
        {/* Top Hardware Title Bar */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 bg-[#FAF8F5] border-b-2 border-[#2D3142]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142]">
              CONFIG MENU
            </span>
            <span className="font-mono text-xs font-bold text-[#2D3142]">
              focus.os SETTINGS & PET LAB
            </span>
          </div>

          <button
            id="close-settings-modal-btn"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              onClose();
            }}
            aria-label="Close Settings"
            className="pixel-btn p-1 bg-[#F2EFE9] hover:bg-[#ffdad6] border border-[#2D3142] rounded-md text-[#2D3142]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector Row */}
        <div className="grid grid-cols-4 border-b-2 border-[#2D3142] bg-[#F2EFE9]">
          <button
            id="settings-tab-fonts"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setActiveTab('fonts');
            }}
            className={`pixel-btn min-h-[40px] py-2 px-1 sm:px-3 font-mono text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 border-r border-[#2D3142] transition-colors ${
              activeTab === 'fonts'
                ? 'bg-[#FAF8F5] text-[#2D3142] border-b-2 border-b-[#FAF8F5] -mb-[2px] font-bold'
                : 'bg-transparent text-[#2D3142]/70 hover:bg-[#FAF8F5]/60'
            }`}
          >
            <Type className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">FONTS & TEXT</span>
            <span className="sm:hidden">FONTS</span>
          </button>

          <button
            id="settings-tab-pet"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setActiveTab('pet');
            }}
            className={`pixel-btn min-h-[40px] py-2 px-1 sm:px-3 font-mono text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 border-r border-[#2D3142] transition-colors ${
              activeTab === 'pet'
                ? 'bg-[#FAF8F5] text-[#2D3142] border-b-2 border-b-[#FAF8F5] -mb-[2px] font-bold'
                : 'bg-transparent text-[#2D3142]/70 hover:bg-[#FAF8F5]/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#F4A261] shrink-0" />
            <span className="hidden sm:inline">PET & EVO</span>
            <span className="sm:hidden">PET</span>
          </button>

          <button
            id="settings-tab-rewards"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setActiveTab('rewards');
            }}
            className={`pixel-btn min-h-[40px] py-2 px-1 sm:px-3 font-mono text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 border-r border-[#2D3142] transition-colors ${
              activeTab === 'rewards'
                ? 'bg-[#FAF8F5] text-[#2D3142] border-b-2 border-b-[#FAF8F5] -mb-[2px] font-bold'
                : 'bg-transparent text-[#2D3142]/70 hover:bg-[#FAF8F5]/60'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-[#E76F51] shrink-0" />
            <span className="hidden sm:inline">RULES</span>
            <span className="sm:hidden">RULES</span>
          </button>

          <button
            id="settings-tab-sound"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setActiveTab('sound');
            }}
            className={`pixel-btn min-h-[40px] py-2 px-1 sm:px-3 font-mono text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-colors ${
              activeTab === 'sound'
                ? 'bg-[#FAF8F5] text-[#2D3142] border-b-2 border-b-[#FAF8F5] -mb-[2px] font-bold'
                : 'bg-transparent text-[#2D3142]/70 hover:bg-[#FAF8F5]/60'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5 shrink-0" />
            <span>AUDIO</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ========================================================================= */}
          {/* TAB 1: FONTS & TYPOGRAPHY SETTINGS                                        */}
          {/* ========================================================================= */}
          {activeTab === 'fonts' && (
            <div className="space-y-4">
              {/* Family Selector */}
              <div>
                <label className="block font-mono text-xs font-bold text-[#2D3142] uppercase mb-2">
                  1. CHOOSE FONT FAMILY
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {fontFamilies.map((ff) => {
                    const isSelected = fontSettings.family === ff.id;
                    return (
                      <button
                        key={ff.id}
                        id={`font-family-btn-${ff.id}`}
                        onClick={() => handleSelectFontFamily(ff.id)}
                        className={`pixel-btn p-3 rounded-lg border-2 border-[#2D3142] text-left transition-all ${
                          isSelected
                            ? 'bg-[#7FB685] font-bold pixel-shadow'
                            : 'bg-[#F2EFE9] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-[#2D3142]">
                            {ff.label}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#2D3142]" />}
                        </div>
                        <p className="font-sans text-[11px] text-[#2D3142]/75 leading-tight mb-2">
                          {ff.desc}
                        </p>
                        <div className="px-2 py-1 bg-[#FAF8F5] border border-[#2D3142] text-xs text-[#2D3142] truncate">
                          {ff.sample}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size Scaling */}
              <div>
                <label className="block font-mono text-xs font-bold text-[#2D3142] uppercase mb-2">
                  2. FONT SIZE SCALE
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {fontSizes.map((fs) => {
                    const isSelected = fontSettings.size === fs.id;
                    return (
                      <button
                        key={fs.id}
                        id={`font-size-btn-${fs.id}`}
                        onClick={() => handleSelectFontSize(fs.id)}
                        className={`pixel-btn py-2 px-3 rounded-lg border-2 border-[#2D3142] text-center ${
                          isSelected
                            ? 'bg-[#CADBFB] font-bold pixel-shadow-sm'
                            : 'bg-[#F2EFE9] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="font-mono text-xs font-bold text-[#2D3142]">
                          {fs.label}
                        </div>
                        <div className="font-mono text-[10px] text-[#2D3142]/70">
                          {fs.pct}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Neurodivergent / Dyslexic Spacing Toggle */}
              <div className="p-3 bg-[#FAF8F5] border-2 border-[#2D3142] rounded-xl flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#2D3142]">
                      ROOMY LINE & LETTER SPACING
                    </span>
                    <span className="font-mono text-[9px] px-1 bg-[#7FB685] text-[#2D3142] border border-[#2D3142] rounded-xs">
                      ADHD & DYSLEXIA
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#2D3142]/70 mt-0.5">
                    Expands vertical line height to 1.65x and increases character spacing to reduce visual crowding.
                  </p>
                </div>

                <button
                  id="toggle-font-spacing-btn"
                  onClick={handleToggleSpacing}
                  className={`pixel-btn px-3 py-1.5 border-2 border-[#2D3142] rounded-lg font-mono text-xs font-bold shrink-0 ${
                    fontSettings.increasedSpacing
                      ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm'
                      : 'bg-[#F2EFE9] text-[#2D3142]/70'
                  }`}
                >
                  {fontSettings.increasedSpacing ? 'ROOMY ON' : 'NORMAL'}
                </button>
              </div>

              {/* Live Interactive Preview Box */}
              <div className="p-3 bg-[#EBF3EC] border-2 border-[#2D3142] rounded-xl">
                <div className="font-mono text-[10px] font-bold text-[#35693F] uppercase tracking-wider mb-1">
                  LIVE TYPOGRAPHY PREVIEW:
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-sm text-[#2D3142]">
                    Review Operating Systems Lecture 8 & Finish DBMS Assignment
                  </div>
                  <div className="text-xs text-[#2D3142]/80">
                    Break down complex tasks into manageable micro-steps. High stamina points grant delicious food for your companion!
                  </div>
                  <div className="font-mono text-[10px] text-[#2D3142]/70 pt-1">
                    ~25m estimated • 2 SP • Level {pet.level} Companion
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PET COMPANION & EVOLUTION SYSTEM                                   */}
          {/* ========================================================================= */}
          {activeTab === 'pet' && (
            <div className="space-y-4">
              {/* Species Selector */}
              <div>
                <label className="block font-mono text-xs font-bold text-[#2D3142] uppercase mb-2">
                  CHOOSE YOUR COMPANION CREATURE
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {speciesList.map((sp) => {
                    const cfg = PET_SPECIES_CONFIGS[sp];
                    const isSelected = pet.id === sp;
                    const stage = getCurrentPetStage(sp, pet.level);

                    return (
                      <button
                        key={sp}
                        id={`select-pet-${sp}`}
                        onClick={() => handleSelectSpecies(sp)}
                        className={`pixel-btn p-2 rounded-xl border-2 border-[#2D3142] flex flex-col items-center text-center transition-all ${
                          isSelected
                            ? 'bg-[#7FB685] font-bold pixel-shadow ring-2 ring-[#2D3142]'
                            : 'bg-[#F2EFE9] hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <div className="w-12 h-12 flex items-center justify-center my-1">
                          {stage.renderSprite({ isFocusActive: false, mood: 'happy', level: pet.level })}
                        </div>
                        <span className="font-mono text-xs font-bold text-[#2D3142] capitalize truncate w-full">
                          {cfg.defaultName}
                        </span>
                        <span className="font-sans text-[10px] text-[#2D3142]/70 truncate w-full">
                          {cfg.element}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rename Companion */}
              <div className="p-3 bg-[#FAF8F5] border-2 border-[#2D3142] rounded-xl">
                <form onSubmit={handleSavePetName} className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 w-full">
                    <label className="block font-mono text-[10px] font-bold text-[#2D3142] uppercase mb-1">
                      NICKNAME YOUR COMPANION
                    </label>
                    <input
                      id="pet-nickname-input"
                      type="text"
                      value={petNameInput}
                      onChange={(e) => setPetNameInput(e.target.value)}
                      maxLength={18}
                      className="w-full px-3 py-1.5 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-xs text-[#2D3142] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="pixel-btn sm:self-end px-4 py-2 bg-[#CADBFB] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm whitespace-nowrap"
                  >
                    SAVE NAME
                  </button>
                </form>
              </div>

              {/* Evolution Tree for Selected Creature */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-[#2D3142] uppercase">
                    EVOLUTION LINE ({currentSpeciesConfig.defaultName})
                  </span>
                  <span className="font-mono text-[10px] text-[#2D3142]/70">
                    YOUR LEVEL: {pet.level}
                  </span>
                </div>

                <div className="space-y-2">
                  {currentSpeciesConfig.stages.map((stg) => {
                    const isUnlocked = pet.level >= stg.minLevel;
                    const isCurrent = getCurrentPetStage(pet.id, pet.level).stage === stg.stage;

                    return (
                      <div
                        key={stg.stage}
                        className={`p-3 rounded-xl border-2 border-[#2D3142] flex items-center gap-3 transition-all ${
                          isCurrent
                            ? 'bg-[#7FB685]/30 border-[#2D3142] pixel-shadow'
                            : isUnlocked
                            ? 'bg-[#FAF8F5]'
                            : 'bg-[#E4DFD5]/50 opacity-60'
                        }`}
                      >
                        <div className="w-14 h-14 bg-[#FAF8F5] border border-[#2D3142] rounded-lg flex items-center justify-center shrink-0">
                          {stg.renderSprite({ isFocusActive: false, mood: 'happy', level: pet.level })}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#2D3142]">
                              {stg.title}
                            </span>
                            <span className="font-mono text-[9px] px-1.5 py-0.2 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142] rounded-xs">
                              {stg.badge}
                            </span>
                            {isCurrent && (
                              <span className="font-mono text-[9px] px-1 bg-[#7FB685] text-[#2D3142] border border-[#2D3142] font-bold rounded-xs">
                                CURRENT FORM
                              </span>
                            )}
                          </div>
                          <p className="font-sans text-[11px] text-[#2D3142]/80 mt-0.5 leading-snug">
                            {stg.description}
                          </p>
                          <div className="font-mono text-[9px] text-[#2D3142]/60 mt-1">
                            {isUnlocked
                              ? '✓ Unlocked'
                              : `Unlocks at Level ${stg.minLevel} (${stg.minLevel - pet.level} levels to go)`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: WORK & FEEDING GUIDE                                               */}
          {/* ========================================================================= */}
          {activeTab === 'rewards' && (
            <div className="space-y-4">
              {/* How Feeding Works Card */}
              <div className="p-3.5 bg-[#FFF3E8] border-2 border-[#2D3142] rounded-xl pixel-shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🍓</span>
                  <div className="font-mono text-xs font-bold text-[#8E4E14] uppercase">
                    WORK-TO-FEED RULE (EARNING TREATS)
                  </div>
                </div>
                <p className="font-sans text-xs text-[#2D3142] leading-relaxed">
                  Your companion only eats when you earn treats by finishing real work! Each time you clear a task, finish a focus timer, or check off a daily habit, you harvest delicious treats into your bag.
                </p>
              </div>

              {/* Current Bag Status */}
              <div className="p-3 bg-[#FAF8F5] border-2 border-[#2D3142] rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] text-[#2D3142]/70 uppercase">
                    TREATS IN BAG RIGHT NOW
                  </div>
                  <div className="font-mono text-lg font-bold text-[#2D3142]">
                    {pet.berriesAvailable} {currentSpeciesConfig.foodName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] text-[#2D3142]/70 uppercase">
                    ALL-TIME FED
                  </div>
                  <div className="font-mono text-base font-bold text-[#7FB685]">
                    {pet.berriesFed} treats
                  </div>
                </div>
              </div>

              {/* Work XP Table */}
              <div>
                <span className="block font-mono text-xs font-bold text-[#2D3142] uppercase mb-2">
                  HOW TO EARN FOOD & WORK XP
                </span>
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#FAF8F5] border border-[#2D3142] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✅</span>
                      <div>
                        <div className="font-mono text-xs font-bold text-[#2D3142]">
                          COMPLETE A TASK
                        </div>
                        <div className="font-sans text-[11px] text-[#2D3142]/70">
                          Clear any task on your list
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#35693F] px-2 py-0.5 bg-[#EBF3EC] border border-[#2D3142] rounded-xs">
                      +1 TREAT 🍓 • +25 XP
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#FAF8F5] border border-[#2D3142] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">⏱️</span>
                      <div>
                        <div className="font-mono text-xs font-bold text-[#2D3142]">
                          FINISH FOCUS TIMER
                        </div>
                        <div className="font-sans text-[11px] text-[#2D3142]/70">
                          Complete a 10m sprint or 25m sprint
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#35693F] px-2 py-0.5 bg-[#EBF3EC] border border-[#2D3142] rounded-xs">
                      +1 to +2 TREATS 🍓
                    </span>
                  </div>

                  <div className="p-2.5 bg-[#FAF8F5] border border-[#2D3142] rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔁</span>
                      <div>
                        <div className="font-mono text-xs font-bold text-[#2D3142]">
                          CHECK DAILY ROUTINE
                        </div>
                        <div className="font-sans text-[11px] text-[#2D3142]/70">
                          Water, declutter, or meditation habit
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#35693F] px-2 py-0.5 bg-[#EBF3EC] border border-[#2D3142] rounded-xs">
                      +1 TREAT 🍓 • +20 XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: AUDIO & SOUND EFFECTS                                              */}
          {/* ========================================================================= */}
          {activeTab === 'sound' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#FAF8F5] border-2 border-[#2D3142] rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-[#2D3142]">
                    8-BIT MECHANICAL SOUND EFFECTS
                  </div>
                  <p className="font-sans text-xs text-[#2D3142]/70 mt-0.5">
                    Tactile clicks, chiptune level-up beeps, and fanfare celebrations.
                  </p>
                </div>
                <button
                  id="settings-toggle-sound"
                  onClick={() => {
                    playMechanicalClick(true);
                    onToggleSound();
                  }}
                  className={`pixel-btn px-3 py-1.5 border-2 border-[#2D3142] rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 ${
                    soundEnabled
                      ? 'bg-[#CADBFB] text-[#2D3142] pixel-shadow-sm'
                      : 'bg-[#F2EFE9] text-[#2D3142]/60'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  <span>{soundEnabled ? 'FX ACTIVE' : 'MUTED'}</span>
                </button>
              </div>

              <div className="p-3 bg-[#FAF8F5] border-2 border-[#2D3142] rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-[#2D3142]">
                    AMBIENT RAIN & BROWN NOISE
                  </div>
                  <p className="font-sans text-xs text-[#2D3142]/70 mt-0.5">
                    Cozy soothing synthesized rain to mask environmental distractions.
                  </p>
                </div>
                <button
                  id="settings-toggle-ambient"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    onToggleAmbient();
                  }}
                  className={`pixel-btn px-3 py-1.5 border-2 border-[#2D3142] rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 ${
                    ambientNoise
                      ? 'bg-[#F8C390] text-[#2D3142] pixel-shadow-sm'
                      : 'bg-[#F2EFE9] text-[#2D3142]/60'
                  }`}
                >
                  <CloudRain className="w-4 h-4" />
                  <span>{ambientNoise ? 'PLAYING' : 'OFF'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#FAF8F5] border-t-2 border-[#2D3142] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#2D3142]/70 font-mono text-[10px]">
            <span>focus.os DMG-09</span>
            <span>•</span>
            <span>SETTINGS STORED LOCALLY</span>
          </div>

          <button
            id="settings-done-btn"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              onClose();
            }}
            className="pixel-btn px-4 py-1.5 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] rounded-lg font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
