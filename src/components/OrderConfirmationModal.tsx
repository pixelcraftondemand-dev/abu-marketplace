import React from 'react';
import { CheckCircle2, PackageCheck, MapPin, Phone, ArrowRight, X } from 'lucide-react';
import { Order } from '../types';
import { WHATSAPP_SUPPORT_NUMBER } from '../data/contactDetails';

interface OrderConfirmationModalProps {
  order: Order | null;
  onClose: () => void;
  onTrackOrder: (order: Order) => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  order,
  onClose,
  onTrackOrder,
}) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#002541]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="relative bg-white rounded-lg shadow-2xl max-w-lg w-full border border-[#DCE1E5] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Header */}
        <div className="bg-[#00875A] text-white p-6 text-center">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow">
            <CheckCircle2 className="w-8 h-8 text-[#00875A]" />
          </div>
          <h2 className="text-xl font-extrabold">Order Confirmed!</h2>
          <p className="text-xs text-white/90 mt-1">
            Payment verified. Your merchant is preparing dispatch.
          </p>
          <div className="mt-3 inline-block bg-white/20 px-3 py-1 rounded text-xs font-mono font-bold tracking-wider">
            Tracking #: {order.trackingNumber}
          </div>
        </div>

        {/* Receipt Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="bg-[#F4F6F8] p-3 rounded border border-[#DCE1E5] space-y-2">
            <div className="flex justify-between items-center text-[#5A6872]">
              <span>Recipient:</span>
              <span className="font-bold text-[#1A242D]">{order.recipientName}</span>
            </div>
            <div className="flex justify-between items-center text-[#5A6872]">
              <span>Destination:</span>
              <span className="font-bold text-[#1A242D]">{order.destination.name}</span>
            </div>
            <div className="flex justify-between items-center text-[#5A6872]">
              <span>Address:</span>
              <span className="text-[#1A242D] text-right truncate max-w-[200px]">
                {order.streetAddress} {order.landmark && `(${order.landmark})`}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#5A6872]">
              <span>Payment Mode:</span>
              <span className="font-bold uppercase text-[#0B3B60]">
                {order.paymentMethod === 'orange' ? 'Orange Money (*144#)' : order.paymentMethod === 'afrimoney' ? 'Afrimoney (*161#)' : 'Pay on Delivery'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[#5A6872] pt-1 border-t border-[#DCE1E5]">
              <span className="font-bold text-sm text-[#0B3B60]">
                {order.paymentMethod === 'cash' ? 'Amount Due on Delivery:' : 'Total:'}
              </span>
              <span className="font-extrabold text-sm text-[#0B3B60] tabular-nums">
                SLE {new Intl.NumberFormat('en-US').format(order.totalSLE)}
              </span>
            </div>
          </div>

          {/* Delivery estimate */}
          <div className="bg-[#eaf5ff] p-3 rounded border border-[#c2c7cf] flex items-center justify-between text-[#002541]">
            <div>
              <div className="font-bold">Estimated Delivery Time</div>
              <div className="text-[11px] text-[#42474e]">
                {order.estimatedDelivery} via {order.destination.hubName}
              </div>
            </div>
            <span className="bg-[#00875A] text-white text-[10px] font-bold px-2 py-0.5 rounded">
              Priority Express
            </span>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => onTrackOrder(order)}
              className="w-full h-11 bg-[#0B3B60] hover:bg-[#002541] text-white rounded font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow transition-colors cursor-pointer"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Track Live Delivery Status</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* WhatsApp Receipt & Direct Updates */}
            <a
              href={`https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(`Hello Abu Marketplace! I just placed order ${order.trackingNumber} for ${order.recipientName}. Total: SLE ${order.totalSLE} (Cash on Delivery). Please send dispatch updates to my WhatsApp!`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-10 bg-[#25D366] hover:bg-[#1EBE5D] text-[#002541] rounded font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.149.929 3.182 0 5.767-2.587 5.768-5.766 0-3.187-2.583-5.771-5.768-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.698.077-2.222-.555-1.879-.779-3.076-2.695-3.17-2.821-.093-.125-.762-1.014-.762-1.934 0-.92.482-1.371.654-1.558.172-.187.375-.234.5-.234.125 0 .25 0 .359.006.115.006.27-.044.423.324.156.375.531 1.297.578 1.391.047.094.078.203.016.328-.063.125-.094.203-.188.312-.094.109-.197.244-.281.328-.094.094-.192.197-.082.385.109.188.487.804 1.046 1.302.721.642 1.328.841 1.516.934.188.094.297.078.406-.047.109-.125.469-.546.594-.734.125-.187.25-.156.422-.094.172.062 1.094.516 1.281.609.188.094.312.141.359.219.047.078.047.453-.097.858z"/>
              </svg>
              <span>Get WhatsApp Live Dispatch Alerts</span>
            </a>

            <button
              onClick={onClose}
              className="w-full h-9 bg-white hover:bg-slate-50 text-[#5A6872] border border-[#DCE1E5] rounded text-xs font-semibold transition-colors cursor-pointer"
            >
              Continue Shopping on Abu Marketplace
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};
