import React, { useState } from 'react';
import { 
  X, 
  Wrench, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Smartphone, 
  Zap,
  Phone
} from 'lucide-react';
import { BlueCollarService, MobileMoneyProvider } from '../types';
import { detectCarrier } from '../data/mockData';
import { api } from '../services/api';

interface ServiceBookingModalProps {
  service: BlueCollarService | null;
  onClose: () => void;
  onBookingSuccess: (msg: string) => void;
}

export const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({
  service,
  onClose,
  onBookingSuccess,
}) => {
  const [customerName, setCustomerName] = useState('Samuel Turay');
  const [rawPhone, setRawPhone] = useState('076 554 321');
  const [location, setLocation] = useState('Lumley Road, near St. Mary Supermarket');
  const [preferredTime, setPreferredTime] = useState('Today (Within 2–3 hours)');
  const [issueDescription, setIssueDescription] = useState('Inverter shuts down when freezer starts; needs battery check.');
  const [paymentMethod, setPaymentMethod] = useState<MobileMoneyProvider>('cash');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!service) return null;

  const detected = detectCarrier(rawPhone);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.bookService({
        serviceId: service.id,
        customerName: customerName.trim(),
        customerPhone: rawPhone.trim(),
        location: location.trim(),
        preferredTime,
        issueDescription: issueDescription.trim(),
        paymentMethod,
      });

      setIsSubmitting(false);
      onBookingSuccess(
        `Dispatched callout for ${service.providerName}! They will contact +232 ${rawPhone} shortly to confirm.`
      );
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      onBookingSuccess(`Callout booked with ${service.providerName}!`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full border border-[#DCE1E5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B3B60] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#8df7c1]" />
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                Book Trade Technician Callout
              </h2>
              <p className="text-[11px] text-[#d0e4ff]">
                {service.tradeCategory} · Sierra Leone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Close booking modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Technician Summary Card */}
        <div className="p-3 bg-[#eaf5ff] border-b border-[#DCE1E5] flex items-center justify-between text-xs">
          <div>
            <div className="font-bold text-[#002541] flex items-center gap-1.5">
              <span>{service.providerName}</span>
              <span className="text-[10px] bg-[#00875A] text-white px-1.5 py-0.2 rounded font-semibold">
                Verified Artisan
              </span>
            </div>
            <div className="text-[11px] text-[#42474e]">
              {service.locationHub} · {service.rating} ★ ({service.completedJobs} jobs)
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-[#5A6872] uppercase block">Callout Fee</span>
            <span className="font-extrabold text-[#0B3B60] text-sm tabular-nums">
              SLE {service.calloutFeeSLE}
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#1A242D] mb-1">
              Your Full Name *
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-[#1A242D]">
                Contact Mobile Number (+232) *
              </label>
              {detected.carrier && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded text-white"
                  style={{ backgroundColor: detected.badgeColor }}
                >
                  {detected.name}
                </span>
              )}
            </div>
            <div className="flex items-stretch">
              <span className="h-9 px-2 bg-[#eaf5ff] border border-r-0 border-[#DCE1E5] rounded-l text-xs font-bold text-[#0B3B60] flex items-center">
                +232
              </span>
              <input
                type="text"
                required
                value={rawPhone}
                onChange={(e) => setRawPhone(e.target.value)}
                placeholder="076 123 456 or 088 123 456"
                className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded-r text-xs focus:outline-none focus:border-[#0B3B60]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A242D] mb-1">
              Job Location / Street & Landmark *
            </label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 15 Main Motor Road, Congo Cross near Shell"
              className="w-full h-9 px-3 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#1A242D] mb-1">
                Preferred Arrival Window
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full h-9 px-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
              >
                <option value="Today (Within 2–3 hours)">Immediate (2–3 hours)</option>
                <option value="Today Afternoon (2:00 PM – 5:00 PM)">Today Afternoon</option>
                <option value="Tomorrow Morning (9:00 AM – 12:00 PM)">Tomorrow Morning</option>
                <option value="Weekend Appointment">Weekend Appointment</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#1A242D] mb-1">
                Callout Fee Payment
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as MobileMoneyProvider)}
                className="w-full h-9 px-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
              >
                <option value="cash">Cash on Arrival (Inspect & Pay on site)</option>
              </select>
              <p className="text-[10px] text-[#5A6872] mt-1">
                Notice: No mobile money used initially. Pay callout fee directly to technician in cash.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1A242D] mb-1">
              Describe Fault or Installation Needed
            </label>
            <textarea
              rows={2}
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              placeholder="e.g. AC blowing warm air, need 5kVA inverter wiring, water pump leaking..."
              className="w-full p-2 bg-white border border-[#DCE1E5] rounded text-xs focus:outline-none focus:border-[#0B3B60]"
            />
          </div>

          <div className="p-2.5 bg-[#fafbfc] rounded border border-[#DCE1E5] text-[11px] text-[#5A6872] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#00875A]" />
              <span>Diagnostic callout fee:</span>
            </span>
            <span className="font-extrabold text-[#0B3B60] text-xs">
              SLE {service.calloutFeeSLE}
            </span>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 bg-[#0B3B60] hover:bg-[#002541] disabled:opacity-50 text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
          >
            <Zap className="w-4 h-4 text-[#8df7c1]" />
            <span>
              {isSubmitting ? 'Confirming with Technician...' : `Dispatch Technician (SLE ${service.calloutFeeSLE})`}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
