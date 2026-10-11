import React, { useState } from 'react';
import { Check, Clock, X, Sparkles, Flame } from 'lucide-react';
import { StreakInfo } from '../types';
import { playMechanicalClick, playChiptuneBeep } from '../utils/audio';

interface DailyStreakCounterProps {
  streakInfo: StreakInfo;
  soundEnabled: boolean;
  compact?: boolean;
}

export const DailyStreakCounter: React.FC<DailyStreakCounterProps> = ({
  streakInfo,
  soundEnabled,
  compact = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const {
    currentStreak,
    isTodayTargetMet,
    todayMinutes,
    targetMinutes,
    minutesRemaining,
    streakDays = [],
  } = streakInfo;

  const targetPercentage = Math.min(100, Math.round((todayMinutes / targetMinutes) * 100));

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    playMechanicalClick(soundEnabled);
    if (!showDetails) {
      playChiptuneBeep(isTodayTargetMet ? 784 : 523, soundEnabled);
    }
    setShowDetails(true);
  };

  const handleCloseDetails = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    playMechanicalClick(soundEnabled);
    setShowDetails(false);
  };

  // Day labels for recent activity tracker
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. BUTTON TRIGGER (Compact Mobile pill vs Desktop Badge)                 */}
      {/* ========================================================================= */}
      {compact ? (
        <button
          type="button"
          id="compact-daily-streak-btn"
          onClick={handleOpenDetails}
          title={`Daily Streak: ${currentStreak} days • ${todayMinutes}/${targetMinutes}m today (Tap for details)`}
          className={`pixel-btn shrink-0 flex items-center gap-1 px-2 py-0.5 border rounded-xs font-mono text-[10px] font-bold transition-all cursor-pointer select-none active:translate-y-0.5 ${
            isTodayTargetMet
              ? 'bg-[#F4A261] hover:bg-[#E76F51] border-[#2D3142] text-[#2D3142] pixel-shadow-sm'
              : 'bg-[#FFF3E8] hover:bg-[#FFE6D0] border-[#2D3142] text-[#8E4E14]'
          }`}
        >
          <span className="text-xs leading-none">🔥</span>
          <span className="whitespace-nowrap">{currentStreak}d</span>
          {isTodayTargetMet ? (
            <span className="text-[#35693F] font-bold leading-none">✓</span>
          ) : (
            <span className="text-[9px] opacity-80 font-normal whitespace-nowrap">
              {todayMinutes}/{targetMinutes}m
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          id="desktop-daily-streak-btn"
          onClick={handleOpenDetails}
          title="Click to view daily streak details & focus target"
          className={`pixel-btn flex items-center gap-2 px-2.5 py-1 rounded-md border-2 border-[#2D3142] transition-all cursor-pointer select-none active:translate-y-0.5 ${
            isTodayTargetMet
              ? 'bg-[#FFF3E8] hover:bg-[#FFE8D6] text-[#2D3142] pixel-shadow-sm'
              : 'bg-[#FAF8F5] hover:bg-[#FFF3E8] text-[#2D3142]'
          }`}
        >
          {/* Animated Pixel Fire Icon */}
          <div className="relative flex items-center justify-center shrink-0">
            <span className="text-base leading-none filter drop-shadow-[1px_1px_0px_#8E4E14]">
              🔥
            </span>
            {isTodayTargetMet && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#7FB685] ring-1 ring-[#2D3142] animate-ping" />
            )}
          </div>

          {/* Streak Count & Label */}
          <div className="flex flex-col items-start leading-none text-left">
            <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#2D3142]">
              <span>{currentStreak}</span>
              <span>DAY STREAK</span>
            </div>
            <div className="font-mono text-[9px] text-[#8E4E14] mt-0.5 whitespace-nowrap">
              {isTodayTargetMet ? (
                <span className="font-bold text-[#35693F]">✓ TARGET ACHIEVED</span>
              ) : (
                <span>
                  {todayMinutes}/{targetMinutes}m TODAY
                </span>
              )}
            </div>
          </div>

          {/* Mini Target Progress Pill */}
          <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-[#2D3142]/30 font-mono text-[10px]">
            <div className="w-12 bg-[#E4DFD5] border border-[#2D3142] h-2 rounded-xs overflow-hidden">
              <div
                className={`h-full transition-all ${
                  isTodayTargetMet ? 'bg-[#7FB685]' : 'bg-[#F4A261]'
                }`}
                style={{ width: `${targetPercentage}%` }}
              />
            </div>
            <span className="font-bold text-[#2D3142]">{targetPercentage}%</span>
          </div>
        </button>
      )}

      {/* ========================================================================= */}
      {/* 2. RESPONSIVE MODAL DIALOG WITH BACKDROP (Never clipped on mobile!)       */}
      {/* ========================================================================= */}
      {showDetails && (
        <div
          onClick={() => handleCloseDetails()}
          className="fixed inset-0 z-50 bg-[#2D3142]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm sm:max-w-md bg-[#FAF8F5] border-3 border-[#2D3142] rounded-xl pixel-shadow-lg p-4 sm:p-5 text-left animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#F4A261] border border-[#2D3142] rounded-md flex items-center justify-center text-sm shadow-xs">
                  🔥
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-[#2D3142]">
                  DAILY FOCUS STREAK
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#7FB685] border border-[#2D3142] rounded-xs text-[#2D3142]">
                  {currentStreak} DAYS
                </span>
                <button
                  type="button"
                  id="close-streak-modal-btn"
                  onClick={() => handleCloseDetails()}
                  aria-label="Close streak details"
                  className="p-1 hover:bg-[#E4DFD5] border border-transparent hover:border-[#2D3142] rounded-md text-[#2D3142] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Description */}
            <p className="font-sans text-xs text-[#2D3142] leading-relaxed mb-3">
              Maintain your daily rhythm by completing at least{' '}
              <strong className="font-mono text-[#8E4E14]">{targetMinutes} minutes</strong> of focused work every day.
            </p>

            {/* Today's Target Card */}
            <div className="p-3 bg-[#F2EFE9] border-2 border-[#2D3142] rounded-lg space-y-2 font-mono text-xs mb-3">
              <div className="flex items-center justify-between">
                <span className="text-[#2D3142]/80 font-bold">TODAY&apos;S FOCUS PROGRESS:</span>
                <span className="font-bold text-[#2D3142]">
                  {todayMinutes}m / {targetMinutes}m ({targetPercentage}%)
                </span>
              </div>

              <div className="w-full bg-[#FAF8F5] border border-[#2D3142] h-3.5 p-0.5 rounded-xs flex gap-0.5">
                <div
                  className={`h-full transition-all duration-300 ${
                    isTodayTargetMet ? 'bg-[#7FB685]' : 'bg-[#F4A261]'
                  }`}
                  style={{ width: `${targetPercentage}%` }}
                />
              </div>

              <div className="text-[11px] pt-0.5">
                {isTodayTargetMet ? (
                  <div className="flex items-center gap-1.5 text-[#35693F] font-bold">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Today&apos;s goal achieved! Streak secured for tomorrow.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[#8E4E14] font-medium">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span>{minutesRemaining}m remaining today to extend your streak.</span>
                  </div>
                )}
              </div>
            </div>

            {/* 7-Day Consistency History */}
            <div className="mb-4">
              <div className="font-mono text-[10px] font-bold uppercase text-[#2D3142]/70 mb-1.5">
                RECENT 7-DAY STREAK CONTINUITY
              </div>
              <div className="grid grid-cols-7 gap-1 text-center font-mono">
                {dayNames.map((name, idx) => {
                  const isMet = streakDays[idx] ?? false;
                  const isToday = idx === 6;
                  const metEffective = isToday ? isTodayTargetMet : isMet;

                  return (
                    <div
                      key={name}
                      className={`p-1 border rounded-xs flex flex-col items-center justify-center ${
                        isToday
                          ? metEffective
                            ? 'bg-[#7FB685] border-[#2D3142] text-[#2D3142] font-bold'
                            : 'bg-[#F8C390] border-[#2D3142] text-[#2D3142] font-bold'
                          : metEffective
                          ? 'bg-[#CADBFB] border-[#2D3142]/60 text-[#2D3142]'
                          : 'bg-[#E4DFD5] border-[#2D3142]/40 text-[#2D3142]/50'
                      }`}
                    >
                      <span className="text-[9px] uppercase">{name}</span>
                      <span className="text-xs mt-0.5">
                        {metEffective ? '✓' : isToday ? '⏱' : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Motivational Tip */}
            <div className="p-2.5 bg-[#FAF8F5] border border-[#2D3142]/40 rounded-md font-sans text-[11px] text-[#2D3142]/80 mb-3 flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#F4A261] shrink-0 mt-0.5" />
              <span>
                Tip: Complete focus sessions in the <strong>FOCUS</strong> tab or log study tasks. Every session adds toward today&apos;s streak and earns companion treats!
              </span>
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              id="dismiss-streak-modal-btn"
              onClick={() => handleCloseDetails()}
              className="pixel-btn w-full py-2 bg-[#F2EFE9] hover:bg-[#E4DFD5] border-2 border-[#2D3142] rounded-md font-mono text-xs font-bold text-[#2D3142] cursor-pointer"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}
    </>
  );
};

