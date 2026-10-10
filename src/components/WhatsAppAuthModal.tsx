import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  ShieldCheck, 
  MessageSquare, 
  Send, 
  ExternalLink,
  UserCheck
} from 'lucide-react';
import { UserProfile } from '../types';
import { detectCarrier } from '../data/mockData';
import {
  MARKETPLACE_ADDRESS,
  MARKETPLACE_SUPPORT_EMAIL,
  WHATSAPP_SUPPORT_NUMBER,
} from '../data/contactDetails';

interface WhatsAppAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
}

export const WhatsAppAuthModal: React.FC<WhatsAppAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [countryCode, setCountryCode] = useState('+232');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [toastNotice, setToastNotice] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  if (!isOpen) return null;

  const fullPhoneNumber = `${countryCode} ${phone.trim()}`;
  const carrier = detectCarrier(phone);

  const handleSendCode = () => {
    const phoneDigits = phone.replace(/\D/g, '');
    if (!fullName.trim()) {
      setOtpError('Please enter your full name');
      return;
    }
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      setOtpError('Please enter a valid phone number');
      return;
    }
    setOtpError('');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setEnteredOtp('');
    setStep('otp');
    setCountdown(60);
    setToastNotice(`Demo code: ${code}. WhatsApp code delivery is not configured yet.`);
    setTimeout(() => setToastNotice(null), 8000);
  };

  const handleClose = () => {
    setStep('input');
    setPhone('');
    setFullName('');
    setEnteredOtp('');
    setGeneratedOtp('');
    setOtpError('');
    setToastNotice(null);
    onClose();
  };

  const handleVerifyOtp = () => {
    if (enteredOtp.trim() !== generatedOtp.trim()) {
      setOtpError('That code does not match. Please enter the demo code shown below.');
      return;
    }

    setOtpError('');
    // Successful authentication
    const user: UserProfile = {
      id: `usr_wa_${phone.replace(/\D/g, '')}`,
      name: fullName.trim(),
      whatsappNumber: fullPhoneNumber,
      isVerified: true,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName.trim())}&backgroundColor=0B3B60,002541&textColor=ffffff`,
      role: 'buyer',
      preferredCity: 'Freetown',
      joinedAt: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };

    onLoginSuccess(user);
    handleClose();
  };

  const supportMessage = `Hello Abu Marketplace, I need help signing in with WhatsApp. My number is ${fullPhoneNumber}.`;
  const supportUrl = `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(supportMessage)}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-[#DCE1E5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with WhatsApp Green Accent */}
        <div className="bg-[#075E54] text-white p-4 sm:p-5 relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-md">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                <span>WhatsApp Sign In</span>
              </h3>
              <p className="text-[11px] text-[#A7F3D0]">
                Continue with your WhatsApp number
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-2.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Floating Toast Notification for Simulated WhatsApp Message */}
        {toastNotice && (
          <div className="mx-4 mt-3 bg-[#E8F5E9] border border-[#25D366] text-[#1B5E20] p-3 rounded-lg shadow-sm text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <MessageSquare className="w-4 h-4 text-[#25D366] shrink-0 mt-0.5 fill-current" />
            <div className="flex-1">
              <div className="font-bold text-[11px] uppercase tracking-wider text-[#075E54]">
                Demo sign-in code
              </div>
              <div className="font-semibold text-xs mt-0.5">{toastNotice}</div>
            </div>
          </div>
        )}

        {/* If already logged in, show user profile details & logout */}
        {currentUser ? (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 flex items-center gap-3.5">
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-14 h-14 rounded-full border-2 border-[#25D366] shadow-xs object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-[#0F172A] truncate">
                    {currentUser.name}
                  </h4>
                  <CheckCircle2 className="w-4 h-4 text-[#25D366] fill-emerald-100 shrink-0" />
                </div>
                <div className="text-xs font-semibold text-[#075E54] flex items-center gap-1 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{currentUser.whatsappNumber}</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">
                  Role: Shopper · Joined {currentUser.joinedAt}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-[#334155] bg-[#F1F5F9] p-3 rounded-lg border border-[#CBD5E1]">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">WhatsApp Status:</span>
                <span className="font-bold text-[#16A34A] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block animate-pulse"></span>
                  Active & Authenticated
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Order Updates:</span>
                <span className="font-semibold text-[#0F172A]">Direct to WhatsApp</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Payment Policy:</span>
                <span className="font-bold text-[#0B3B60]">Pay on Delivery (Cash)</span>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setStep('input');
                }}
                className="flex-1 py-2.5 px-4 bg-[#FEE2E2] hover:bg-[#FCA5A5] text-[#991B1B] font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Log Out of WhatsApp
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-[#0B3B60] hover:bg-[#002541] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        ) : step === 'input' ? (
          /* STEP 1: Phone Number & Name Input */
          <div className="p-5 sm:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                Your Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] focus:border-[#25D366] focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1E293B] mb-1">
                WhatsApp Phone Number
              </label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="h-10 px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-bold text-[#0F172A] focus:border-[#25D366] focus:outline-none"
                >
                  <option value="+232">🇸🇱 +232 (Sierra Leone)</option>
                  <option value="+234">🇳🇬 +234 (Nigeria)</option>
                  <option value="+233">🇬🇭 +233 (Ghana)</option>
                  <option value="+224">🇬🇳 +224 (Guinea)</option>
                  <option value="+231">🇱🇷 +231 (Liberia)</option>
                  <option value="+1">🇺🇸 +1 (USA / Canada)</option>
                  <option value="+44">🇬🇧 +44 (UK)</option>
                </select>

                <div className="relative flex-1">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="w-full h-10 px-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-sm text-[#0F172A] font-semibold focus:border-[#25D366] focus:bg-white focus:outline-none transition-colors"
                  />
                  {carrier.carrier && (
                    <span 
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-2xs"
                      style={{ backgroundColor: carrier.badgeColor }}
                    >
                      {carrier.carrier === 'orange' ? 'Orange' : 'Africell'}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] mt-1.5">
                This demo generates a code here. WhatsApp code delivery is not configured yet.
              </p>
            </div>

            {otpError && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {otpError}
              </div>
            )}

            {/* Quick Benefits Checklist */}
            <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-1.5 text-xs text-[#475569]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                <span>Instant dispatch status & live tracking on WhatsApp</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                <span>One-tap Pay on Delivery checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                <span>No password required — login with your mobile phone</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSendCode}
              className="w-full h-11 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Generate demo code</span>
            </button>
          </div>
        ) : (
          /* STEP 2: OTP Verification */
          <div className="p-5 sm:p-6 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#E8F5E9] text-[#25D366] mb-2">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#0F172A]">
                Enter your verification code
              </h4>
              <p className="text-xs text-[#64748B] mt-1">
                For <strong className="text-[#075E54]">{fullPhoneNumber}</strong>
              </p>
            </div>

            {/* OTP Input */}
            <div>
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Six-digit verification code"
                className="w-full h-12 text-center tracking-[0.5em] text-xl font-bold bg-[#F8FAFC] border-2 border-[#CBD5E1] focus:border-[#25D366] rounded-lg focus:outline-none transition-colors"
                autoFocus
              />
            </div>

            {otpError && (
              <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 text-center">
                {otpError}
              </div>
            )}

            {/* Demo-only code and support contact */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] p-3 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[#166534] font-semibold">Demo code (not sent):</span>
                <span className="font-mono font-bold text-sm text-[#14532D] tracking-widest bg-white px-2 py-0.5 rounded border border-[#86EFAC]">
                  {generatedOtp}
                </span>
              </div>
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-white hover:bg-slate-50 text-[#075E54] font-bold rounded border border-[#CBD5E1] transition-colors flex items-center justify-center gap-1.5"
                title="Contact Abu Marketplace support on WhatsApp"
              >
                <span>Need help? Contact us on WhatsApp</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <div className="text-center text-[11px] text-[#64748B]">
                <span>{MARKETPLACE_ADDRESS} · </span>
                <a
                  href={`mailto:${MARKETPLACE_SUPPORT_EMAIL}`}
                  className="text-[#075E54] hover:underline"
                >
                  {MARKETPLACE_SUPPORT_EMAIL}
                </a>
              </div>
            </div>

            {/* Verify CTA */}
            <button
              type="button"
              onClick={handleVerifyOtp}
              className="w-full h-11 bg-[#0B3B60] hover:bg-[#002541] text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Confirm & Log In</span>
            </button>

            {/* Resend & Back options */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setEnteredOtp('');
                  setGeneratedOtp('');
                  setOtpError('');
                  setStep('input');
                }}
                className="text-[#64748B] hover:text-[#0F172A] font-semibold cursor-pointer"
              >
                ← Change Number
              </button>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0}
                className="text-[#075E54] hover:underline font-bold disabled:text-gray-400 cursor-pointer"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
              </button>
            </div>
          </div>
        )}

        {/* Modal Bottom Safety Guarantee */}
        <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] p-3 text-center text-[11px] text-[#64748B] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
          <span>Demo sign-in · WhatsApp code delivery is not configured</span>
        </div>
      </div>
    </div>
  );
};
