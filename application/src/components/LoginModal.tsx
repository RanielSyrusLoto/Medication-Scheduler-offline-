import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, AlertCircle, CheckCircle, ArrowLeft, KeyRound, Eye, EyeOff, Pill, Sun, Moon } from 'lucide-react';
import { callApi } from '../utils/pywebview';
import { User } from '../types';

interface LoginModalProps {
  onLoginSuccess: (user: User) => void;
}

type ViewMode = 'auth' | 'forgot_request' | 'forgot_verify';

interface StatusMessage {
  text: string;
  isError: boolean;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [isRegister, setIsRegister] = useState<boolean>(false);

  const [name, setName] = useState<string>('');
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [resetIdent, setResetIdent] = useState<string>('');
  const [resetEmail, setResetEmail] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [message, setMessage] = useState<StatusMessage>({ text: '', isError: false });
  const [loading, setLoading] = useState<boolean>(false);

  const [localTheme, setLocalTheme] = useState<string>(() => {
    return localStorage.getItem('med_app_theme') || 'light';
  });

  const toggleLoginTheme = () => {
    const nextTheme = localTheme === 'dark' ? 'light' : 'dark';
    setLocalTheme(nextTheme);
    try {
      localStorage.setItem('med_app_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: '', isError: false });
    setLoading(true);

    try {
      if (isRegister) {
        const res = await callApi('register', name, identifier, password);
        if (res.success) {
          setMessage({ text: res.message || 'Account created! Please sign in.', isError: false });
          setIsRegister(false);
        } else {
          setMessage({ text: res.message || 'Registration failed.', isError: true });
        }
      } else {
        const res = await callApi('login', identifier, password);
        if (res.success && res.user) {
          if (rememberMe) {
            const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000;
            localStorage.setItem('med_user_session', JSON.stringify({ user: res.user, expiry }));
            try {
              await callApi('save_remember_session', res.user.user_id);
            } catch (err) {
              console.error('Failed saving SQLite remember session:', err);
            }
          } else {
            localStorage.removeItem('med_user_session');
          }
          onLoginSuccess(res.user);
        } else {
          setMessage({ text: res.message || 'Invalid username or password.', isError: true });
        }
      }
    } catch (err) {
      setMessage({ text: 'Error connecting to application service.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetIdent.trim()) {
      setMessage({ text: 'Please enter your username or registered email.', isError: true });
      return;
    }
    setMessage({ text: '', isError: false });
    setLoading(true);

    try {
      const res = await callApi('request_password_reset', resetIdent);
      if (res.success) {
        setResetEmail(res.email || '');
        setViewMode('forgot_verify');
        setMessage({ text: res.message || 'Verification code sent to your email address!', isError: false });
      } else {
        setMessage({ text: res.message || 'Failed to send verification code.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'Error requesting password reset.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || !newPassword || !confirmPassword) {
      setMessage({ text: 'Please fill in all fields.', isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New passwords do not match.', isError: true });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ text: 'Password must be at least 6 characters long.', isError: true });
      return;
    }

    setMessage({ text: '', isError: false });
    setLoading(true);

    try {
      const res = await callApi('verify_and_reset_password', resetEmail, otpCode, newPassword);
      if (res.success) {
        setViewMode('auth');
        setIsRegister(false);
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setMessage({ text: res.message || 'Password updated successfully! Please sign in.', isError: false });
      } else {
        setMessage({ text: res.message || 'Invalid code or password reset failed.', isError: true });
      }
    } catch (err) {
      setMessage({ text: 'Error verifying code.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#F3F6F9] dark:bg-[#0c1722] flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 select-none transition-colors duration-200 overflow-y-auto custom-scrollbar">
      {/* Top Floating Theme Switcher */}
      <div className="sticky top-0 self-start z-20 sm:absolute sm:top-6 sm:left-8 mb-3 sm:mb-0 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleLoginTheme}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] text-xs font-semibold text-[#1E2837] dark:text-white shadow-sm hover:border-[#2E7D7E] transition-all"
        >
          {localTheme === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-[#2dd4bf]" />
              <span className="tracking-wide uppercase text-[10px]">Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span className="tracking-wide uppercase text-[10px]">Light Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Main Split Authentication Card */}
      <div className="w-full max-w-[860px] lg:max-w-[980px] xl:max-w-[1100px] my-auto bg-white dark:bg-[#13222f] border border-[#E3E8EE] dark:border-[#1c3345] rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Side: Form */}
        <div className="p-8 sm:p-10 flex flex-col justify-center">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center gap-3.5 mb-7">
            <img
              src="/app_icon.png"
              alt="Smart Medication Scheduler"
              className="w-11 h-11 rounded-2xl object-contain shadow-md shadow-[#2E7D7E]/20 shrink-0"
            />
            <div>
              <h2 className="text-base font-bold text-[#1E2837] dark:text-white leading-tight">
                Smart Medication
              </h2>
              <h2 className="text-base font-bold text-[#1E2837] dark:text-white leading-tight">
                Scheduler
              </h2>
              <p className="text-[11px] text-[#8B9DA8] dark:text-[#859ba8] mt-0.5">
                Take your meds. Live healthier.
              </p>
            </div>
          </div>

          {/* Status Message Notification */}
          {message.text && (
            <div
              className={`p-3 rounded-xl mb-5 flex items-center gap-2.5 text-xs animate-fadeIn ${
                message.isError
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
              }`}
            >
              {message.isError ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Form Content */}
          {viewMode === 'auth' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8B9DA8] dark:text-[#859ba8]">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] dark:placeholder-[#859ba8] focus:outline-none focus:border-[#2E7D7E] dark:focus:border-[#2dd4bf] transition-all"
                  />
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8B9DA8] dark:text-[#859ba8]">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Username or Email"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] dark:placeholder-[#859ba8] focus:outline-none focus:border-[#2E7D7E] dark:focus:border-[#2dd4bf] transition-all"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8B9DA8] dark:text-[#859ba8]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] dark:placeholder-[#859ba8] focus:outline-none focus:border-[#2E7D7E] dark:focus:border-[#2dd4bf] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {!isRegister && (
                <div className="flex items-center justify-between pt-1 pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-[#2E7D7E] focus:ring-0 cursor-pointer accent-[#2E7D7E]"
                    />
                    <span className="text-xs text-[#64748B] dark:text-[#859ba8]">Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('forgot_request');
                      setMessage({ text: '', isError: false });
                    }}
                    className="text-xs text-[#2E7D7E] dark:text-[#2dd4bf] hover:underline font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs rounded-xl shadow-md shadow-[#2E7D7E]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>{loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setMessage({ text: '', isError: false });
                  }}
                  className="w-full py-2.5 px-4 bg-white dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] hover:border-[#2E7D7E] dark:hover:border-[#2dd4bf] text-[#1E2837] dark:text-white font-semibold text-xs rounded-xl transition-all"
                >
                  {isRegister ? 'Already have an account? Sign in' : 'Create Account'}
                </button>
              </div>
            </form>
          ) : viewMode === 'forgot_request' ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setViewMode('auth')}
                  className="p-1.5 rounded-lg text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white hover:bg-[#F3F6F9] dark:hover:bg-[#172838]"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">Recover Password</h3>
              </div>

              <p className="text-xs text-[#8B9DA8] dark:text-[#859ba8]">
                Enter your username or registered email. We will send you a verification code.
              </p>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#8B9DA8]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={resetIdent}
                  onChange={(e) => setResetIdent(e.target.value)}
                  placeholder="Username or Email"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white placeholder-[#8B9DA8] focus:outline-none focus:border-[#2E7D7E] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs rounded-xl shadow-md shadow-[#2E7D7E]/20 transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Sending...' : 'Send Verification Code'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyReset} className="space-y-3.5">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setViewMode('forgot_request')}
                  className="p-1.5 rounded-lg text-[#8B9DA8] hover:text-[#1E2837] dark:hover:text-white hover:bg-[#F3F6F9] dark:hover:bg-[#172838]"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="font-bold text-sm text-[#1E2837] dark:text-white">Verify & Set New Password</h3>
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Enter 6-digit Code"
                  className="w-full px-4 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white text-center font-mono tracking-widest focus:outline-none focus:border-[#2E7D7E]"
                />
              </div>

              <div className="relative">
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password (min 6 chars)"
                  className="w-full px-4 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                />
              </div>

              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="w-full px-4 py-2.5 bg-[#F3F6F9] dark:bg-[#172838] border border-[#E3E8EE] dark:border-[#1c3345] rounded-xl text-xs text-[#1E2837] dark:text-white focus:outline-none focus:border-[#2E7D7E]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-[#2E7D7E] hover:bg-[#26696a] text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Verifying...' : 'Reset Password'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Side: Medical Artwork Panel */}
        <div className="relative hidden md:block min-h-[460px] lg:min-h-[540px] xl:min-h-[620px] bg-gradient-to-br from-[#E2F0EF] to-[#D5EAE9] dark:from-[#112733] dark:to-[#0a1822] overflow-hidden">
          <img
            src="/assets/login_medical_scene.jpg"
            alt="Medical Still Life"
            className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
          />

          {/* Inspirational Tag matching reference */}
          <div className="absolute top-8 right-8 max-w-[240px] text-right">
            <p className="inline-block rounded-xl border border-white/30 bg-black/55 px-3 py-2 text-sm sm:text-base font-semibold text-white italic drop-shadow-sm font-serif leading-snug shadow-lg backdrop-blur-sm">
              Small steps today, healthier tomorrow ♡
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
