import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  Smartphone, 
  CreditCard, 
  ArrowLeft,
  Check,
  Zap,
  Info
} from 'lucide-react';
import { CartItem, LocationNode, MobileMoneyProvider, Order, UserProfile } from '../types';
import { SIERRA_LEONE_LOCATIONS, detectCarrier } from '../data/mockData';
import { api } from '../services/api';
import { MessageSquare } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currentLocation: LocationNode;
  initialPaymentMethod?: MobileMoneyProvider;
  onOrderSuccess: (order: Order) => void;
  currentUser?: UserProfile | null;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  currentLocation,
  initialPaymentMethod = 'cash',
  onOrderSuccess,
  currentUser,
}) => {
  const [step, setStep] = useState<'details' | 'payment' | 'ussd_push'>('details');
  const [recipientName, setRecipientName] = useState(currentUser?.name || 'Mohamed Kamara');
  const [rawPhone, setRawPhone] = useState(currentUser?.whatsappNumber || '076 123 456');
  const [selectedLocation, setSelectedLocation] = useState<LocationNode>(currentLocation);
  const [streetAddress, setStreetAddress] = useState('14 Rawdon Street, Central');
  const [landmark, setLandmark] = useState('Opposite St. George Cathedral');
  const [paymentMethod, setPaymentMethod] = useState<MobileMoneyProvider>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ussdTimer, setUssdTimer] = useState(45);

  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setRecipientName(currentUser.name);
      if (currentUser.whatsappNumber) setRawPhone(currentUser.whatsappNumber);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const detected = detectCarrier(rawPhone);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.priceSLE * item.quantity,
    0
  );
  const deliveryFee = selectedLocation.deliveryFeeSLE;
  const totalAmount = subtotal + deliveryFee;

  const handlePhoneChange = (val: string) => {
    setRawPhone(val);
  };

  const handleInitiatePayment = async () => {
    if (paymentMethod === 'cash') {
      await completeOrder('completed');
      return;
    }

    // Call backend API for USSD push
    try {
      await api.initiateUSSDPush(rawPhone, totalAmount, paymentMethod);
    } catch (e) {
      console.warn('Backend USSD trigger:', e);
    }

    setStep('ussd_push');
    setUssdTimer(45);
  };

  const completeOrder = async (status: 'completed' | 'authorized') => {
    setIsProcessing(true);
    
    // Attempt backend persistence
    const backendOrder = await api.createOrder({
      items: cartItems,
      recipientName: recipientName.trim() || 'Sierra Leone Customer',
      phone: rawPhone,
      destinationId: selectedLocation.id,
      streetAddress: streetAddress.trim() || 'Freetown Center',
      landmark: landmark.trim(),
      paymentMethod,
    });

    const trackingCode = backendOrder?.trackingNumber || `ABU-SL-${Math.floor(10000 + Math.random() * 90000)}`;
    const finalOrder: Order = backendOrder || {
      id: `ord-${Date.now()}`,
      items: cartItems,
      subtotalSLE: subtotal,
      deliveryFeeSLE: deliveryFee,
      totalSLE: totalAmount,
      recipientName: recipientName.trim() || 'Sierra Leone Customer',
      phone: rawPhone,
      destination: selectedLocation,
      streetAddress: streetAddress.trim() || 'Freetown Center',
      landmark: landmark.trim(),
      paymentMethod,
      paymentStatus: status,
      orderStatus: 'placed',
      placedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      estimatedDelivery: selectedLocation.transitTime,
      trackingNumber: trackingCode,
    };

    setIsProcessing(false);
    onOrderSuccess(finalOrder);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-[#DCE1E5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B3B60] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#8df7c1]" />
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                Abu Marketplace Secure Checkout
              </h2>
              <p className="text-[11px] text-[#d0e4ff]">
                Sierra Leone Leones (SLE) · Direct Mobile Money Settlement
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bg-[#eaf5ff] px-4 py-2 border-b border-[#DCE1E5] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 'details'
                  ? 'bg-[#0B3B60] text-white'
                  : 'bg-[#00875A] text-white'
              }`}
            >
              1
            </span>
            <span className={step === 'details' ? 'font-bold text-[#0B3B60]' : 'text-[#5A6872]'}>
              Delivery Details
            </span>
          </div>

          <span className="text-[#c2c7cf]">———</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 'payment'
                  ? 'bg-[#0B3B60] text-white'
                  : step === 'ussd_push'
                  ? 'bg-[#00875A] text-white'
                  : 'bg-white text-[#73777f] border border-[#c2c7cf]'
              }`}
            >
              2
            </span>
            <span className={step === 'payment' ? 'font-bold text-[#0B3B60]' : 'text-[#5A6872]'}>
              Mobile Payment
            </span>
          </div>

          <span className="text-[#c2c7cf]">———</span>

          <div className="flex items-center gap-2">
            <span
              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                step === 'ussd_push'
                  ? 'bg-[#0B3B60] text-white'
                  : 'bg-white text-[#73777f] border border-[#c2c7cf]'
              }`}
            >
              3
            </span>
            <span className={step === 'ussd_push' ? 'font-bold text-[#0B3B60]' : 'text-[#5A6872]'}>
              Authorization
            </span>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm text-[#1A242D] mb-1">
                  Recipient & Contact
                </h3>
                <p className="text-xs text-[#5A6872]">
                  We will contact this number for arrival notification and mobile money push.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#1A242D] mb-1">
                    Recipient Full Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="e.g. Foday Koroma"
                    className="w-full h-10 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60] focus:ring-2 focus:ring-[#0B3B60]/10"
                  />
                </div>

                {/* Phone Input with +232 prefix and live network detection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#1A242D]">
                      Mobile Phone Number
                    </label>
                    {detected.carrier && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.2 rounded text-white"
                        style={{ backgroundColor: detected.badgeColor }}
                      >
                        {detected.name} ({detected.ussdCode})
                      </span>
                    )}
                  </div>
                  <div className="flex items-stretch">
                    <span className="h-10 px-2.5 bg-[#eaf5ff] border border-r-0 border-[#DCE1E5] rounded-l text-xs font-bold text-[#0B3B60] flex items-center shrink-0">
                      +232
                    </span>
                    <input
                      type="text"
                      value={rawPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="076 123 456 or 088 123 456"
                      className="w-full h-10 px-3 bg-white border border-[#DCE1E5] rounded-r text-xs focus:outline-none focus:border-[#0B3B60] focus:ring-2 focus:ring-[#0B3B60]/10"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Destination Hub */}
              <div>
                <label className="block text-xs font-bold text-[#1A242D] mb-1">
                  Destination Province & City
                </label>
                <select
                  value={selectedLocation.id}
                  onChange={(e) => {
                    const found = SIERRA_LEONE_LOCATIONS.find(
                      (l) => l.id === e.target.value
                    );
                    if (found) setSelectedLocation(found);
                  }}
                  className="w-full h-10 px-3 bg-white border border-[#DCE1E5] rounded text-xs font-medium focus:outline-none focus:border-[#0B3B60] cursor-pointer"
                >
                  {SIERRA_LEONE_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.province}) — {loc.transitTime} — SLE {loc.deliveryFeeSLE}
                    </option>
                  ))}
                </select>
              </div>

              {/* Street Address & Landmark */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#1A242D] mb-1">
                    Street / Quarter / Address
                  </label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 24 Campbell Street, Brookfields"
                    className="w-full h-10 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1A242D] mb-1">
                    Prominent Landmark (for driver)
                  </label>
                  <input
                    type="text"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near Youyi Building / Total Station"
                    className="w-full h-10 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
                  />
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="bg-[#fafbfc] p-3 rounded border border-[#DCE1E5] text-xs">
                <div className="font-bold text-[#1A242D] mb-2 flex items-center justify-between">
                  <span>Cart Items ({cartItems.length}):</span>
                  <span className="text-[#0B3B60]">
                    Subtotal: SLE {new Intl.NumberFormat('en-US').format(subtotal)}
                  </span>
                </div>
                <div className="space-y-1 text-[#5A6872] max-h-24 overflow-y-auto">
                  {cartItems.map(({ product, quantity }) => (
                    <div key={product.id} className="flex justify-between items-center text-[11px]">
                      <span className="truncate max-w-[280px]">
                        {quantity}x {product.title}
                      </span>
                      <span className="tabular-nums font-semibold text-[#1A242D]">
                        SLE {new Intl.NumberFormat('en-US').format(product.priceSLE * quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => setStep('payment')}
                className="w-full h-11 bg-[#0B3B60] hover:bg-[#002541] text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
              >
                <span>Continue to Mobile Payment</span>
                <span>(Total: SLE {new Intl.NumberFormat('en-US').format(totalAmount)})</span>
              </button>
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-[#1A242D] mb-0.5">
                    Select Payment Method
                  </h3>
                  <p className="text-xs text-[#5A6872]">
                    Initial Launch Policy: All orders are fulfilled via Pay on Delivery. No mobile money is used initially.
                  </p>
                </div>
                <button
                  onClick={() => setStep('details')}
                  className="text-xs text-[#0B3B60] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Edit Address
                </button>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2.5">
                {/* 1. Cash on Delivery (Active) */}
                <label
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded border flex items-center justify-between cursor-pointer transition-colors ${
                    paymentMethod === 'cash'
                      ? 'border-[#00875A] bg-[#f0faf5] shadow-xs'
                      : 'border-[#DCE1E5] hover:border-gray-400 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#00875A] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                      COD
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-[#1A242D] flex items-center gap-2">
                        <span>Pay on Delivery / Pickup</span>
                        <span className="text-[10px] bg-[#00875A] text-white font-bold px-1.5 py-0.2 rounded">
                          Active
                        </span>
                      </div>
                      <div className="text-[11px] text-[#5A6872]">
                        Inspect goods in person upon arrival before paying physical cash
                      </div>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                    paymentMethod === 'cash'
                      ? 'border-[#00875A] bg-[#00875A] text-white'
                      : 'border-[#c2c7cf]'
                  }`}>
                    {paymentMethod === 'cash' && <Check className="w-3.5 h-3.5" />}
                  </div>
                </label>

                {/* Notice on Mobile Money */}
                <div className="p-2.5 rounded bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-center gap-2">
                  <span className="font-bold text-sm">ℹ️</span>
                  <span>Notice: No mobile money (Orange Money or Afrimoney) will be used initially. Payments are accepted strictly via Cash on Delivery upon physical inspection.</span>
                </div>
              </div>

              {/* Order Financial Breakdown */}
              <div className="bg-[#f5faff] p-3 rounded border border-[#DCE1E5] space-y-1.5 text-xs">
                <div className="flex justify-between text-[#5A6872]">
                  <span>Items Subtotal:</span>
                  <span className="font-bold text-[#1A242D] tabular-nums">
                    SLE {new Intl.NumberFormat('en-US').format(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[#5A6872]">
                  <span>Fulfillment to {selectedLocation.name}:</span>
                  <span className="font-bold text-[#1A242D] tabular-nums">
                    SLE {deliveryFee}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-[#0B3B60] pt-1.5 border-t border-[#DCE1E5]">
                  <span>Total Due (SLE):</span>
                  <span className="text-base tabular-nums">
                    SLE {new Intl.NumberFormat('en-US').format(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Authorize Trigger Button */}
              <button
                onClick={handleInitiatePayment}
                className="w-full h-11 bg-[#D84315] hover:bg-[#b12d00] text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>
                  {paymentMethod === 'cash'
                    ? 'Confirm Order with Pay on Delivery'
                    : `Authorize SLE ${new Intl.NumberFormat('en-US').format(totalAmount)} via ${
                        paymentMethod === 'orange' ? 'Orange Money' : 'Afrimoney'
                      }`}
                </span>
              </button>
            </div>
          )}

          {step === 'ussd_push' && (
            <div className="text-center py-4 px-2 space-y-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center animate-pulse"
                style={{
                  backgroundColor: paymentMethod === 'orange' ? '#FF6600' : '#7A1CAC',
                  color: '#ffffff',
                }}
              >
                <Smartphone className="w-8 h-8" />
              </div>

              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-[#1A242D]">
                  USSD Push Request Sent!
                </h3>
                <p className="text-xs text-[#5A6872] mt-1 max-w-md mx-auto">
                  A payment authorization prompt has been dispatched to{' '}
                  <strong className="text-[#0B3B60]">+232 {rawPhone}</strong>.
                </p>
              </div>

              {/* Simulated Handset Screen */}
              <div className="max-w-xs mx-auto bg-[#001d35] text-white p-4 rounded-lg shadow-inner text-left font-mono text-xs border-2 border-[#1f496f]">
                <div className="flex justify-between text-[10px] text-[#7fa6d0] border-b border-[#1f496f] pb-1 mb-2">
                  <span>{paymentMethod === 'orange' ? 'ORANGE MONEY' : 'AFRIMONEY'}</span>
                  <span>{paymentMethod === 'orange' ? '*144#' : '*161#'}</span>
                </div>
                <div className="text-[#8df7c1] font-bold mb-1">
                  Abu Marketplace Payment
                </div>
                <div className="text-white text-[11px] mb-2">
                  Pay SLE {new Intl.NumberFormat('en-US').format(totalAmount)} to Abu Logistics SL?
                </div>
                <div className="bg-[#002541] p-1.5 rounded text-[10px] text-[#d0e4ff] flex items-center justify-between">
                  <span>Enter 4-digit PIN:</span>
                  <span className="tracking-widest">••••</span>
                </div>
              </div>

              <div className="text-xs text-[#5A6872]">
                Please check your handset screen within{' '}
                <strong className="text-[#D84315] tabular-nums">{ussdTimer}s</strong> to authorize.
              </div>

              {/* Simulation One-Click Action */}
              <div className="pt-2">
                <button
                  disabled={isProcessing}
                  onClick={() => completeOrder('authorized')}
                  className="w-full sm:w-auto px-6 h-11 bg-[#00875A] hover:bg-[#00704a] text-white font-bold text-xs sm:text-sm rounded shadow flex items-center justify-center gap-2 mx-auto cursor-pointer"
                >
                  {isProcessing ? (
                    <span>Verifying with Telecom Gateway...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Approve Payment & Confirm Order (Demo Simulation)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
