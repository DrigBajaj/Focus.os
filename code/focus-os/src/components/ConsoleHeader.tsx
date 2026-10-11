import React from 'react';
import { Volume2, VolumeX, CloudRain, BatteryCharging, Sparkles, LogOut, LogIn, User, Settings } from 'lucide-react';
import { playMechanicalClick } from '../utils/audio';
import { AuthUser } from '../types';

interface ConsoleHeaderProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
  ambientNoise: boolean;
  onToggleAmbient: () => void;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenSettings?: () => void;
}

export const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({
  soundEnabled,
  onToggleSound,
  ambientNoise,
  onToggleAmbient,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenSettings,
}) => {
  return (
    <header className="w-full bg-[#FAF8F5] border-b-2 border-[#2D3142] pb-2 sm:pb-3 pt-2 px-2 sm:px-6 select-none overflow-hidden">
      {/* Handheld top status bar */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 max-w-5xl mx-auto w-full">
        {/* Console brand logo & model */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="w-3 h-3 bg-[#7FB685] border border-[#2D3142] pixel-shadow-sm flex items-center justify-center">
            <div className="w-1 h-1 bg-[#FAF8F5]" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-sm sm:text-base font-bold tracking-tight text-[#2D3142]">
              focus.os
            </span>
            <span className="hidden xs:inline font-mono text-[9px] sm:text-[10px] font-bold px-1 py-0.2 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142]">
              DMG-09
            </span>
          </div>
        </div>

        {/* Center speaker grill slits */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#F2EFE9] border border-[#2D3142] pixel-inset-soft">
          <div className="w-4 h-1 bg-[#2D3142]/30" />
          <div className="w-4 h-1 bg-[#2D3142]/30" />
          <div className="w-4 h-1 bg-[#2D3142]/30" />
          <div className="w-4 h-1 bg-[#2D3142]/30" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#2D3142]/70 ml-1">
            STEREO SOUND
          </span>
        </div>

        {/* Right status, user account & tactile toggles */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 min-w-0">
          {/* User Account / Auth Section */}
          {currentUser ? (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-[#F2EFE9] border border-[#2D3142] sm:border-2 px-1 sm:px-1.5 py-0.5 pixel-inset-soft rounded-xs max-w-[130px] sm:max-w-none">
              <div
                title={`Signed in as ${currentUser.name} (${currentUser.studyMajor || 'Learner'})`}
                className="flex items-center gap-1 cursor-default min-w-0"
              >
                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#7FB685] border border-[#2D3142] flex items-center justify-center text-[9px] sm:text-[10px] shrink-0">
                  👤
                </div>
                <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#2D3142] max-w-[48px] xs:max-w-[70px] sm:max-w-[120px] truncate">
                  {currentUser.name}
                </span>
              </div>

              {/* Distinct Logout Button */}
              <button
                id="header-logout-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onLogout();
                }}
                title="Sign out of focus.os"
                className="pixel-btn ml-0.5 flex items-center gap-0.5 px-1 py-0.5 bg-[#FAF8F5] hover:bg-[#ffdad6] border border-[#2D3142] font-mono text-[9px] sm:text-[10px] font-bold text-[#ba1a1a] rounded-xs shrink-0"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              id="header-login-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                onOpenAuth();
              }}
              title="Sign in or create account"
              className="pixel-btn flex items-center gap-1 px-2 py-1 bg-[#7FB685] border-2 border-[#2D3142] font-mono text-[10px] sm:text-[11px] font-bold text-[#2D3142] pixel-shadow-sm rounded-xs shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* Sound FX Toggle Button */}
          <button
            id="toggle-sound-btn"
            onClick={() => {
              playMechanicalClick(true);
              onToggleSound();
            }}
            title="Toggle sound effects"
            className={`pixel-btn flex items-center justify-center p-1 sm:px-2 sm:py-1 border border-[#2D3142] sm:border-2 font-mono text-[10px] sm:text-[11px] font-bold rounded-xs shrink-0 ${
              soundEnabled
                ? 'bg-[#CADBFB] text-[#2D3142] pixel-shadow-sm'
                : 'bg-[#F2EFE9] text-[#2D3142]/60'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline ml-1">{soundEnabled ? 'FX' : 'Mute'}</span>
          </button>

          {/* Ambient Rain / Noise Toggle */}
          <button
            id="toggle-ambient-btn"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              onToggleAmbient();
            }}
            title="Toggle soothing background noise"
            className={`pixel-btn flex items-center justify-center p-1 sm:px-2 sm:py-1 border border-[#2D3142] sm:border-2 font-mono text-[10px] sm:text-[11px] font-bold rounded-xs shrink-0 ${
              ambientNoise
                ? 'bg-[#F8C390] text-[#2D3142] pixel-shadow-sm'
                : 'bg-[#F2EFE9] text-[#2D3142]/60'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline ml-1">{ambientNoise ? 'Rain' : 'Rain Off'}</span>
          </button>

          {/* Settings & Font Config Button */}
          {onOpenSettings && (
            <button
              id="header-settings-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                onOpenSettings();
              }}
              title="Open console settings & pet configuration"
              className="pixel-btn flex items-center justify-center p-1 sm:px-2 sm:py-1 bg-[#FAF8F5] hover:bg-[#CADBFB] border border-[#2D3142] sm:border-2 font-mono text-[10px] sm:text-[11px] font-bold text-[#2D3142] pixel-shadow-sm rounded-xs shrink-0"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1">Settings</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

