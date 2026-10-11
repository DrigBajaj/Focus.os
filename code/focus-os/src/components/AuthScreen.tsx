import React, { useState, useEffect } from 'react';
import {
  User,
  KeyRound,
  Mail,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Heart,
  ShieldCheck,
  Database,
  Lock,
} from 'lucide-react';
import { AuthUser } from '../types';
import {
  playMechanicalClick,
  playChiptuneBeep,
  playVictoryFanfare,
} from '../utils/audio';
import { authApi } from '../services/apiClient';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser, isNewUser: boolean, token?: string) => void;
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
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('student');
  const [loginPassword, setLoginPassword] = useState('password123');

  // Sign up form state
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupMajor, setSignupMajor] = useState('Cognitive Science');

  // Field-level error validation map
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Loading & status states
  const [isLoading, setIsLoading] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(logoutNotice || null);

  // Demo users list from server
  const [demoUsers, setDemoUsers] = useState<{ username: string; name: string; email: string; studyMajor: string }[]>([]);

  useEffect(() => {
    authApi.getDemoUsers().then((users) => {
      if (users.length > 0) setDemoUsers(users);
    });
  }, []);

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
      'All passwords are securely scrypt-hashed & encrypted!',
      'Ready to keep you company while you study ✨',
    ];
    const pick = peacefulReplies[Math.floor(Math.random() * peacefulReplies.length)];
    setMascotSpeech(pick);
    setTimeout(() => setMascotPoked(false), 600);
  };

  const triggerBootSequence = (user: AuthUser, isNewUser: boolean, token?: string) => {
    setIsBooting(true);
    setIsLoading(true);
    playVictoryFanfare(soundEnabled);

    setTimeout(() => {
      onLoginSuccess(user, isNewUser, token);
    }, 600);
  };

  // Client-side validation for Sign Up
  const validateSignupClientSide = (): boolean => {
    const errors: Record<string, string> = {};

    const name = signupName.trim();
    const username = signupUsername.trim();
    const email = signupEmail.trim();
    const password = signupPassword;

    if (!name) {
      errors.name = 'Full name is required.';
    } else if (name.length < 2) {
      errors.name = 'Name must be at least 2 characters.';
    }

    if (!username) {
      errors.username = 'Username is required.';
    } else if (username.length < 3) {
      errors.username = 'Username must be at least 3 characters.';
    } else if (username.length > 30) {
      errors.username = 'Username cannot exceed 30 characters.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.username = 'Only letters, numbers, underscores, and hyphens.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      errors.email = 'Please enter a valid email format (e.g. name@domain.com).';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Client-side validation for Login
  const validateLoginClientSide = (): boolean => {
    const errors: Record<string, string> = {};
    if (!loginIdentifier.trim()) {
      errors.identifier = 'Username or email is required.';
    }
    if (!loginPassword) {
      errors.password = 'Password is required.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLoginClientSide()) {
      setErrorMessage('Please fix the highlighted fields.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    playMechanicalClick(soundEnabled);

    const res = await authApi.login(loginIdentifier.trim(), loginPassword);

    if (res.ok && res.data?.user) {
      const isFresh = res.data.user.id === 'usr-demo-0' || res.data.user.username === 'student';
      triggerBootSequence(res.data.user, isFresh, res.data.token);
    } else {
      setIsLoading(false);
      setErrorMessage(res.error || 'Invalid credentials.');
      if (res.details) {
        setFieldErrors(res.details);
      }
    }
  };

  // Handle Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignupClientSide()) {
      setErrorMessage('Please resolve the highlighted validation errors.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    playMechanicalClick(soundEnabled);

    const computedEmail = signupEmail.trim()
      ? signupEmail.trim().toLowerCase()
      : `${signupUsername.trim().toLowerCase()}@study.local`;

    const res = await authApi.register({
      name: signupName.trim(),
      username: signupUsername.trim(),
      email: computedEmail,
      password: signupPassword,
      studyMajor: signupMajor.trim() || 'General Studies',
      dailyGoalMinutes: 30,
    });

    if (res.ok && res.data?.user) {
      triggerBootSequence(res.data.user, true, res.data.token);
    } else {
      setIsLoading(false);
      setErrorMessage(res.error || 'Registration failed.');
      if (res.details) {
        setFieldErrors(res.details);
      }
    }
  };

  const handleSelectDemoUser = (user: { username: string }) => {
    playMechanicalClick(soundEnabled);
    setAuthMode('login');
    setLoginIdentifier(user.username);
    setLoginPassword('password123');
    setFieldErrors({});
    setErrorMessage(null);
    setSuccessMessage(`Loaded ${user.username}'s credentials. Click "Sign In" below!`);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2D3142] flex flex-col items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-md bg-[#FAF8F5] border-2 border-[#2D3142] pixel-shadow p-5 sm:p-6 relative flex flex-col">
        {/* Top Console Bar */}
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
            <span className="font-mono text-[10px] text-[#2D3142]/70 px-1.5 py-0.5 bg-[#F2EFE9] border border-[#2D3142]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#7FB685]" />
              SCRYPT AUTH
            </span>
          </div>
        </div>

        {/* Mascot Header */}
        <div className="flex items-center gap-3.5 bg-[#F2EFE9] border border-[#2D3142]/30 p-3 mb-4">
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
              <rect x="8" y="12" width="3" height="1" fill="#2D3142" />
              <rect x="8" y="11" width="1" height="1" fill="#2D3142" />
              <rect x="13" y="12" width="3" height="1" fill="#2D3142" />
              <rect x="15" y="11" width="1" height="1" fill="#2D3142" />
              <rect x="11" y="5" width="2" height="3" fill="#35693F" />
              <rect x="8" y="4" width="4" height="2" fill="#7FB685" />
              <rect x="12" y="3" width="4" height="2" fill="#A3CFAB" />
              <rect x="10" y="3" width="2" height="1" fill="#7FB685" />
              <rect x="8" y="19" width="2" height="2" fill="#35693F" />
              <rect x="14" y="19" width="2" height="2" fill="#35693F" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <span className="block font-mono text-[9px] font-bold text-[#7FB685] uppercase tracking-wider mb-0.5">
              Sprout • Focus Companion
            </span>
            <p className="font-sans text-xs text-[#2D3142] leading-relaxed">
              {mascotSpeech}
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-[#2D3142]/20 mb-4">
          <button
            type="button"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setAuthMode('login');
              setErrorMessage(null);
              setFieldErrors({});
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

          <button
            type="button"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setAuthMode('signup');
              setErrorMessage(null);
              setFieldErrors({});
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
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-3 p-2 bg-[#FDE8E8] border border-[#E76F51] flex items-start gap-2 text-xs font-mono text-[#E76F51]">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && !errorMessage && (
          <div className="mb-3 p-2 bg-[#EAF7ED] border border-[#7FB685] flex items-center gap-2 text-xs font-mono text-[#2D3142]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#7FB685] flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
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
                  placeholder="student or alex"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (fieldErrors.identifier) {
                      setFieldErrors((prev) => ({ ...prev, identifier: '' }));
                    }
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border font-mono text-xs text-[#2D3142] focus:outline-none ${
                    fieldErrors.identifier ? 'border-[#E76F51] bg-[#FFF5F5]' : 'border-[#2D3142] focus:border-[#7FB685]'
                  }`}
                />
              </div>
              {fieldErrors.identifier && (
                <p className="mt-1 font-mono text-[10px] text-[#E76F51]">{fieldErrors.identifier}</p>
              )}
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: '' }));
                    }
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border font-mono text-xs text-[#2D3142] focus:outline-none ${
                    fieldErrors.password ? 'border-[#E76F51] bg-[#FFF5F5]' : 'border-[#2D3142] focus:border-[#7FB685]'
                  }`}
                />
              </div>
              {fieldErrors.password && (
                <p className="mt-1 font-mono text-[10px] text-[#E76F51]">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-[#CADBFB] hover:bg-[#B4C5E4] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] flex items-center justify-center gap-1.5 pixel-shadow-sm transition-colors mt-2"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Verifying session token...' : 'Sign In'}</span>
            </button>

            {/* Quick Demo Logins for fast evaluation */}
            <div className="mt-4 pt-3 border-t border-[#2D3142]/20">
              <span className="block font-mono text-[10px] text-[#2D3142]/60 uppercase tracking-wider mb-2">
                Quick Demo Accounts (scrypt-verified):
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {demoUsers.map((u) => (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => handleSelectDemoUser(u)}
                    className="p-1.5 bg-[#F2EFE9] hover:bg-[#EAE5DC] border border-[#2D3142]/30 text-left transition-colors"
                  >
                    <span className="block font-mono text-[10px] font-bold text-[#2D3142] truncate">
                      {u.username}
                    </span>
                    <span className="block font-sans text-[9px] text-[#2D3142]/60 truncate">
                      pw: password123
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* Form: SIGN UP */}
        {authMode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-3">
            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                <input
                  type="text"
                  placeholder="Taylor Reed"
                  value={signupName}
                  onChange={(e) => {
                    setSignupName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' }));
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border font-sans text-xs text-[#2D3142] focus:outline-none ${
                    fieldErrors.name ? 'border-[#E76F51] bg-[#FFF5F5]' : 'border-[#2D3142] focus:border-[#7FB685]'
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="mt-1 font-mono text-[10px] text-[#E76F51]">{fieldErrors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                  Username (3-30 chars)
                </label>
                <input
                  type="text"
                  placeholder="taylor_r"
                  value={signupUsername}
                  onChange={(e) => {
                    setSignupUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors((p) => ({ ...p, username: '' }));
                  }}
                  className={`w-full px-2.5 py-1.5 bg-[#FAF8F5] border font-mono text-xs text-[#2D3142] focus:outline-none ${
                    fieldErrors.username ? 'border-[#E76F51] bg-[#FFF5F5]' : 'border-[#2D3142] focus:border-[#7FB685]'
                  }`}
                />
                {fieldErrors.username && (
                  <p className="mt-1 font-mono text-[9px] text-[#E76F51]">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }));
                    }}
                    className={`w-full pl-8 pr-2.5 py-1.5 bg-[#FAF8F5] border font-mono text-xs text-[#2D3142] focus:outline-none ${
                      fieldErrors.password ? 'border-[#E76F51] bg-[#FFF5F5]' : 'border-[#2D3142] focus:border-[#7FB685]'
                    }`}
                  />
                </div>
                {fieldErrors.password && (
                  <p className="mt-1 font-mono text-[9px] text-[#E76F51]">{fieldErrors.password}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#2D3142]/40" />
                <input
                  type="email"
                  placeholder="taylor@example.com"
                  value={signupEmail}
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }));
                  }}
                  className={`w-full pl-8 pr-3 py-1.5 bg-[#FAF8F5] border font-mono text-xs text-[#2D3142] focus:outline-none ${
                    fieldErrors.email ? 'border-[#E76F51] bg-[#FFF5F5]' : 'border-[#2D3142] focus:border-[#7FB685]'
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="mt-1 font-mono text-[10px] text-[#E76F51]">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142]/80 uppercase mb-1">
                Field of Study (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Cognitive Science, Computer Science"
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
              <span>{isLoading ? 'Creating secure account...' : 'Create Account & Start Level 0'}</span>
            </button>
          </form>
        )}

        {/* Security & Persistence Notice */}
        <div className="mt-5 pt-3 border-t border-[#2D3142]/20 flex flex-wrap items-center justify-between text-[#2D3142]/60 font-mono text-[10px] gap-2">
          <span className="flex items-center gap-1">
            <Lock className="w-3 h-3 text-[#7FB685]" />
            crypto.scrypt salted
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-[#7FB685]" />
            SQLite DB Persistent
          </span>
        </div>

        {/* Booting Overlay */}
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

      <span className="mt-4 font-mono text-[10px] text-[#2D3142]/50 text-center">
        A calm, gentle space to focus with your pocket buddy
      </span>
    </div>
  );
};
