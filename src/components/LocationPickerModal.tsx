import React from 'react';
import { X, MapPin, Clock, Check } from 'lucide-react';
import { LocationNode, Province } from '../types';
import { SIERRA_LEONE_LOCATIONS } from '../data/mockData';

interface LocationPickerModalProps {
  currentLocation: LocationNode;
  onSelectLocation: (loc: LocationNode) => void;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  currentLocation,
  onSelectLocation,
  onClose,
}) => {
  const provinces: Province[] = [
    'Western Area',
    'Southern Province',
    'Northern Province',
    'Eastern Province',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full border border-[#DCE1E5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B3B60] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#8df7c1]" />
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                Select Delivery Destination
              </h2>
              <p className="text-[11px] text-[#d0e4ff]">
                Live lead times & shipping rates across Sierra Leone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Close location selector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Province Groupings */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-4">
          {provinces.map((prov) => {
            const locsInProv = SIERRA_LEONE_LOCATIONS.filter(
              (l) => l.province === prov
            );

            return (
              <div key={prov} className="space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#5A6872] px-1">
                  {prov}
                </h3>
                <div className="space-y-1">
                  {locsInProv.map((loc) => {
                    const isSelected = currentLocation.id === loc.id;
                    return (
                      <button
                        key={loc.id}
                        onClick={() => {
                          onSelectLocation(loc);
                          onClose();
                        }}
                        className={`w-full p-2.5 rounded text-left flex items-center justify-between transition-colors border cursor-pointer ${
                          isSelected
                            ? 'bg-[#eaf5ff] border-[#0B3B60] text-[#002541]'
                            : 'bg-white border-[#DCE1E5] hover:border-[#0B3B60] text-[#1A242D]'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 rounded-full p-1 ${
                            isSelected ? 'bg-[#0B3B60] text-white' : 'bg-[#F4F6F8] text-[#5A6872]'
                          }`}>
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm">
                              {loc.name}
                            </div>
                            <div className="text-[11px] text-[#5A6872] flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-[#4ab584]" />
                              <span>{loc.transitTime}</span>
                              <span>·</span>
                              <span className="font-semibold text-[#0B3B60]">
                                SLE {loc.deliveryFeeSLE} standard fee
                              </span>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="bg-[#00875A] text-white p-1 rounded-full">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="p-3 bg-[#F4F6F8] border-t border-[#DCE1E5] text-[11px] text-[#5A6872] flex items-center justify-between">
          <span>All packages insured during provincial transit</span>
          <button
            onClick={onClose}
            className="font-bold text-[#0B3B60] hover:underline"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
