import React, { useState } from 'react';
import {
  Timer,
  Sparkles,
  CheckSquare,
  Repeat,
  Wind,
  Music,
  HardDrive,
  MoreHorizontal,
  X,
  Volume2,
  VolumeX,
  CloudRain,
  User,
  LogOut,
  LogIn,
  Settings,
} from 'lucide-react';
import { ScreenTab, AuthUser } from '../types';
import { playMechanicalClick } from '../utils/audio';

interface NavigationTabsProps {
  currentTab: ScreenTab;
  onSelectTab: (tab: ScreenTab) => void;
  soundEnabled: boolean;
  activeTasksCount: number;
  isTimerRunning?: boolean;
  ambientNoise?: boolean;
  onToggleAmbient?: () => void;
  onToggleSound?: () => void;
  currentUser?: AuthUser | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onOpenSettings?: () => void;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  currentTab,
  onSelectTab,
  soundEnabled,
  activeTasksCount,
  isTimerRunning = false,
  ambientNoise = false,
  onToggleAmbient,
  onToggleSound,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenSettings,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Primary tabs visible directly on mobile bottom bar
  const primaryMobileTabs: {
    id: ScreenTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    hasPulse?: boolean;
  }[] = [
    {
      id: 'whatnow',
      label: 'Next',
      icon: <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'focus',
      label: 'Quest',
      icon: <Timer className="w-4 h-4 sm:w-5 sm:h-5" />,
      hasPulse: isTimerRunning,
    },
    {
      id: 'planner',
      label: 'Tasks',
      icon: <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />,
      badge: activeTasksCount,
    },
    {
      id: 'routines',
      label: 'Habits',
      icon: <Repeat className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
    {
      id: 'sensory',
      label: 'Calm',
      icon: <Wind className="w-4 h-4 sm:w-5 sm:h-5" />,
    },
  ];

  // Full desktop tabs list (Rendered at top of main on bigger screens - never obscures bottom)
  const desktopTabs: {
    id: ScreenTab;
    label: string;
    sub: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
    {
      id: 'whatnow',
      label: 'What Now',
      sub: 'Priority Guide',
      icon: <Sparkles className="w-4 h-4" />,
    },
    {
      id: 'focus',
      label: 'Focus Quest',
      sub: 'Paced Sprint',
      icon: <Timer className="w-4 h-4" />,
    },
    {
      id: 'planner',
      label: 'Tasks',
      sub: 'Step Planner',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: activeTasksCount,
    },
    {
      id: 'routines',
      label: 'Routines',
      sub: 'Daily Habits',
      icon: <Repeat className="w-4 h-4" />,
    },
    {
      id: 'sensory',
      label: 'Calm',
      sub: 'Breathe & Reset',
      icon: <Wind className="w-4 h-4" />,
    },
    {
      id: 'music',
      label: 'Music',
      sub: 'Lo-Fi Focus',
      icon: <Music className="w-4 h-4" />,
    },
    {
      id: 'cartridge',
      label: 'Memory',
      sub: 'Log & Notes',
      icon: <HardDrive className="w-4 h-4" />,
    },
  ];

  const isSecondaryTabActive = currentTab === 'music' || currentTab === 'cartridge';

  const handleTabClick = (tab: ScreenTab) => {
    playMechanicalClick(soundEnabled);
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP NAVIGATION BAR (Top of workspace on md and up, in normal flow) */}
      {/* ========================================================================= */}
      <nav aria-label="Desktop Navigation" className="hidden md:block w-full max-w-5xl mx-auto select-none">
        <div className="grid grid-cols-7 gap-2 p-1.5 bg-[#FAF8F5] border-2 border-[#2D3142] pixel-shadow rounded-xl">
          {desktopTabs.map((tab, idx) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`desktop-nav-tab-${tab.id}`}
                onClick={() => handleTabClick(tab.id)}
                className={`pixel-btn relative flex flex-col items-start p-2 rounded-lg border-2 border-[#2D3142] text-left transition-all ${
                  isActive
                    ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow font-bold'
                    : 'bg-[#F2EFE9] hover:bg-[#FAF8F5] text-[#2D3142]/80'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-[#2D3142]">
                      {isActive ? '◆' : `0${idx + 1}`}
                    </span>
                    <div className="text-[#2D3142]">{tab.icon}</div>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="font-mono text-[9px] font-bold px-1 bg-[#F4A261] border border-[#2D3142] text-[#2D3142] rounded-xs">
                      {tab.badge}
                    </span>
                  )}
                  {tab.id === 'focus' && isTimerRunning && (
                    <span className="w-2 h-2 rounded-full bg-[#35693F] animate-ping" />
                  )}
                </div>

                <div className="font-mono text-xs font-bold truncate w-full">
                  {tab.label}
                </div>
                <div className="font-sans text-[9px] text-[#2D3142]/70 tracking-tight truncate w-full mt-0.5">
                  {tab.sub}
                </div>

                {isActive && (
                  <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-[#35693F] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. MOBILE FLOATING DOCK (md:hidden only, leaves bigger screens unblocked) */}
      {/* ========================================================================= */}
      <div className="md:hidden">
        {/* Floating dock with generous padding and space from screen edges */}
        <nav
          aria-label="Mobile Navigation"
          className="fixed bottom-3 inset-x-2 sm:inset-x-4 max-w-md mx-auto z-40 bg-[#FAF8F5]/98 backdrop-blur-md border-2 border-[#2D3142] rounded-2xl pixel-shadow-lg p-1.5 select-none"
        >
          <div className="flex items-center justify-between gap-1">
            {primaryMobileTabs.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`mobile-nav-${tab.id}`}
                  onClick={() => handleTabClick(tab.id)}
                  className={`pixel-btn relative flex-1 flex flex-col items-center justify-center py-1.5 sm:py-2 px-0.5 sm:px-1 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#7FB685] border-2 border-[#2D3142] text-[#2D3142] font-bold pixel-shadow-sm'
                      : 'bg-transparent border-2 border-transparent hover:bg-[#F2EFE9] text-[#2D3142]/75'
                  }`}
                >
                  <div className="relative mb-0.5 sm:mb-1">
                    {tab.icon}

                    {/* Active pulse on timer */}
                    {tab.hasPulse && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#35693F] ring-2 ring-[#FAF8F5] animate-pulse" />
                    )}

                    {/* Task count badge */}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 font-mono text-[9px] font-bold px-1 bg-[#F4A261] border border-[#2D3142] text-[#2D3142] rounded-xs leading-none">
                        {tab.badge}
                      </span>
                    )}
                  </div>

                  <span className="font-mono text-[9px] xs:text-[10px] tracking-tight leading-none">
                    {tab.label}
                  </span>
                </button>
              );
            })}

            {/* "More" Tab Button */}
            <button
              id="mobile-nav-more"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                setMobileMenuOpen((prev) => !prev);
              }}
              className={`pixel-btn relative flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isSecondaryTabActive || mobileMenuOpen
                  ? 'bg-[#CADBFB] border-2 border-[#2D3142] text-[#2D3142] font-bold pixel-shadow-sm'
                  : 'bg-transparent border-2 border-transparent hover:bg-[#F2EFE9] text-[#2D3142]/75'
              }`}
            >
              <div className="relative mb-1">
                {currentTab === 'music' ? (
                  <Music className="w-4 h-4 sm:w-5 sm:h-5 text-[#2D3142]" />
                ) : currentTab === 'cartridge' ? (
                  <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-[#2D3142]" />
                ) : (
                  <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-[#2D3142]" />
                )}
                {isSecondaryTabActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#2D3142]" />
                )}
              </div>

              <span className="font-mono text-[10px] tracking-tight leading-none">
                {currentTab === 'music'
                  ? 'Music'
                  : currentTab === 'cartridge'
                  ? 'Memory'
                  : 'More'}
              </span>
            </button>
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* MOBILE "MORE" SLIDE-UP DRAWER (Spacious, easy-to-tap layout)             */}
        {/* ========================================================================= */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-[#2D3142]/60 backdrop-blur-xs select-none">
            {/* Backdrop click to dismiss */}
            <div
              className="flex-1 w-full"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                setMobileMenuOpen(false);
              }}
            />

            {/* Bottom Drawer Card with comfortable margins and padding */}
            <div className="w-full max-w-lg mx-auto bg-[#FAF8F5] border-t-3 border-x-2 border-[#2D3142] rounded-t-2xl p-5 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2.5 py-1 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142] rounded-md">
                    MORE TOOLS
                  </span>
                  <span className="font-mono text-xs font-bold text-[#2D3142]">
                    FOCUS SHORTCUTS
                  </span>
                </div>

                <button
                  id="mobile-drawer-close-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setMobileMenuOpen(false);
                  }}
                  className="pixel-btn p-1.5 bg-[#F2EFE9] hover:bg-[#E4DFD5] border border-[#2D3142] text-[#2D3142] rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Screens Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* 1. Music Screen */}
                <button
                  id="mobile-drawer-music-btn"
                  onClick={() => handleTabClick('music')}
                  className={`pixel-btn p-3.5 rounded-xl border-2 border-[#2D3142] text-left flex items-start gap-3 transition-all ${
                    currentTab === 'music'
                      ? 'bg-[#7FB685] font-bold pixel-shadow'
                      : 'bg-[#F2EFE9] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#2D3142] flex items-center justify-center shrink-0 mt-0.5">
                    <Music className="w-4 h-4 text-[#2D3142]" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-[#2D3142]">
                      MUSIC PLAYER
                    </div>
                    <div className="font-sans text-[11px] text-[#2D3142]/70 leading-snug mt-0.5">
                      Spotify & 8-bit lofi beats
                    </div>
                  </div>
                </button>

                {/* 2. Memory Cartridge Screen */}
                <button
                  id="mobile-drawer-cartridge-btn"
                  onClick={() => handleTabClick('cartridge')}
                  className={`pixel-btn p-3.5 rounded-xl border-2 border-[#2D3142] text-left flex items-start gap-3 transition-all ${
                    currentTab === 'cartridge'
                      ? 'bg-[#7FB685] font-bold pixel-shadow'
                      : 'bg-[#F2EFE9] hover:bg-[#FAF8F5]'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#2D3142] flex items-center justify-center shrink-0 mt-0.5">
                    <HardDrive className="w-4 h-4 text-[#2D3142]" />
                  </div>
                  <div>
                    <div className="font-mono text-xs font-bold text-[#2D3142]">
                      CARTRIDGE LOG
                    </div>
                    <div className="font-sans text-[11px] text-[#2D3142]/70 leading-snug mt-0.5">
                      Scratchpad & weekly stats
                    </div>
                  </div>
                </button>
              </div>

              {/* Console Settings & Pet Customizer Button */}
              {onOpenSettings && (
                <button
                  id="mobile-drawer-settings-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setMobileMenuOpen(false);
                    onOpenSettings();
                  }}
                  className="pixel-btn w-full mb-4 p-3 bg-[#FAF8F5] hover:bg-[#CADBFB] border-2 border-[#2D3142] rounded-xl flex items-center justify-between transition-all pixel-shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#CADBFB] border border-[#2D3142] flex items-center justify-center shrink-0">
                      <Settings className="w-4 h-4 text-[#2D3142]" />
                    </div>
                    <div className="text-left">
                      <div className="font-mono text-xs font-bold text-[#2D3142]">
                        SETTINGS & PET LAB
                      </div>
                      <div className="font-sans text-[11px] text-[#2D3142]/70 leading-snug">
                        Change fonts, typography, & companion creature
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#FAF8F5] border border-[#2D3142] rounded-xs">
                    CONFIG ⚙
                  </span>
                </button>
              )}

              {/* Quick Audio & Ambient Toggles Row */}
              <div className="bg-[#F2EFE9] border-2 border-[#2D3142] rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
                <span className="font-mono text-xs font-bold text-[#2D3142] uppercase">
                  SOUND CONTROLS:
                </span>

                <div className="flex items-center gap-2">
                  {onToggleSound && (
                    <button
                      id="mobile-drawer-toggle-sound"
                      onClick={() => {
                        playMechanicalClick(true);
                        onToggleSound();
                      }}
                      className={`pixel-btn px-2.5 py-1.5 border border-[#2D3142] rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 ${
                        soundEnabled ? 'bg-[#CADBFB] text-[#2D3142]' : 'bg-[#FAF8F5] text-[#2D3142]/60'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      <span>{soundEnabled ? 'FX ON' : 'MUTE'}</span>
                    </button>
                  )}

                  {onToggleAmbient && (
                    <button
                      id="mobile-drawer-toggle-ambient"
                      onClick={() => {
                        playMechanicalClick(soundEnabled);
                        onToggleAmbient();
                      }}
                      className={`pixel-btn px-2.5 py-1.5 border border-[#2D3142] rounded-lg font-mono text-[11px] font-bold flex items-center gap-1.5 ${
                        ambientNoise ? 'bg-[#F8C390] text-[#2D3142]' : 'bg-[#FAF8F5] text-[#2D3142]/60'
                      }`}
                    >
                      <CloudRain className="w-3.5 h-3.5" />
                      <span>{ambientNoise ? 'RAIN ON' : 'RAIN OFF'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* User Account / Profile status */}
              {currentUser ? (
                <div className="flex items-center justify-between bg-[#FAF8F5] border border-[#2D3142] rounded-xl p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👤</span>
                    <span className="font-mono text-xs font-bold text-[#2D3142]">
                      {currentUser.name}
                    </span>
                  </div>
                  {onLogout && (
                    <button
                      id="mobile-drawer-logout-btn"
                      onClick={() => {
                        playMechanicalClick(soundEnabled);
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="pixel-btn flex items-center gap-1.5 px-3 py-1 bg-[#FAF8F5] border border-[#ba1a1a] rounded-lg font-mono text-[11px] font-bold text-[#ba1a1a]"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>LOGOUT</span>
                    </button>
                  )}
                </div>
              ) : onOpenAuth ? (
                <button
                  id="mobile-drawer-login-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setMobileMenuOpen(false);
                    onOpenAuth();
                  }}
                  className="pixel-btn w-full py-2.5 bg-[#7FB685] border-2 border-[#2D3142] rounded-xl font-mono text-xs font-bold text-[#2D3142] flex items-center justify-center gap-2 pixel-shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span>SIGN IN TO PROFILE</span>
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
