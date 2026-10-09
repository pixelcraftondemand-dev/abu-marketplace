import React, { useState } from 'react';
import { 
  X, 
  Search, 
  PackageCheck, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Order } from '../types';
import { api } from '../services/api';

interface OrderTrackingModalProps {
  orders: Order[];
  activeOrder?: Order | null;
  onClose: () => void;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  orders,
  activeOrder,
  onClose,
}) => {
  const [searchCode, setSearchCode] = useState(activeOrder ? activeOrder.trackingNumber : '');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(
    activeOrder || (orders.length > 0 ? orders[0] : null)
  );

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchCode.trim().toUpperCase();
    if (!query) return;
    
    setSearchError('');
    setIsSearching(true);

    // Check local memory first
    const match = orders.find((o) => o.trackingNumber.toUpperCase().includes(query));
    if (match) {
      setSelectedOrder(match);
      setIsSearching(false);
      return;
    }

    // Query backend API
    const remoteOrder = await api.getOrder(query);
    if (remoteOrder) {
      setSelectedOrder(remoteOrder);
    } else {
      setSearchError(`No active shipment found with tracking code: ${query}`);
    }
    setIsSearching(false);
  };

  // Default sample order if user opened tracking without having placed an order yet
  const displayOrder: Order = selectedOrder || {
    id: 'sample-ord-1',
    items: [],
    subtotalSLE: 1850,
    deliveryFeeSLE: 15,
    totalSLE: 1865,
    recipientName: 'Kallon Sesay',
    phone: '076 892 110',
    destination: {
      id: 'freetown-central',
      name: 'Freetown (Central / CBD)',
      province: 'Western Area',
      transitTime: 'Same-Day (2–4 hrs)',
      deliveryFeeSLE: 15,
      hubName: 'Siaka Stevens Hub',
    },
    streetAddress: '19 Siaka Stevens Street, Freetown',
    landmark: 'Opposite Cotton Tree',
    paymentMethod: 'orange',
    paymentStatus: 'authorized',
    orderStatus: 'in_transit',
    placedAt: '10:15 AM Today',
    estimatedDelivery: 'Within 2 hours',
    trackingNumber: 'ABU-SL-78214',
  };

  const steps = [
    {
      title: 'Order Placed & Payment Authorized',
      desc: `Paid via ${displayOrder.paymentMethod === 'orange' ? 'Orange Money' : displayOrder.paymentMethod === 'afrimoney' ? 'Afrimoney' : 'Pay on Delivery'}`,
      time: displayOrder.placedAt,
      completed: true,
    },
    {
      title: 'Verified Merchant Packaging',
      desc: `Dispatched from ${displayOrder.destination.hubName}`,
      time: '10:45 AM',
      completed: true,
    },
    {
      title: 'In Transit via Regional Courier',
      desc: 'Vehicle en route with Sierra Leone dispatch seal',
      time: '11:20 AM',
      completed: true,
    },
    {
      title: 'Out for Final Delivery',
      desc: `Driver arriving at ${displayOrder.streetAddress}`,
      time: displayOrder.estimatedDelivery,
      completed: displayOrder.orderStatus === 'delivered',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-2xl w-full border border-[#DCE1E5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B3B60] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-[#8df7c1]" />
            <div>
              <h2 className="font-bold text-sm sm:text-base">
                Fulfillment & Package Tracker
              </h2>
              <p className="text-[11px] text-[#d0e4ff]">
                Live logistics tracking across Sierra Leone nodes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded hover:bg-white/10 text-white/80 hover:text-white"
            aria-label="Close order tracker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search / Select Order */}
        <div className="p-4 bg-[#F4F6F8] border-b border-[#DCE1E5]">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Enter tracking number (e.g. ABU-SL-78214)..."
                className="w-full h-10 px-3 bg-white border border-[#DCE1E5] rounded text-xs font-mono font-medium focus:outline-none focus:border-[#0B3B60]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#0B3B60] hover:bg-[#002541] disabled:opacity-50 text-white px-4 h-10 rounded text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isSearching ? 'Searching...' : 'Track'}</span>
            </button>
          </form>

          {searchError && (
            <div className="mt-2 text-xs text-[#ba1a1a] bg-[#ffdad6] p-2 rounded font-semibold">
              {searchError}
            </div>
          )}

          {/* Quick list of past orders */}
          {orders.length > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-[#5A6872] shrink-0 font-semibold">Your orders:</span>
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setSelectedOrder(o);
                    setSearchCode(o.trackingNumber);
                  }}
                  className={`px-2 py-0.5 rounded font-mono text-[11px] shrink-0 border transition-colors cursor-pointer ${
                    displayOrder.trackingNumber === o.trackingNumber
                      ? 'bg-[#0B3B60] text-white border-[#0B3B60]'
                      : 'bg-white text-[#0B3B60] border-[#DCE1E5] hover:border-[#0B3B60]'
                  }`}
                >
                  {o.trackingNumber}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live Timeline Display */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-5">
          {/* Status summary banner */}
          <div className="bg-[#eaf5ff] p-3.5 rounded border border-[#c2c7cf] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <div className="text-[10px] uppercase font-bold text-[#5A6872] tracking-wider">
                Tracking Number
              </div>
              <div className="font-mono text-base font-extrabold text-[#002541]">
                {displayOrder.trackingNumber}
              </div>
              <div className="text-[#42474e] mt-0.5">
                Destination: <strong className="text-[#002541]">{displayOrder.destination.name}</strong>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block bg-[#00875A] text-white font-bold text-[11px] px-2.5 py-0.5 rounded">
                In Transit · On Schedule
              </span>
              <div className="text-[11px] text-[#5A6872] mt-1">
                Estimated arrival: <strong className="text-[#1A242D]">{displayOrder.estimatedDelivery}</strong>
              </div>
            </div>
          </div>

          {/* Timeline Milestones */}
          <div className="space-y-4 pl-2">
            {steps.map((st, idx) => (
              <div key={idx} className="flex items-start gap-3 relative">
                {/* Vertical connecting line */}
                {idx < steps.length - 1 && (
                  <div className="absolute left-3.5 top-7 bottom-0 w-0.5 bg-[#DCE1E5]" />
                )}

                {/* Step Circle */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                  st.completed ? 'bg-[#00875A] text-white shadow-xs' : 'bg-slate-200 text-[#73777f]'
                }`}>
                  {st.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                </div>

                {/* Step Details */}
                <div className="flex-1 pb-3">
                  <div className="flex items-baseline justify-between">
                    <h4 className={`text-xs font-bold ${st.completed ? 'text-[#1A242D]' : 'text-[#73777f]'}`}>
                      {st.title}
                    </h4>
                    <span className="text-[10px] font-mono text-[#5A6872]">
                      {st.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5A6872] mt-0.5">
                    {st.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Logistics Driver & Destination Info */}
          <div className="bg-[#fafbfc] p-3.5 rounded border border-[#DCE1E5] text-xs space-y-2">
            <h4 className="font-bold text-[#0B3B60] uppercase text-[11px] tracking-wider">
              Local Delivery Dispatch Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#42474e]">
              <div>
                <span className="text-[#5A6872]">Recipient:</span> {displayOrder.recipientName}
              </div>
              <div>
                <span className="text-[#5A6872]">Phone:</span> +232 {displayOrder.phone}
              </div>
              <div className="sm:col-span-2">
                <span className="text-[#5A6872]">Street Address:</span> {displayOrder.streetAddress} {displayOrder.landmark && `(${displayOrder.landmark})`}
              </div>
            </div>
            <div className="pt-2 border-t border-[#DCE1E5] flex items-center justify-between text-[11px] text-[#5A6872]">
              <div className="flex items-center gap-1.5 text-[#00875A] font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Carrier Handover</span>
              </div>
              <span>Support line: +232 76 000 888</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F4F6F8] border-t border-[#DCE1E5] text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0B3B60] hover:bg-[#002541] text-white text-xs font-bold rounded transition-colors"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
