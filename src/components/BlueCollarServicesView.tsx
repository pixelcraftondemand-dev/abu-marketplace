import React, { useState } from 'react';
import { 
  Wrench, 
  MapPin, 
  CheckCircle2, 
  Star, 
  Clock, 
  PhoneCall, 
  ShieldCheck, 
  Zap, 
  Search,
  SlidersHorizontal,
  Phone
} from 'lucide-react';
import { BlueCollarService, TradeCategory } from '../types';

interface BlueCollarServicesViewProps {
  services: BlueCollarService[];
  onBookService: (service: BlueCollarService) => void;
  onOpenRegisterModal: () => void;
}

export const BlueCollarServicesView: React.FC<BlueCollarServicesViewProps> = ({
  services,
  onBookService,
  onOpenRegisterModal,
}) => {
  const [selectedTrade, setSelectedTrade] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);

  const trades: (TradeCategory | 'All')[] = [
    'All',
    'Solar & Inverter Technician',
    'Electrician & Generator',
    'AC & Refrigeration',
    'Plumbing & Water Tanks',
    'Auto Mechanic & Diagnostics',
    'Phone & Laptop Repair',
  ];

  const filtered = services.filter((srv) => {
    if (selectedTrade !== 'All' && srv.tradeCategory !== selectedTrade) {
      return false;
    }
    if (availableOnly && !srv.isAvailableNow) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = srv.title.toLowerCase().includes(q);
      const matchName = srv.providerName.toLowerCase().includes(q);
      const matchSkills = srv.skills.some((s) => s.toLowerCase().includes(q));
      const matchLoc = srv.locationHub.toLowerCase().includes(q);
      if (!matchTitle && !matchName && !matchSkills && !matchLoc) return false;
    }
    return true;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4">
      {/* Hero Strip for Blue Collar Services */}
      <div className="bg-gradient-to-r from-[#002541] to-[#0B3B60] text-white p-5 sm:p-6 rounded-lg mb-6 border border-[#144b77] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-[#00875A] text-white text-[10px] uppercase font-extrabold px-2 py-0.5 rounded tracking-wider">
              Verified Sierra Leone Trades
            </span>
            <span className="text-xs text-[#8df7c1] font-semibold">
              · Rapid Dispatch in Freetown, Bo & Makeni
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            Hire Certified Blue-Collar Technicians & Artisans
          </h1>
          <p className="text-xs sm:text-sm text-[#d0e4ff] mt-1 max-w-2xl leading-relaxed">
            Connect directly with tested solar installers, residential electricians, AC mechanics, master plumbers, and auto diagnostic technicians. Transparent callout rates in SLE with direct on-site settlement.
          </p>
        </div>

        <button
          onClick={onOpenRegisterModal}
          className="bg-[#D84315] hover:bg-[#b12d00] text-white px-4 py-2.5 rounded font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all shrink-0 cursor-pointer"
        >
          <Wrench className="w-4 h-4" />
          <span>Register as a Service Provider</span>
        </button>
      </div>

      {/* Trade Category Filter Strip */}
      <div className="bg-white rounded border border-[#DCE1E5] p-3 mb-5 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          <span className="text-[11px] font-bold text-[#5A6872] uppercase tracking-wider mr-1 shrink-0">
            Trades:
          </span>
          {trades.map((trade) => {
            const isSelected = selectedTrade === trade;
            return (
              <button
                key={trade}
                onClick={() => setSelectedTrade(trade)}
                className={`h-7 px-3 rounded text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#0B3B60] text-white'
                    : 'bg-[#F4F6F8] text-[#1A242D] hover:bg-gray-200'
                }`}
              >
                {trade}
              </button>
            );
          })}
        </div>

        {/* Search & Availability Bar */}
        <div className="mt-3 pt-3 border-t border-[#DCE1E5] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search technician, skill (e.g., inverter, AC gas, plumbing, scanner)..."
              className="w-full h-8 pl-8 pr-3 bg-[#F4F6F8] rounded border border-[#DCE1E5] text-xs focus:outline-none focus:border-[#0B3B60]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                availableOnly
                  ? 'bg-[#eaf5ff] text-[#00875A] border-[#00875A]'
                  : 'bg-white text-[#5A6872] border-[#DCE1E5]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#00875A] animate-pulse" />
              <span>Available Now Only</span>
            </button>

            <span className="text-[#5A6872] font-semibold">
              <strong className="text-[#0B3B60]">{filtered.length}</strong> artisans available
            </span>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded border border-[#DCE1E5] p-4 flex flex-col justify-between hover:border-[#0B3B60] hover:shadow-md transition-all"
          >
            <div>
              {/* Top Row: Category & Availability */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#0B3B60] uppercase tracking-wide bg-[#eaf5ff] px-2 py-0.5 rounded">
                  {service.tradeCategory}
                </span>

                {service.isAvailableNow ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#00875A] bg-[#f0fdf4] px-1.5 py-0.5 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] animate-ping" />
                    <span>On Call Now</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-[#73777f]">
                    By Appointment
                  </span>
                )}
              </div>

              {/* Service Title */}
              <h3 className="font-bold text-sm text-[#1A242D] leading-snug mb-1">
                {service.title}
              </h3>

              {/* Provider Info */}
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="font-semibold text-[#0B3B60]">
                  {service.providerName}
                </span>
                <span className="text-[#c2c7cf]">·</span>
                <span className="text-[#5A6872]">
                  {service.experienceYears} yrs experience
                </span>
              </div>

              {/* Rating & Completed Jobs */}
              <div className="flex items-center gap-2 text-xs mb-3">
                <div className="flex items-center text-[#d97706] font-bold">
                  <Star className="w-3.5 h-3.5 fill-[#d97706] mr-1" />
                  <span>{service.rating.toFixed(2)}</span>
                </div>
                <span className="text-[#c2c7cf]">·</span>
                <span className="text-[#00875A] font-semibold text-[11px]">
                  {service.completedJobs} verified jobs
                </span>
                <span className="text-[#c2c7cf]">·</span>
                <span className="text-[11px] text-[#5A6872] flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-[#5A6872]" />
                  <span>{service.locationHub}</span>
                </span>
              </div>

              {/* Description */}
              <p className="text-xs text-[#42474e] leading-relaxed mb-3 line-clamp-2">
                {service.description}
              </p>

              {/* Skills Tags */}
              <div className="space-y-1 mb-3">
                {service.skills.slice(0, 3).map((skill, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#5A6872]">
                    <CheckCircle2 className="w-3 h-3 text-[#00875A] shrink-0" />
                    <span className="truncate">{skill}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row: Callout Fee & Action Triggers */}
            <div className="pt-3 border-t border-[#DCE1E5]">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs text-[#5A6872]">Callout Inspection:</span>
                <div className="font-extrabold text-[#1A242D] text-base tabular-nums flex items-baseline">
                  <span className="text-[11px] font-semibold text-[#1A242D] mr-0.5">
                    SLE
                  </span>
                  <span>{service.calloutFeeSLE}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${service.phone}`}
                  className="h-9 bg-[#f4f6f8] hover:bg-slate-200 text-[#1A242D] rounded text-xs font-bold flex items-center justify-center gap-1.5 border border-[#DCE1E5] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-[#0B3B60]" />
                  <span>Call Direct</span>
                </a>

                <button
                  onClick={() => onBookService(service)}
                  className="h-9 bg-[#0B3B60] hover:bg-[#002541] text-white rounded text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-[#8df7c1]" />
                  <span>Book Callout</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
