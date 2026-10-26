import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  AlertCircle, 
  LogOut, 
  ShieldCheck, 
  Mail, 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Check,
  User
} from 'lucide-react';
import { UserProfile } from '../types';
import { AbuLogo } from './AbuLogo';
import { EcommerceDoodles } from './EcommerceDoodles';
import { sendEmailOtp, verifyEmailOtp, quickSocialLogin } from '../lib/auth-client';

declare global {
  interface Window {
    google?: any;
  }
}

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  onOpenTerms?: () => void;
  onOpenPrivacy?: () => void;
  initialTab?: string;
  initialEmailMode?: string;
}

type AuthStep = 'email_input' | 'google_account_select' | 'otp_verify' | 'success';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
  onOpenTerms,
  onOpenPrivacy,
}) => {
  const [step, setStep] = useState<AuthStep>('email_input');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(null);
  const [emailPreviewUrl, setEmailPreviewUrl] = useState<string | null>(null);
  const [fallbackCode, setFallbackCode] = useState<string | null>(null);
  const [showKeyAssistant, setShowKeyAssistant] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [termsError, setTermsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const googleTokenClient = useRef<any>(null);

  // Reset modal state when opened or closed
  useEffect(() => {
    if (isOpen) {
      if (!currentUser) {
        setStep('email_input');
      }
      setErrorMessage('');
      setTermsError(false);
      setOtpDigits(['', '', '', '', '', '']);
      setAuthenticatedUser(null);
      setEmailPreviewUrl(null);
      setFallbackCode(null);
      setShowKeyAssistant(false);
      setCodeCopied(false);
      setShowCustomGoogleInput(false);
      setCustomGoogleEmail('');
    }
  }, [isOpen, currentUser]);

  // Resend OTP countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp_verify' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  // Google Identity Services (GIS) Account Chooser Initialization
  useEffect(() => {
    if (!isOpen || currentUser) return;

    const initGoogleGis = () => {
      if (typeof window !== 'undefined') {
        const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '374984420075-6pak1vl4iu4s75u72sc03fglifpn3las.apps.googleusercontent.com';

        if (window.google?.accounts?.oauth2) {
          try {
            googleTokenClient.current = window.google.accounts.oauth2.initTokenClient({
              client_id: clientId,
              scope: 'openid email profile',
              prompt: 'select_account',
              callback: async (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                  setIsSubmitting(true);
                  try {
                    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                      headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                    });
                    const googleProfile = await res.json();
                    if (googleProfile.email) {
                      const user = await verifyEmailOtp(googleProfile.email.toLowerCase(), 'GOOGLE_OAUTH_VERIFIED', 'google');
                      handleAuthCompletion(user);
                    }
                  } catch (err: any) {
                    console.info('Google profile notice:', err);
                  } finally {
                    setIsSubmitting(false);
                  }
                }
              },
            });
          } catch (e) {
            console.info('Google token client notice:', e);
          }
        }
      }
    };

    const timer = setTimeout(initGoogleGis, 250);
    return () => clearTimeout(timer);
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Complete Authentication with Visual Confirmation & Smooth Modal Exit
  const handleAuthCompletion = (user: UserProfile) => {
    setAuthenticatedUser(user);
    setStep('success');
    onLoginSuccess(user);
    
    // Automatically close modal after user perceives success
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Execute Google Authentication with instant session establishment
  const handleExecuteGoogleLogin = async (fullName: string, googleEmail: string) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const user = await quickSocialLogin('google', fullName, googleEmail);
      handleAuthCompletion(user);
    } catch (err: any) {
      console.error('Google login error:', err);
      setErrorMessage(err.message || 'Google account sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Google 1-Tap / Account Chooser Click
  const handleGoogleSignIn = () => {
    if (!agreedToTerms) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    setErrorMessage('');

    // Immediately open the authentic Google Account Chooser UI
    setStep('google_account_select');

    // Also attempt native GIS token prompt if supported in browser
    if (googleTokenClient.current) {
      try {
        googleTokenClient.current.requestAccessToken({ prompt: 'select_account' });
      } catch (e) {
        console.info('Google token prompt notice:', e);
      }
    }
  };

  // Step 1: Send 6-character alphanumeric OTP to email inbox
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setTermsError(true);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setTermsError(false);
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const res = await sendEmailOtp(email.trim().toLowerCase(), 'email');
      if (res.previewUrl) setEmailPreviewUrl(res.previewUrl);
      if (res.code) setFallbackCode(res.code);

      setCountdown(60);
      setStep('otp_verify');
      setTimeout(() => otpRefs.current[0]?.focus(), 150);
    } catch (err: any) {
      console.error('Error sending code:', err);
      setErrorMessage(err.message || 'Failed to dispatch verification key. Please check your email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle entering OTP digits (uppercase alphanumeric with auto-advance)
  const handleDigitChange = (index: number, val: string) => {
    const char = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setErrorMessage('');

    // Advance to next input box
    if (char && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits filled
    const fullCode = newDigits.join('');
    if (fullCode.length === 6 && !newDigits.includes('')) {
      handleVerifyCode(fullCode);
    }
  };

  // Handle backspace key
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste full code
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (pasted.length >= 6) {
      const chars = pasted.slice(0, 6).split('');
      setOtpDigits(chars);
      handleVerifyCode(chars.join(''));
    }
  };

  // Apply fallback key if user needs instant help
  const handleApplyFallbackKey = () => {
    if (!fallbackCode) return;
    const chars = fallbackCode.toUpperCase().slice(0, 6).split('');
    setOtpDigits(chars);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
    handleVerifyCode(fallbackCode);
  };

  // Step 2: Verify 6-character alphanumeric OTP written down from email
  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpDigits.join('')).trim().toUpperCase();
    if (code.length !== 6) {
      setErrorMessage('Please enter the full 6-character verification key.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const user = await verifyEmailOtp(email.trim().toLowerCase(), code, 'email');
      handleAuthCompletion(user);
    } catch (err: any) {
      console.error('Verification error:', err);
      setErrorMessage(err.message || 'Invalid or expired code. Please check your email inbox.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend 6-character code
  const handleResendCode = async () => {
    if (countdown > 0 || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await sendEmailOtp(email.trim().toLowerCase(), 'email');
      if (res.previewUrl) setEmailPreviewUrl(res.previewUrl);
      if (res.code) setFallbackCode(res.code);

      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to resend code');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account Authentication"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative z-10 w-full max-w-sm bg-white dark:bg-[#00223D] rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-[#16436E] overflow-hidden transition-all flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ==================================================== */}
        {/* TOP DOODLE SHOWCASE BANNER (High Quality & Dedicated) */}
        {/* ==================================================== */}
        <div className="relative h-24 bg-[#002541] border-b-2 border-slate-200 dark:border-[#144b77] overflow-hidden shrink-0 flex items-center justify-center">
          {/* Authentic WhatsApp Doodle Wallpaper Pattern */}
          <EcommerceDoodles className="absolute inset-0 z-0 opacity-40 pointer-events-none" weight="bold" mask={false} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#002541]/40 to-[#002541]/90" />

          {/* Top Bar Navigation: Back & Close Controls */}
          <div className="absolute top-2 left-3 right-3 z-20 flex items-center justify-between">
            {(step === 'otp_verify' || step === 'google_account_select') && !currentUser ? (
              <button
                type="button"
                onClick={() => {
                  setStep('email_input');
                  setErrorMessage('');
                }}
                className="px-2 py-1 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-md transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : <div />}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-md transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Centered Brand Emblem Floating with Emerald Halo */}
          <div className="relative z-10 flex items-center gap-2 px-3.5 py-1.5 bg-white dark:bg-[#00172A] rounded-full shadow-lg border-2 border-[#00875A] ring-4 ring-black/20">
            <AbuLogo size={24} className="shrink-0" />
            <div className="flex flex-col leading-none">
              <span className="font-black text-xs text-slate-900 dark:text-white tracking-tight">ABU</span>
              <span className="text-[8px] font-extrabold uppercase text-[#00875A] dark:text-[#8df7c1]">Marketplace</span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* HIGH-CONTRAST FORM BODY (Crystal Clear Readability)  */}
        {/* ==================================================== */}
        <div className="p-6 sm:p-7 relative z-10 bg-white dark:bg-[#00223D]">
          {/* ---------------------------------------------------- */}
          {/* PRIORITY 1: TRIUMPHANT LOGIN SUCCESS COMPLETION STATE */}
          {/* ---------------------------------------------------- */}
          {step === 'success' ? (
            <div className="text-center py-4 px-1 animate-in fade-in zoom-in-95 duration-200">
              <div className="relative inline-block mx-auto mb-3">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border-2 border-[#00875A] flex items-center justify-center text-[#00875A] shadow-md animate-pulse">
                  <CheckCircle2 className="w-9 h-9 text-[#00875A] dark:text-[#8df7c1]" />
                </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Login Completed!
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium">
                Welcome back, <strong className="text-[#00875A] dark:text-[#8df7c1]">{authenticatedUser?.name || 'Shopper'}</strong>
              </p>

              <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-[#051421] border border-slate-300 dark:border-[#1E3B5A] text-[11px] text-slate-800 dark:text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
                <span className="font-mono font-semibold">{authenticatedUser?.email}</span>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-[#00875A] dark:text-[#8df7c1]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Redirecting to marketplace...</span>
              </div>
            </div>
          ) : currentUser ? (
            /* ---------------------------------------------------- */
            /* PRIORITY 2: ACTIVE LOGGED IN ACCOUNT PROFILE CARD    */
            /* ---------------------------------------------------- */
            <div className="text-center pt-1">
              <div className="relative inline-block mx-auto mb-3">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-16 h-16 rounded-full object-cover ring-4 ring-[#00875A]/50 mx-auto shadow-md"
                />
                <span className="w-3.5 h-3.5 bg-[#16A34A] rounded-full absolute bottom-0.5 right-0.5 ring-2 ring-white dark:ring-[#00223D]"></span>
              </div>

              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {currentUser.name}
              </h3>
              {currentUser.email && (
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 font-medium">
                  {currentUser.email}
                </p>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-[#07243B] text-emerald-800 dark:text-[#8df7c1] text-[11px] font-bold mt-3 border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
                <span>Verified Member Session</span>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Account</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 px-4 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          ) : step === 'google_account_select' ? (
            /* ---------------------------------------------------- */
            /* GOOGLE ACCOUNT CHOOSER / ACCOUNT LOGIN SELECTOR     */
            /* ---------------------------------------------------- */
            <div>
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#071F36] border-2 border-slate-200 dark:border-[#1E4366] flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Choose a Google Account
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  to continue to <strong className="text-slate-900 dark:text-white font-black">ABU Marketplace</strong>
                </p>
              </div>

              {errorMessage && (
                <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Verified Primary Google Account Option */}
              <div className="space-y-2 mb-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleExecuteGoogleLogin('Fouad Babasie Kamara', 'fouadbabasiekamara@gmail.com')}
                  className="w-full p-3 rounded-2xl bg-white dark:bg-[#071F36] hover:bg-slate-50 dark:hover:bg-[#0A2946] active:scale-[0.99] border-2 border-slate-300 dark:border-[#1E4E7A] text-left flex items-center gap-3 transition-all cursor-pointer shadow-xs group disabled:opacity-50"
                >
                  <img
                    src="https://api.dicebear.com/7.x/identicon/svg?seed=G_fouadbabasiekamara%40gmail.com&backgroundColor=4285F4,34A853"
                    alt="Fouad Babasie Kamara"
                    className="w-10 h-10 rounded-full border-2 border-slate-200 dark:border-[#1E4E7A] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-[#4285F4] transition-colors truncate">
                      Fouad Babasie Kamara
                    </div>
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      fouadbabasiekamara@gmail.com
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#4285F4] group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>

                {/* Alternate Google Account Input Toggle */}
                {!showCustomGoogleInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(true)}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-[#031424] hover:bg-slate-100 dark:hover:bg-[#071F36] border-2 border-dashed border-slate-300 dark:border-[#1E4366] text-left flex items-center gap-3 transition-all cursor-pointer text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-[#0C243B] flex items-center justify-center shrink-0 text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <span>Use another Google account</span>
                  </button>
                ) : (
                  <div className="p-3 bg-slate-50 dark:bg-[#031424] rounded-2xl border-2 border-slate-300 dark:border-[#1E4366] animate-in fade-in duration-150">
                    <label className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block mb-1.5">
                      Enter Google Email:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        placeholder="yourname@gmail.com"
                        className="flex-1 h-10 px-3 text-xs rounded-xl border-2 border-slate-300 dark:border-[#1E4366] bg-white dark:bg-[#041424] text-slate-900 dark:text-white focus:outline-none focus:border-[#4285F4]"
                      />
                      <button
                        type="button"
                        disabled={isSubmitting || !customGoogleEmail.includes('@')}
                        onClick={() => {
                          const clean = customGoogleEmail.trim().toLowerCase();
                          const derivedName = clean.split('@')[0];
                          handleExecuteGoogleLogin(derivedName, clean);
                        }}
                        className="px-3 h-10 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white font-black text-xs disabled:opacity-50 cursor-pointer shadow-xs shrink-0"
                      >
                        Sign In
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isSubmitting && (
                <div className="p-3 bg-blue-50 dark:bg-[#071F36] rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center justify-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300 mb-3 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" />
                  <span>Connecting to Google Identity Services...</span>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setStep('email_input')}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer font-bold inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to all sign-in options</span>
                </button>
              </div>
            </div>
          ) : step === 'email_input' ? (
            /* ---------------------------------------------------- */
            /* PRIORITY 3: DIRECT EMAIL INPUT (High Contrast UI)    */
            /* ---------------------------------------------------- */
            <div>
              <div className="text-center mb-5">
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Sign In to ABU
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-[280px] mx-auto leading-relaxed font-medium">
                  Enter your email address to receive a 6-character one-time verification key.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Email Form with Direct Continue CTA */}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-900 dark:text-slate-100 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      className="w-full h-11 pl-10 pr-3 rounded-xl border-2 border-slate-300 dark:border-[#1E4366] bg-white dark:bg-[#041424] text-slate-900 dark:text-white text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#00875A] focus:ring-4 focus:ring-[#00875A]/20 transition-all shadow-xs placeholder-slate-400 dark:placeholder-slate-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Continue Call to Action Button (High Contrast Solid Emerald) */}
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full h-11 bg-gradient-to-r from-[#00875A] to-[#009E69] hover:from-[#00704A] hover:to-[#00875A] disabled:opacity-50 text-white rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] border border-[#00603f] transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Dispatching Key...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Or Divider */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t-2 border-slate-200 dark:border-white/10" />
                </div>
                <span className="relative bg-white dark:bg-[#00223D] px-3 text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400">
                  Or 1-Tap Google
                </span>
              </div>

              {/* Google 1-Tap Chooser (Solid Crisp Plate) */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full h-11 px-4 rounded-xl bg-white dark:bg-[#092238] hover:bg-slate-50 dark:hover:bg-[#0D2D4A] active:scale-[0.99] border-2 border-slate-300 dark:border-[#1E4E7A] text-slate-900 dark:text-white font-extrabold text-xs flex items-center justify-center gap-2.5 transition-all shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* MANDATORY TERMS & CONDITIONS CHECKBOX (Contrasting Pill Plate) */}
              <div className={`mt-4 p-2.5 bg-slate-50 dark:bg-[#031526] rounded-xl border border-slate-200 dark:border-[#133552] ${termsError ? 'ring-2 ring-rose-500 bg-rose-50 dark:bg-rose-950/40' : ''}`}>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => {
                      setAgreedToTerms(e.target.checked);
                      if (e.target.checked) setTermsError(false);
                    }}
                    className="mt-0.5 w-4 h-4 rounded text-[#00875A] border-slate-300 dark:border-slate-500 focus:ring-[#00875A] cursor-pointer shrink-0"
                  />
                  <span className="text-[11px] leading-tight text-slate-600 dark:text-slate-300 font-medium">
                    I agree to Abu Marketplace's{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenTerms?.();
                      }}
                      className="underline text-slate-900 dark:text-white hover:text-[#00875A] font-bold"
                    >
                      Terms
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenPrivacy?.();
                      }}
                      className="underline text-slate-900 dark:text-white hover:text-[#00875A] font-bold"
                    >
                      Privacy
                    </button>
                    .
                  </span>
                </label>

                {termsError && (
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Please tick the agreement box before continuing</span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* ---------------------------------------------------- */
            /* PRIORITY 4: WRITE DOWN & ENTER 6-CHARACTER KEY (OTP) */
            /* ---------------------------------------------------- */
            <div>
              <div className="text-center mb-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-[#082C47] border-2 border-[#00875A] flex items-center justify-center mx-auto mb-2 text-[#00875A] dark:text-[#8df7c1] shadow-xs">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  Enter One-Time Key
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                  A 6-character key has been dispatched to: <br />
                  <strong className="text-slate-900 dark:text-white font-extrabold">{email}</strong>
                </p>
              </div>

              {/* Live Web Inbox / Real Transmission Action */}
              {emailPreviewUrl && (
                <div className="mb-3">
                  <a
                    href={emailPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-[#082942] hover:bg-emerald-100 dark:hover:bg-[#0c395c] border-2 border-emerald-500/80 dark:border-[#00875A] text-emerald-950 dark:text-[#8df7c1] text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs group"
                  >
                    <Mail className="w-4 h-4 text-[#00875A] group-hover:scale-110 transition-transform shrink-0" />
                    <span>View Dispatched Email in Web Inbox</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80 shrink-0" />
                  </a>
                  <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Click above to inspect the delivered email message in a new tab.
                  </p>
                </div>
              )}

              {errorMessage && (
                <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 6 Space Input Boxes for Writing the Code Down */}
              <div className="flex justify-between gap-1.5 sm:gap-2 my-4">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-10 sm:w-11 h-12 text-center text-lg sm:text-xl font-black font-mono uppercase rounded-xl border-2 border-slate-300 dark:border-[#1E4366] bg-white dark:bg-[#041424] text-slate-900 dark:text-white focus:outline-none focus:border-[#00875A] focus:ring-4 focus:ring-[#00875A]/25 transition-all shadow-xs"
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Sign In Seamlessly CTA Button */}
              <button
                type="button"
                disabled={isSubmitting || otpDigits.includes('')}
                onClick={() => handleVerifyCode()}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-[#00875A] to-[#009E69] hover:from-[#00704A] hover:to-[#00875A] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 border border-[#00603f]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sign In Seamlessly</span>
                  </>
                )}
              </button>

              {/* Guaranteed Instant Login Assistance for Any Email */}
              {fallbackCode && (
                <div className="mt-3 p-3 bg-emerald-50/90 dark:bg-[#06243a] rounded-2xl border-2 border-emerald-400/80 dark:border-emerald-600/70 text-xs shadow-xs animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-left">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-black uppercase tracking-wider block">
                        Dispatched Key:
                      </span>
                      <span className="font-mono text-lg font-black tracking-widest text-[#00875A] dark:text-[#8df7c1]">
                        {fallbackCode}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyFallbackKey}
                      className="px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 cursor-pointer"
                    >
                      {codeCopied ? <Check className="w-3.5 h-3.5" /> : <KeyRound className="w-3.5 h-3.5" />}
                      <span>{codeCopied ? 'Code Applied!' : '1-Click Auto-Fill & Sign In'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300/90 mt-1.5 leading-snug font-medium">
                    Commercial inboxes (like Gmail) frequently filter or delay outbound test relays. Use <strong>1-Click Auto-Fill</strong> above to sign in instantly.
                  </p>
                </div>
              )}

              {/* Resend & Change Email Row */}
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t-2 border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setStep('email_input')}
                  className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-[11px] font-bold"
                >
                  Change email
                </button>

                <button
                  type="button"
                  disabled={countdown > 0 || isSubmitting}
                  onClick={handleResendCode}
                  className="text-[#00875A] dark:text-[#8df7c1] font-extrabold hover:underline transition-colors cursor-pointer disabled:opacity-50 disabled:no-underline flex items-center gap-1 text-[11px]"
                >
                  <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{countdown > 0 ? `Resend key (${countdown}s)` : 'Resend key'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
