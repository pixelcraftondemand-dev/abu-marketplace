import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  MessageSquare, 
  Phone,
  Mail,
  ChevronRight,
  Sparkles,
  Lock,
  LogOut,
  MapPin,
  RefreshCw,
  Clock,
  User,
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  Store,
  ShoppingBag
} from 'lucide-react';
import { UserProfile } from '../types';
import { AbuLogo } from './AbuLogo';
import { detectCarrier, SIERRA_LEONE_LOCATIONS } from '../data/mockData';
import { 
  sendBetterAuthPhoneOtp, 
  verifyBetterAuthPhoneOtp, 
  signInWithBetterAuthEmail, 
  signUpWithBetterAuthEmail, 
  quickSocialLogin,
  signOutBetterAuth,
  updateBetterAuthProfile
} from '../lib/auth-client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
}

type MainTab = 'phone' | 'email';
type EmailMode = 'signin' | 'signup';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<MainTab>('phone');
  const [authView, setAuthView] = useState<'form' | 'otp_verify'>('form');
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [activeChannel, setActiveChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  
  // Phone form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+232');
  const [fullName, setFullName] = useState('');
  const [selectedCity, setSelectedCity] = useState(SIERRA_LEONE_LOCATIONS[0].name);

  // Email form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification state
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [serverDispatchedOtp, setServerDispatchedOtp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Account management state for logged-in user
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'merchant' | 'artisan'>('buyer');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Ref array for 6 OTP inputs
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Update role state if currentUser changes
  useEffect(() => {
    if (currentUser?.role) {
      setSelectedRole(currentUser.role);
    }
  }, [currentUser]);

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authView === 'otp_verify' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [authView, countdown]);

  // Reset inputs when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setAuthView('form');
      setErrorMessage('');
      setToastNotification(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Carrier detection for Sierra Leone
  const carrierInfo = detectCarrier(phoneNumber);

  // Full clean formatted phone
  const getFullPhone = () => {
    const clean = phoneNumber.trim().replace(/\D/g, '');
    if (clean.startsWith('232')) return `+${clean}`;
    return `${countryCode}${clean.replace(/^0/, '')}`;
  };

  // 1. Phone OTP Dispatch via Better Auth
  const handleInitiatePhoneOtp = async (channel: 'whatsapp' | 'sms') => {
    const cleanNum = phoneNumber.trim().replace(/\D/g, '');
    if (!cleanNum || cleanNum.length < 6) {
      setErrorMessage('Please enter a valid mobile number (at least 6 digits)');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    setActiveChannel(channel);

    try {
      const fullPhone = getFullPhone();
      const res = await sendBetterAuthPhoneOtp(fullPhone, channel);
      
      setServerDispatchedOtp(res.otpCode || null);
      setOtpDigits(['', '', '', '', '', '']);
      setCountdown(60);
      setAuthView('otp_verify');

      const channelLabel = channel === 'whatsapp' ? 'WhatsApp' : 'SMS';
      if (res.otpCode) {
        setToastNotification(`${channelLabel} alert: Your Better Auth verification code is ${res.otpCode}`);
      } else {
        setToastNotification(`${channelLabel} code sent to ${fullPhone}`);
      }

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle OTP Digits Entry
  const handleOtpDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    // Handle 6-digit paste
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextIndex = Math.min(pasted.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
      
      if (pasted.length === 6) {
        handleVerifyOtp(newDigits.join(''));
      }
      return;
    }

    const singleChar = clean[clean.length - 1];
    const newDigits = [...otpDigits];
    newDigits[index] = singleChar;
    setOtpDigits(newDigits);
    setErrorMessage('');

    if (index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (index === 5 || newDigits.every((d) => d !== '')) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 6) {
        handleVerifyOtp(fullCode);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // 3. Complete Phone OTP Verification via Better Auth
  const handleVerifyOtp = async (code: string) => {
    if (code.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const fullPhone = getFullPhone();
      const res = await verifyBetterAuthPhoneOtp({
        phoneNumber: fullPhone,
        code,
        fullName: fullName.trim() || undefined,
        preferredCity: selectedCity,
        channel: activeChannel,
      });

      onLoginSuccess(res.user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Email & Password Authentication via Better Auth
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      if (emailMode === 'signin') {
        const user = await signInWithBetterAuthEmail(email, password);
        onLoginSuccess(user);
        onClose();
      } else {
        if (!fullName.trim()) {
          setErrorMessage('Please enter your full name');
          setIsSubmitting(false);
          return;
        }
        const user = await signUpWithBetterAuthEmail({
          name: fullName.trim(),
          email,
          password,
          phoneNumber: phoneNumber ? getFullPhone() : undefined,
          preferredCity: selectedCity,
        });
        onLoginSuccess(user);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Quick Social Sign-In (Google / Apple) backed by Better Auth
  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const user = await quickSocialLogin(provider, fullName.trim() || undefined, email.trim() || undefined, selectedCity);
      onLoginSuccess(user);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Social sign-in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Sign Out
  const handleSignOut = async () => {
    setIsSubmitting(true);
    try {
      await signOutBetterAuth();
      onLogout();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Change User Role (Buyer / Merchant / Artisan)
  const handleRoleChange = async (newRole: 'buyer' | 'merchant' | 'artisan') => {
    setIsUpdatingRole(true);
    try {
      const updated = await updateBetterAuthProfile({ role: newRole });
      if (updated) {
        setSelectedRole(newRole);
        onLoginSuccess(updated);
        setToastNotification(`Role updated to ${newRole.toUpperCase()}`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update role');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Convenience quick autofill for test/preview code
  const handleAutoFill = () => {
    if (serverDispatchedOtp) {
      const chars = serverDispatchedOtp.split('');
      setOtpDigits(chars);
      setErrorMessage('');
      handleVerifyOtp(serverDispatchedOtp);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-[440px] overflow-hidden shadow-2xl border border-slate-200/80 flex flex-col text-slate-800 animate-in zoom-in-95 duration-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* HEADER                                                   */}
        {/* ======================================================== */}
        <div className="bg-[#002541] px-5 py-4 text-white flex items-center justify-between relative shrink-0">
          <div className="flex items-center gap-3">
            <AbuLogo className="h-7 w-auto" />
            <div className="border-l border-white/20 pl-3">
              <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Account Access</span>
                <span className="text-[10px] font-semibold bg-[#00875A] text-white px-1.5 py-0.5 rounded tracking-normal">
                  Better Auth
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Sierra Leone eCommerce & Artisan Identity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 hover:text-white transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* BODY CONTAINER                                           */}
        {/* ======================================================== */}
        <div className="p-5 overflow-y-auto">
          {/* TOAST NOTIFICATION BADGE */}
          {toastNotification && (
            <div className="mb-4 bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="w-4 h-4 text-[#00875A] shrink-0" />
                <span className="font-medium truncate">{toastNotification}</span>
              </div>
              <button 
                onClick={() => setToastNotification(null)}
                className="text-slate-400 hover:text-slate-600 text-xs shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: LOGGED IN USER PROFILE MANAGEMENT                  */}
          {/* ======================================================== */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3.5">
                <img
                  src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.name)}&backgroundColor=0B3B60,002541&textColor=ffffff`}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-sm text-[#0F172A] truncate">
                      {currentUser.name}
                    </h4>
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#00875A] bg-[#E8F5E9] px-1.5 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {currentUser.email || currentUser.phoneNumber || currentUser.whatsappNumber || 'Active Session'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Auth ID: <code className="bg-slate-200/70 px-1 py-0.5 rounded">{currentUser.id.slice(0, 14)}...</code>
                  </p>
                </div>
              </div>

              {/* Role Switcher */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#00875A]" />
                    Marketplace Account Role
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {isUpdatingRole ? 'Updating...' : selectedRole}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('buyer')}
                    disabled={isUpdatingRole}
                    className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedRole === 'buyer'
                        ? 'bg-[#002541] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <ShoppingBag className="w-3 h-3" />
                    Buyer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('merchant')}
                    disabled={isUpdatingRole}
                    className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedRole === 'merchant'
                        ? 'bg-[#00875A] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Store className="w-3 h-3" />
                    Merchant
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleChange('artisan')}
                    disabled={isUpdatingRole}
                    className={`h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      selectedRole === 'artisan'
                        ? 'bg-[#D97706] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Briefcase className="w-3 h-3" />
                    Artisan
                  </button>
                </div>
              </div>

              {/* Delivery Hub Location */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  Preferred City:
                </span>
                <span className="font-bold text-[#002541]">
                  {currentUser.preferredCity || selectedCity}
                </span>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="w-full h-10 border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-rose-600 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{isSubmitting ? 'Signing out...' : 'Sign Out of Better Auth'}</span>
              </button>
            </div>
          ) : authView === 'form' ? (
            /* ======================================================== */
            /* VIEW: AUTHENTICATION FORM (PHONE OTP OR EMAIL/PASSWORD)  */
            /* ======================================================== */
            <div className="space-y-4">
              {/* PRIMARY METHOD SELECTOR (PHONE / EMAIL) */}
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setActiveTab('phone'); setErrorMessage(''); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'phone'
                      ? 'bg-white text-[#002541] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>WhatsApp / SMS</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('email'); setErrorMessage(''); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'email'
                      ? 'bg-white text-[#002541] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email & Password</span>
                </button>
              </div>

              {/* ERROR ALERT */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* TAB 1: PHONE NUMBER & WHATSAPP / SMS OTP                 */}
              {/* -------------------------------------------------------- */}
              {activeTab === 'phone' && (
                <div className="space-y-3">
                  {/* Full Name (Optional) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-slate-400 font-normal">(Optional for quick access)</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="w-full h-9.5 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#00875A] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Sierra Leone Phone Input with Carrier Detection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-700">
                        Mobile Number
                      </label>
                      {carrierInfo && (
                        <span 
                          className="text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1"
                          style={{ backgroundColor: `${carrierInfo.badgeColor}15`, color: carrierInfo.badgeColor }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: carrierInfo.badgeColor }}></span>
                          {carrierInfo.name} ({carrierInfo.ussdCode})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-xl px-2.5 h-9.5 text-xs font-bold text-slate-700 shrink-0">
                        <span>🇸🇱</span>
                        <span>+232</span>
                      </div>
                      <div className="relative flex-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="7X XXX XXX"
                          className="w-full h-9.5 pl-8.5 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold tracking-wider text-slate-900 focus:bg-white focus:border-[#00875A] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Compatible with Orange Money, Afrimoney & QCell networks.
                    </p>
                  </div>

                  {/* Delivery Location Dropdown */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Primary Delivery Hub
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <select
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                        className="w-full h-9.5 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#00875A] focus:outline-none transition-colors cursor-pointer appearance-none"
                      >
                        {SIERRA_LEONE_LOCATIONS.map((loc) => (
                          <option key={loc.id} value={loc.name}>
                            {loc.name} ({loc.province})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dual Action Buttons: WhatsApp vs SMS */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleInitiatePhoneOtp('whatsapp')}
                      disabled={isSubmitting}
                      className="h-10 px-2.5 bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.98] text-[#002541] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer border border-[#20ba59] disabled:opacity-50"
                      title="Send instant code via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-current shrink-0" />
                      <span>{isSubmitting && activeChannel === 'whatsapp' ? 'Sending...' : 'Via WhatsApp'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInitiatePhoneOtp('sms')}
                      disabled={isSubmitting}
                      className="h-10 px-2.5 bg-[#002541] hover:bg-[#0B3B60] active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                      title="Send code via SMS"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0 text-[#8df7c1]" />
                      <span>{isSubmitting && activeChannel === 'sms' ? 'Sending...' : 'Via SMS Code'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* TAB 2: EMAIL & PASSWORD (REAL BETTER AUTH)               */}
              {/* -------------------------------------------------------- */}
              {activeTab === 'email' && (
                <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => { setEmailMode('signin'); setErrorMessage(''); }}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        emailMode === 'signin'
                          ? 'bg-white text-[#002541] font-bold shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEmailMode('signup'); setErrorMessage(''); }}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                        emailMode === 'signup'
                          ? 'bg-white text-[#002541] font-bold shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      Create Account
                    </button>
                  </div>

                  {emailMode === 'signup' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Enter your full name"
                          required
                          className="w-full h-9.5 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#00875A] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="w-full h-9.5 pl-9 pr-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#00875A] focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        className="w-full h-9.5 pl-9 pr-9 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-[#00875A] focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 mt-1 bg-[#002541] hover:bg-[#0B3B60] active:scale-[0.98] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs hover:shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <span>
                      {isSubmitting 
                        ? (emailMode === 'signin' ? 'Signing In...' : 'Creating Account...') 
                        : (emailMode === 'signin' ? 'Sign In' : 'Create Account')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* DIVIDER */}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              {/* SOCIAL SIGN IN (GOOGLE & APPLE) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSocialAuth('google')}
                  disabled={isSubmitting}
                  className="h-9.5 px-3 bg-white hover:bg-slate-50 active:scale-[0.98] text-[#1A242D] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-[#CBD5E1] transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialAuth('apple')}
                  disabled={isSubmitting}
                  className="h-9.5 px-3 bg-[#000000] hover:bg-[#1a1a1a] active:scale-[0.98] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.59-7.79-11.71-14.24-6.3-9.92-11.13-20.93-14.48-33.04-3.36-12.11-5.04-23.78-5.04-35 0-14.93 3.97-27.17 11.91-36.72 7.94-9.55 17.75-14.44 29.43-14.67 4.13 0 9.07 1.13 14.81 3.38 5.74 2.25 9.4 3.44 10.99 3.56 1.83-.12 5.65-1.37 11.46-3.75 5.81-2.38 10.66-3.44 14.56-3.19 12.01.62 21.6 5.16 28.77 13.63-10.74 6.5-16 15.44-15.78 26.83.22 9.04 3.65 16.71 10.28 23.01 6.64 6.3 14.54 9.94 23.7 10.92-2.18 6.64-4.89 13.19-8.13 19.64zM119.22 33.11c0-7.39 2.67-14.42 8.01-21.09 5.34-6.67 11.96-10.93 19.86-12.78.22 1.09.33 2.18.33 3.27 0 7.4-2.73 14.43-8.19 21.1-5.46 6.67-12.13 10.84-20.01 12.51v-3.01z" />
                  </svg>
                  <span>Apple</span>
                </button>
              </div>

              {/* Security Footnote */}
              <div className="pt-2 text-center text-[10px] text-[#64748B] flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
                <span>Protected by Better Auth · SQLite Session Store</span>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW: 6-DIGIT OTP VERIFICATION VIEW                      */
            /* ======================================================== */
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-left">
                <button
                  type="button"
                  onClick={() => setAuthView('form')}
                  className="p-1.5 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Back to options"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-[#0F172A] tracking-tight">
                    Enter Verification Code
                  </h4>
                  <p className="text-[11px] text-[#5A6872] truncate">
                    Sent via {activeChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to <strong className="text-[#00875A]">{countryCode} {phoneNumber}</strong>
                  </p>
                </div>
              </div>

              {/* 6 Individual Code Digit Boxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[#475569]">
                    6-Digit Verification Code
                  </span>
                  {serverDispatchedOtp && (
                    <button
                      type="button"
                      onClick={handleAutoFill}
                      className="text-[11px] font-bold text-[#00875A] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 text-[#00875A]" />
                      <span>Autofill ({serverDispatchedOtp})</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`h-12 text-center text-lg font-bold rounded-xl border bg-slate-50 transition-all focus:bg-white focus:outline-none ${
                        digit
                          ? 'border-[#00875A] text-[#002541] ring-1 ring-[#00875A]/20'
                          : 'border-slate-300 text-slate-800 focus:border-[#00875A]'
                      }`}
                    />
                  ))}
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#DC2626] font-semibold mt-2 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Verify & Resend Actions */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleVerifyOtp(otpDigits.join(''))}
                  disabled={isSubmitting || otpDigits.some((d) => d === '')}
                  className="w-full h-10 bg-[#00875A] hover:bg-[#00704A] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-2xs hover:shadow-xs cursor-pointer active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verifying with Better Auth...' : 'Verify & Continue'}</span>
                </button>

                <div className="flex items-center justify-between text-[11px] text-[#5A6872] px-1">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {countdown > 0 ? `Resend code in ${countdown}s` : 'Code expired?'}
                  </span>
                  <button
                    type="button"
                    disabled={countdown > 0}
                    onClick={() => handleInitiatePhoneOtp(activeChannel)}
                    className={`font-semibold cursor-pointer flex items-center gap-1 ${
                      countdown > 0 ? 'text-slate-400' : 'text-[#0B3B60] hover:underline'
                    }`}
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
