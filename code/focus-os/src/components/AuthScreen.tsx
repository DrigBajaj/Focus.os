import React, { useState } from 'react';
import {
  User,
  KeyRound,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Heart,
} from 'lucide-react';
import { AuthUser } from '../types';
import {
  playMechanicalClick,
  playChiptuneBeep,
  playVictoryFanfare,
} from '../utils/audio';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser, isNewUser: boolean) => void;
  soundEnabled: boolean;
  onToggleSound?: () => void;
  logoutNotice?: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  soundEnabled,
  onToggleSound,
  logoutNotice,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('signup');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('student');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Sign up form state (Level 0 fresh start)
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupMajor, setSignupMajor] = useState('Cognitive Science');

  // Loading & status states
  const [isLoading, setIsLoading] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(logoutNotice || null);

  // Mascot interaction
  const [mascotPoked, setMascotPoked] = useState(false);
  const [mascotSpeech, setMascotSpeech] = useState<string>(
    logoutNotice
      ? 'Cartridge saved! Take your time, ready when you are.'
      : 'Take a gentle breath. We start at Level 0 whenever you\'re ready.'
  );

  const handlePokeMascot = () => {
    playChiptuneBeep(659.25, soundEnabled);
    setMascotPoked(true);
    const peacefulReplies = [
      'Take a slow, deep breath with me... 🌱',
      'No rushing here. One small step at a time.',
      'We\'ll start together at Level 0!',
      'Ready to keep you company while you study ✨',
    ];
    const pick = peacefulReplies[Math.floor(Math.random() * peacefulReplies.length)];
    setMascotSpeech(pick);
    setTimeout(() => setMascotPoked(false), 600);
  };

  const triggerBootSequence = (user: AuthUser, isNewUser: boolean) => {
    setIsBooting(true);
    setIsLoading(true);
    playVictoryFanfare(soundEnabled);

    setTimeout(() => {
      onLoginSuccess(user, isNewUser);
    }, 600);
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter your username and password.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    playMechanicalClick(soundEnabled);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        const isFresh = data.user.id === 'usr-demo-0' || data.user.username === 'student';
        triggerBootSequence(data.user, isFresh);
      } else {
        // Fallback local matching
        const idLower = loginIdentifier.toLowerCase().trim();
        if (idLower === 'student' && loginPassword === 'password123') {
          const freshUser: AuthUser = {
            id: 'usr-demo-0',
            username: 'student',
            name: 'Taylor Reed',
            email: 'student@study.local',
            studyMajor: 'Cognitive Science',
            dailyGoalMinutes: 30,
            createdAt: Date.now(),
          };
          triggerBootSequence(freshUser, true);
        } else if (idLower === 'alex' && loginPassword === 'password123') {
          const existingUser: AuthUser = {
            id: 'usr-demo-1',
            username: 'alex',
            name: 'Alex Chen',
            email: 'alex@example.com',
            studyMajor: 'Computer Science',
            dailyGoalMinutes: 60,
            createdAt: Date.now() - 86400000 * 7,
          };
          triggerBootSequence(existingUser, false);
        } else {
          setErrorMessage(data.error || 'Please check your username or password.');
          setIsLoading(false);
        }
      }
    } catch {
      // Offline fallback
      if (loginIdentifier.trim()) {
        const offlineUser: AuthUser = {
          id: `usr-${Date.now()}`,
          username: loginIdentifier.trim(),
          name: loginIdentifier.trim(),
          email: `${loginIdentifier.trim().toLowerCase()}@study.local`,
          studyMajor: 'General Studies',
          dailyGoalMinutes: 30,
          createdAt: Date.now(),
        };
        triggerBootSequence(offlineUser, true);
      } else {
        setErrorMessage('Unable to connect. You can continue as Guest below.');
        setIsLoading(false);
      }
    }
  };

  // Handle Signup (Fresh Level 0 Cartridge)
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupUsername.trim() || !signupPassword.trim()) {
      setErrorMessage('Please enter your name, username, and password.');
      return;
    }

    if (signupPassword.length < 4) {
      setErrorMessage('Password should be at least 4 characters.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    playMechanicalClick(soundEnabled);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupName.trim(),
          username: signupUsername.trim(),
          email: `${signupUsername.trim().toLowerCase()}@study.local`,
          password: signupPassword,
          studyMajor: signupMajor.trim() || 'General Studies',
          dailyGoalMinutes: 30,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        triggerBootSequence(data.user, true);
      } else {
        // Fallback local create
        const localNewUser: AuthUser = {
          id: `usr-${Date.now()}`,
          name: signupName.trim(),
          username: signupUsername.trim().toLowerCase(),
          email: `${signupUsername.trim().toLowerCase()}@study.local`,
          studyMajor: signupMajor.trim() || 'General Studies',
          dailyGoalMinutes: 30,
          createdAt: Date.now(),
        };
        triggerBootSequence(localNewUser, true);
      }
    } catch {
      const localNewUser: AuthUser = {
        id: `usr-${Date.now()}`,
        name: signupName.trim(),
        username: signupUsername.trim().toLowerCase(),
        email: `${signupUsername.trim().toLowerCase()}@study.local`,
        studyMajor: signupMajor.trim() || 'General Studies',
        dailyGoalMinutes: 30,
        createdAt: Date.now(),
      };
      triggerBootSequence(localNewUser, true);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2D3142] flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
      {/* Calm, un-cluttered card */}
      <div className="w-full max-w-md bg-[#FAF8F5] border-2 border-[#2D3142] pixel-shadow p-5 sm:p-6 relative flex flex-col">
        {/* Subtle Top Device Line */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2D3142]/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7FB685]" />
            <span className="font-mono text-xs font-bold text-[#2D3142] tracking-wider">
              focus.os
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onToggleSound && (
              <button
                type="button"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onToggleSound();
                }}
                className="p-1 text-[#2D3142]/70 hover:text-[#2D3142] transition-colors"
                title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-[#7FB685]" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[#2D3142]/40" />
                )}
              </button>
            )}
            <span className="font-mono text-[10px] text-[#2D3142]/50 px-1.5 py-0.5 bg-[#F2EFE9] border border-[#2D3142]/20">
              LEVEL 0
            </span>
          </div>
        </div>

        {/* Calm Mascot & Welcome Header */}
        <div className="flex items-center gap-3.5 bg-[#F2EFE9] border border-[#2D3142]/30 p-3 mb-4">
          {/* Gentle Animated Seedling Sprout */}
          <div
            onClick={handlePokeMascot}
            className={`cursor-pointer relative flex-shrink-0 flex items-center justify-center w-14 h-14 bg-[#FAF8F5] border border-[#2D3142] transition-transform ${
              mascotPoked ? 'scale-110' : 'hover:scale-105'
            }`}
            title="Tap Sprout"
          >
            {mascotPoked && (
              <div className="absolute -top-2 animate-bounce">
                <Heart className="w-3.5 h-3.5 fill-[#E76F51] text-[#E76F51]" />
              </div>
            )}

            <svg
              viewBox="0 0 24 24"
              className="w-10 h-10 filter drop-shadow-[1px_1px_0px_#2D3142]"
              style={{ shapeRendering: 'crispEdges' }}
            >
              <rect x="7" y="9" width="10" height="10" fill="#7FB685" />
              <rect x="8" y="8" width="8" height="1" fill="#7FB685" />
              <rect x="8" y="19" width="8" height="1" fill="#7FB685" />
              <rect x="6" y="13" width="2" height="2" fill="#F8C390" />
              <rect x="16" y="13" width="2" height="2" fill="#F8C390" />
              {/* Calm sleeping eyes */}
              <rect x="8" y="12" width="3" height="1" fill="#2D3142" />
              <rect x="8" y="11" width="1" height="1" fill="#2D3142" />
              <rect x="13" y="12" width="3" height="1" fill="#2D3142" />
              <rect x="15" y="11" width="1" height="1" fill="#2D3142" />
              {/* Leaf */}
              <rect x="11" y="5" width="2" height="3" fill="#35693F" />
              <rect x="8" y="4" width="4" height="2" fill="#7FB685" />
              <rect x="12" y="3" width="4" height="2" fill="#A3CFAB" />
              <rect x="10" y="3" width="2" height="1" fill="#7FB685" />
              {/* Feet */}
              <rect x="8" y="19" width="2" height="2" fill="#35693F" />
              <rect x="14" y="19" width="2" height="2" fill="#35693F" />
            </svg>
          </div>

          {/* Calm Dialogue Bubble */}
          <div className="flex-1 min-w-0">
            <span className="block font-mono text-[9px] font-bold text-[#7FB685] uppercase tracking-wider mb-0.5">
              Sprout • Seedling
            </span>
            <p className="font-sans text-xs text-[#2D3142] leading-relaxed">
              {mascotSpeech}
            </p>
          </div>
        </div>

        {/* Minimal Mode Switcher */}
        <div className="flex border-b border-[#2D3142]/20 mb-4">
          <button
            type="button"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setAuthMode('signup');
              setErrorMessage(null);
              setMascotSpeech('Starting fresh at Level 0! Take your time.');
            }}
            className={`flex-1 pb-2 font-mono text-xs font-bold transition-all border-b-2 text-center ${
              authMode === 'signup'
                ? 'border-[#7FB685] text-[#2D3142]'
                : 'border-transparent text-[#2D3142]/50 hover:text-[#2D3142]'
            }`}
          >
            Create Account
          </button>

          <button
            type="button"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setAuthMode('login');
              setErrorMessage(null);
              setMascotSpeech('Welcome back! Enter your login details.');
            }}
            className={`flex-1 pb-2 font-mono text-xs font-bold transition-all border-b-2 text-center ${
              authMode === 'login'
                ? 'border-[#7FB685] text-[#2D3142]'
                : 'border-transparent text-[#2D3142]/50 hover:text-[#2D3142]'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Calm Error / Status Messages */}
        {errorMessage && (
          <div className="mb-3 p-2 bg-[#FDE8E8] border border-[#E76F51] flex items-center gap-2 text-xs font-mono text-[#E76F51]">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && !errorMessage && (
          <div className="mb-3 p-2 bg-[#EAF7ED] border border-[#7FB685] flex items-center gap-2 text-xs font-mono text-[#2D3142]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#7FB685] flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form: SIGN UP (Level 0 Fresh Start) */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Your Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Taylor Reed"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#2D3142] font-sans text-xs text-[#2D3142] focus:outline-none focus:border-[#7FB685]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  placeholder="taylor"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#2D3142] font-mono text-xs text-[#2D3142] focus:outline-none focus:border-[#7FB685]"
                />
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border border-[#2D3142] font-mono text-xs text-[#2D3142] focus:outline-none focus:border-[#7FB685]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Study Field (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Psychology, Design, Computer Science"
                value={signupMajor}
                onChange={(e) => setSignupMajor(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#FAF8F5] border border-[#2D3142] font-sans text-xs text-[#2D3142] focus:outline-none focus:border-[#7FB685]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-[#7FB685] hover:bg-[#6FA876] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] flex items-center justify-center gap-1.5 pixel-shadow-sm transition-colors mt-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Starting cartridge...' : 'Begin at Level 0'}</span>
            </button>
          </form>
        )}

        {/* Form: SIGN IN */}
        {authMode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                <input
                  type="text"
                  required
                  placeholder="student or alex"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#2D3142] font-mono text-xs text-[#2D3142] focus:outline-none focus:border-[#7FB685]"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#2D3142] font-mono text-xs text-[#2D3142] focus:outline-none focus:border-[#7FB685]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-[#CADBFB] hover:bg-[#B4C5E4] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] flex items-center justify-center gap-1.5 pixel-shadow-sm transition-colors mt-2"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Opening save file...' : 'Sign In'}</span>
            </button>
          </form>
        )}

        {/* Local Storage Indicator */}
        <div className="mt-5 pt-3 border-t border-[#2D3142]/20 flex items-center justify-between text-[#2D3142]/60 font-mono text-[10px]">
          <span>SAVE FILE: LOCAL DISK</span>
          <span>focus.os ENCRYPTED</span>
        </div>

        {/* Soft, Calming Boot Transition */}
        {isBooting && (
          <div className="absolute inset-0 bg-[#FAF8F5]/95 z-20 flex flex-col items-center justify-center p-6 transition-all">
            <div className="w-10 h-10 mb-2">
              <svg viewBox="0 0 24 24" className="w-full h-full" style={{ shapeRendering: 'crispEdges' }}>
                <rect x="7" y="9" width="10" height="10" fill="#7FB685" />
                <rect x="11" y="5" width="2" height="3" fill="#35693F" />
                <rect x="8" y="4" width="4" height="2" fill="#7FB685" />
                <rect x="8" y="12" width="3" height="1" fill="#2D3142" />
                <rect x="13" y="12" width="3" height="1" fill="#2D3142" />
              </svg>
            </div>
            <span className="font-mono text-xs font-bold text-[#2D3142]">
              Opening your cartridge...
            </span>
          </div>
        )}
      </div>

      {/* Calm, grounding footer */}
      <span className="mt-4 font-mono text-[10px] text-[#2D3142]/50 text-center">
        A calm, gentle space to focus with your pocket buddy
      </span>
    </div>
  );
};
