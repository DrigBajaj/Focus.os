import React, { useState } from 'react';
import { Sparkles, Heart, ChevronDown, ChevronUp, Lock, RefreshCw } from 'lucide-react';
import { PetState, StreakInfo } from '../types';
import { PET_SPECIES_CONFIGS, getCurrentPetStage, getNextPetStage } from '../data/petEvolutions';
import { playChiptuneBeep } from '../utils/audio';
import { DailyStreakCounter } from './DailyStreakCounter';

interface PixelPetProps {
  pet: PetState;
  onFeedBerry: () => void;
  onOpenPetSettings?: () => void;
  soundEnabled: boolean;
  isFocusActive: boolean;
  streakInfo: StreakInfo;
}

export const PixelPet: React.FC<PixelPetProps> = ({
  pet,
  onFeedBerry,
  onOpenPetSettings,
  soundEnabled,
  isFocusActive,
  streakInfo,
}) => {
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [speechIndex, setSpeechIndex] = useState(0);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  const speciesConfig = PET_SPECIES_CONFIGS[pet.id] || PET_SPECIES_CONFIGS.sprout;
  const currentStage = getCurrentPetStage(pet.id, pet.level);
  const nextStage = getNextPetStage(pet.id, pet.level);

  // Speeches based on state & species
  const speeches = isFocusActive
    ? speciesConfig.speeches.focusing
    : pet.mood === 'sleeping' || pet.level === 0
    ? speciesConfig.speeches.sleeping
    : speciesConfig.speeches.idle;

  const handlePetFeed = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (pet.berriesAvailable <= 0) {
      playChiptuneBeep(260, soundEnabled);
      return;
    }
    onFeedBerry();
    playChiptuneBeep(659.25, soundEnabled);
    setTimeout(() => playChiptuneBeep(880, soundEnabled), 100);
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 1400);
  };

  const cycleSpeech = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playChiptuneBeep(520, soundEnabled);
    setSpeechIndex((prev) => (prev + 1) % speeches.length);
  };

  const expPercentage = Math.min(100, Math.round((pet.exp / pet.maxExp) * 100));
  const expBlocks = 8;
  const filledExpBlocks = Math.round((expPercentage / 100) * expBlocks);

  const hasFood = pet.berriesAvailable > 0;

  return (
    <div className="w-full bg-[#F2EFE9] border-2 border-[#2D3142] pixel-shadow select-none">
      {/* ========================================================================= */}
      {/* MOBILE COMPACT COMPANION STRIP (md:hidden) - Saves vertical scroll        */}
      {/* ========================================================================= */}
      <div className="md:hidden bg-[#FAF8F5]">
        <div className="p-2.5 flex flex-col gap-2">
          {/* Top Row: Mini Avatar + Pet Name & Level + Quick Actions */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Mini Avatar + Stage info */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                id="mobile-pet-avatar-btn"
                onClick={() => setIsMobileExpanded((prev) => !prev)}
                title="Tap to expand companion creature stage"
                className="w-9 h-9 bg-[#EBF3EC] hover:bg-[#CADBFB] border border-[#2D3142] rounded-md flex items-center justify-center shrink-0 cursor-pointer active:translate-y-0.5 transition-transform"
              >
                {currentStage.renderSprite({
                  isFocusActive,
                  mood: pet.mood,
                  level: pet.level,
                })}
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#2D3142]">
                  <span className="truncate max-w-[90px]">{pet.name}</span>
                  <span className="text-[10px] px-1 bg-[#7FB685] border border-[#2D3142] rounded-xs shrink-0">
                    LV.{pet.level}
                  </span>
                  {isFocusActive && (
                    <span className="text-[9px] px-1 bg-[#F4A261] border border-[#2D3142] rounded-xs animate-pulse shrink-0">
                      FOCUS
                    </span>
                  )}
                </div>
                <div className="font-mono text-[10px] text-[#2D3142]/70 truncate">
                  {currentStage.title} • {pet.exp}/{pet.maxExp} XP
                </div>
              </div>
            </div>

            {/* Right: Quick Actions (Feed Treat & Expand Toggle) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="mobile-mini-feed-btn"
                onClick={handlePetFeed}
                disabled={!hasFood}
                title={
                  hasFood
                    ? `Feed ${speciesConfig.foodName}`
                    : 'Complete a task or timer to harvest food!'
                }
                className={`pixel-btn flex items-center gap-1 px-2 py-1 border rounded-md font-mono text-[10px] xs:text-[11px] font-bold ${
                  hasFood
                    ? 'bg-[#F8C390] hover:bg-[#F4A261] border-[#2D3142] text-[#2D3142]'
                    : 'bg-[#E4DFD5] border-[#2D3142]/50 text-[#2D3142]/60 cursor-not-allowed'
                }`}
              >
                {hasFood ? (
                  <>
                    <Heart className="w-3 h-3 fill-[#8E4E14] text-[#8E4E14]" />
                    <span>FEED {speciesConfig.foodEmoji} ({pet.berriesAvailable})</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-[#2D3142]/60" />
                    <span>0 {speciesConfig.foodEmoji}</span>
                  </>
                )}
              </button>

              <button
                id="mobile-expand-pet-btn"
                onClick={() => setIsMobileExpanded((prev) => !prev)}
                aria-label={isMobileExpanded ? 'Collapse pet stage' : 'Expand pet stage'}
                className="pixel-btn p-1.5 bg-[#F2EFE9] border border-[#2D3142] rounded-md text-[#2D3142] cursor-pointer"
              >
                {isMobileExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Dedicated Daily Streak Bar on Mobile - Perfectly visible & accessible */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2D3142]/20 font-mono text-[10px] overflow-hidden">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-[#8E4E14] font-bold shrink-0">STREAK:</span>
              <DailyStreakCounter
                streakInfo={streakInfo}
                soundEnabled={soundEnabled}
                compact
              />
            </div>

            {/* Target focus progress indicator */}
            <div className="flex items-center gap-1.5 shrink-0 text-[#2D3142]/80">
              <span className="whitespace-nowrap">{streakInfo.todayMinutes}/{streakInfo.targetMinutes}m</span>
              <div className="w-10 xs:w-12 bg-[#E4DFD5] border border-[#2D3142] h-2 rounded-xs overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    streakInfo.isTodayTargetMet ? 'bg-[#7FB685]' : 'bg-[#F4A261]'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((streakInfo.todayMinutes / streakInfo.targetMinutes) * 100))}%`,
                  }}
                />
              </div>
              {streakInfo.isTodayTargetMet && (
                <span className="text-[#35693F] font-bold">✓</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULL COMPANION STAGE (Always on desktop; toggleable on mobile)           */}
      {/* ========================================================================= */}
      <div className={`${isMobileExpanded ? 'block' : 'hidden md:block'} p-3 sm:p-4 border-t-2 md:border-t-0 border-[#2D3142]`}>
        {/* Top Header tab - Responsive on both mobile expanded & desktop */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b-2 border-[#2D3142] pb-2.5 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold px-1.5 py-0.5 bg-[#7FB685] text-[#2D3142] border border-[#2D3142]">
              COMPANION CREATURE
            </span>
            <span className="font-mono text-xs font-bold text-[#2D3142]">
              {pet.name} • LVL {pet.level} ({currentStage.title.toUpperCase()})
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.2 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142] rounded-xs">
              {currentStage.badge}
            </span>

            {/* Visual 'Daily Streak' Counter displayed directly next to pet status */}
            <DailyStreakCounter
              streakInfo={streakInfo}
              soundEnabled={soundEnabled}
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenPetSettings && (
              <button
                id="pet-card-change-btn"
                onClick={onOpenPetSettings}
                className="pixel-btn flex items-center gap-1 px-2 py-0.5 bg-[#FAF8F5] hover:bg-[#CADBFB] border border-[#2D3142] font-mono text-[10px] font-bold text-[#2D3142]"
              >
                <RefreshCw className="w-3 h-3" />
                <span>CHANGE PET</span>
              </button>
            )}

            <div className="flex items-center gap-1 font-mono text-[10px] text-[#2D3142]">
              <span>TREATS IN BAG:</span>
              <span className={`font-bold px-1.5 border border-[#2D3142] ${
                hasFood ? 'bg-[#F8C390] text-[#2D3142]' : 'bg-[#E4DFD5] text-[#2D3142]/60'
              }`}>
                {pet.berriesAvailable} {speciesConfig.foodEmoji}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Left: Pixel Creature Stage */}
          <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-[#FAF8F5] border-2 border-[#2D3142] pixel-inset relative min-h-[140px]">
            {/* Heart animation overlay */}
            {showHeartAnim && (
              <div className="absolute top-2 animate-bounce flex items-center gap-1 bg-[#F8C390] border border-[#2D3142] px-2 py-0.5 z-10">
                <Heart className="w-3.5 h-3.5 fill-[#8E4E14] text-[#8E4E14]" />
                <span className="font-mono text-[10px] font-bold text-[#2D3142]">+30 EXP!</span>
              </div>
            )}

            {/* Authentic 8-Bit Pixel Character Canvas / SVG based on Evolution Stage */}
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
              <div
                className={`transition-transform duration-200 ${
                  isFocusActive ? 'scale-105 animate-pulse' : 'hover:scale-105'
                }`}
              >
                {currentStage.renderSprite({
                  isFocusActive,
                  mood: pet.mood,
                  level: pet.level,
                })}
              </div>

              {pet.level === 0 && !isFocusActive && (
                <span className="absolute -top-1 right-1 font-mono text-[10px] font-bold text-[#7FB685] animate-pulse">
                  Zzz...
                </span>
              )}
            </div>

            <div className="mt-1 font-mono text-[10px] uppercase font-bold text-[#2D3142] px-2 py-0.5 bg-[#FAF8F5] border border-[#2D3142] flex items-center gap-1">
              <span>{isFocusActive ? '⚡ IN THE ZONE' : currentStage.title}</span>
            </div>

            {/* Daily Streak target indicator widget */}
            <div className="mt-2 w-full flex justify-center">
              <DailyStreakCounter streakInfo={streakInfo} soundEnabled={soundEnabled} />
            </div>

            {nextStage && (
              <span className="font-mono text-[9px] text-[#2D3142]/70 mt-0.5">
                Next evolution at Lvl {nextStage.minLevel}
              </span>
            )}
          </div>

          {/* Right: Dialogue Box & Interactions */}
          <div className="sm:col-span-8 flex flex-col justify-between h-full space-y-2.5">
            {/* Retro RPG Dialogue Box */}
            <div
              onClick={cycleSpeech}
              className="cursor-pointer bg-[#FAF8F5] border-2 border-[#2D3142] p-3 pixel-shadow-sm relative group hover:bg-[#FAF8FF] transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] font-bold text-[#35693F] tracking-wider uppercase">
                  {pet.name.toUpperCase()} SPEAKS
                </span>
                <span className="font-mono text-[9px] text-[#2D3142]/60 group-hover:text-[#2D3142]">
                  [TAP TO TALK]
                </span>
              </div>
              <p className="font-sans text-xs sm:text-sm text-[#2D3142] leading-relaxed">
                {speeches[speechIndex % speeches.length]}
              </p>
              <div className="absolute bottom-2 right-2 font-mono text-[10px] text-[#2D3142] blink-cursor">
                ▼
              </div>
            </div>

            {/* Growth & EXP Progress */}
            <div className="space-y-1.5 bg-[#FAF8F5] border border-[#2D3142] p-2.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[#2D3142]">GROWTH EXP</span>
                  <span className="text-[10px] px-1 bg-[#EBF3EC] border border-[#2D3142] rounded-xs text-[#35693F]">
                    STAGE {currentStage.stage}/4
                  </span>
                </div>
                <span className="text-[#2D3142]/80">
                  {pet.exp} / {pet.maxExp} XP ({expPercentage}%)
                </span>
              </div>

              <div className="w-full bg-[#E4DFD5] border-2 border-[#2D3142] h-4 p-0.5 flex gap-1">
                {Array.from({ length: expBlocks }).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-full transition-colors ${
                      i < filledExpBlocks ? 'bg-[#7FB685]' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Action Button: Feed Treat - LOCKED UNTIL WORK IS DONE */}
            <div>
              {hasFood ? (
                <button
                  id="feed-berry-btn"
                  onClick={handlePetFeed}
                  className="pixel-btn w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#F8C390] hover:bg-[#F4A261] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm text-center"
                >
                  <Heart className="w-3.5 h-3.5 fill-[#8E4E14] text-[#8E4E14] shrink-0" />
                  <span className="truncate">
                    FEED {speciesConfig.foodName.toUpperCase()} ({pet.berriesAvailable}) • +30 XP
                  </span>
                </button>
              ) : (
                <div className="space-y-1">
                  <button
                    id="feed-berry-btn-disabled"
                    disabled
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#E4DFD5] border-2 border-[#2D3142]/60 font-mono text-xs font-bold text-[#2D3142]/60 cursor-not-allowed text-center"
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">OUT OF FOOD (0 {speciesConfig.foodEmoji} AVAILABLE)</span>
                  </button>
                  <div className="flex items-center justify-center gap-1 font-mono text-[10px] text-[#8E4E14] bg-[#FFF3E8] border border-[#F4A261] px-2 py-0.5 rounded-xs text-center">
                    <span>💡 Complete a task, routine, or timer to harvest treats!</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
