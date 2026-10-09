import React from 'react';

interface EcommerceDoodlesProps {
  className?: string;
  color?: string;
  opacity?: number;
}

export const EcommerceDoodles: React.FC<EcommerceDoodlesProps> = ({
  className = '',
  color = '#8A7B68',
  opacity = 0.18,
}) => {
  return (
    <div 
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {/* 1. Shopping Bag Doodle (Left-Center) */}
          <g transform="translate(420, 25) rotate(-6)">
            <rect x="0" y="14" width="38" height="44" rx="5" />
            <path d="M11 14 V9 C11 4.5 14.5 1 19 1 C23.5 1 27 4.5 27 9 V14" />
            <path d="M19 25 V33 M15 29 H23" strokeWidth="1.2" />
            <circle cx="19" cy="45" r="2" fill={color} />
          </g>

          {/* 2. Shopping Cart Doodle (Right-Center) */}
          <g transform="translate(680, 30) rotate(5)">
            <path d="M2 4 H10 L16 38 H46 L51 14 H13" />
            <circle cx="21" cy="45" r="3.5" />
            <circle cx="41" cy="45" r="3.5" />
            <path d="M22 21 H38 M25 28 H35" strokeDasharray="2 2" strokeWidth="1.2" />
          </g>

          {/* 3. Price Tag with % (Mid-Right) */}
          <g transform="translate(820, 20) rotate(-12)">
            <path d="M5 24 L22 7 L40 7 L40 25 L23 42 L5 24 Z" />
            <circle cx="33" cy="14" r="2.5" fill={color} />
            <path d="M16 28 L28 16" strokeWidth="1.2" />
            <circle cx="19" cy="20" r="1.5" fill={color} />
            <circle cx="25" cy="24" r="1.5" fill={color} />
          </g>

          {/* 4. Delivery Van / Truck (Far Right) */}
          <g transform="translate(970, 45) rotate(2)">
            <rect x="0" y="8" width="46" height="28" rx="3" />
            <path d="M46 16 H58 L68 25 V36 H46 V16 Z" />
            <circle cx="16" cy="38" r="4.5" />
            <circle cx="56" cy="38" r="4.5" />
            <line x1="49" y1="21" x2="63" y2="21" />
            {/* Speed lines */}
            <path d="M-8 16 H-3 M-12 22 H-5 M-9 28 H-2" strokeWidth="1.2" />
          </g>

          {/* 5. Gift Box with Bow (Far Left Background) */}
          <g transform="translate(320, 110) rotate(8)">
            <rect x="0" y="12" width="34" height="30" rx="3" />
            <rect x="-3" y="6" width="40" height="8" rx="2" />
            <line x1="17" y1="6" x2="17" y2="42" />
            <path d="M17 6 C13 0 7 2 9 6 C11 9 17 6 17 6 Z" />
            <path d="M17 6 C21 0 27 2 25 6 C23 9 17 6 17 6 Z" />
          </g>

          {/* 6. Cardboard Parcel Box (Center-Right) */}
          <g transform="translate(560, 105) rotate(-5)">
            <polygon points="18,2 36,10 18,18 0,10" />
            <polygon points="0,10 18,18 18,38 0,30" />
            <polygon points="36,10 18,18 18,38 36,30" />
            <line x1="18" y1="18" x2="18" y2="28" strokeWidth="1.8" />
            {/* Tape doodle */}
            <line x1="9" y1="6" x2="27" y2="14" strokeWidth="1.8" />
          </g>

          {/* 7. Smartphone with Shopping Heart (Mid-Far Right) */}
          <g transform="translate(760, 115) rotate(10)">
            <rect x="0" y="0" width="26" height="44" rx="4" />
            <line x1="9" y1="4" x2="17" y2="4" strokeWidth="1.2" />
            <circle cx="13" cy="39" r="1.5" />
            <path d="M13 18 C11 15 7 16 7 19 C7 23 13 26 13 26 C13 26 19 23 19 19 C19 16 15 15 13 18 Z" fill={color} fillOpacity="0.4" />
          </g>

          {/* 8. Credit Card / Mobile Payment Card (Far Right Bottom) */}
          <g transform="translate(910, 125) rotate(-8)">
            <rect x="0" y="0" width="46" height="28" rx="3" />
            <line x1="0" y1="8" x2="46" y2="8" strokeWidth="2.5" />
            <rect x="6" y="16" width="8" height="6" rx="1" strokeWidth="1" />
            <line x1="20" y1="19" x2="38" y2="19" strokeWidth="1.2" />
          </g>

          {/* 9. Storefront Awning / Shop Canopy (Center Top) */}
          <g transform="translate(520, 18)">
            <path d="M0 16 L6 2 H42 L48 16" />
            <path d="M0 16 C4 20 8 20 12 16 C16 20 20 20 24 16 C28 20 32 20 36 16 C40 20 44 20 48 16" />
            <line x1="6" y1="16" x2="6" y2="30" />
            <line x1="42" y1="16" x2="42" y2="30" />
            <rect x="16" y="20" width="16" height="10" rx="1" />
          </g>

          {/* 10. Star / Sparkle Doodles (Scattered) */}
          <g transform="translate(380, 80)">
            <path d="M8 0 L10 6 L16 8 L10 10 L8 16 L6 10 L0 8 L6 6 Z" fill={color} fillOpacity="0.3" stroke="none" />
          </g>
          <g transform="translate(630, 20)">
            <path d="M6 0 L7 4 L11 5 L7 7 L6 11 L4 7 L0 5 L4 4 Z" fill={color} fillOpacity="0.35" stroke="none" />
          </g>
          <g transform="translate(890, 75)">
            <path d="M7 0 L9 5 L14 7 L9 9 L7 14 L5 9 L0 7 L5 5 Z" fill={color} fillOpacity="0.3" stroke="none" />
          </g>
          <g transform="translate(1080, 25)">
            <path d="M6 0 L7 4 L12 6 L7 8 L6 12 L4 8 L0 6 L4 4 Z" fill={color} fillOpacity="0.35" stroke="none" />
          </g>
          <g transform="translate(480, 150)">
            <circle cx="4" cy="4" r="2" fill={color} fillOpacity="0.4" stroke="none" />
          </g>
          <g transform="translate(660, 160)">
            <circle cx="3" cy="3" r="1.5" fill={color} fillOpacity="0.4" stroke="none" />
          </g>

          {/* 11. Barcode & Scanner Stamp (Far Right Top) */}
          <g transform="translate(1060, 95) rotate(6)">
            <rect x="0" y="0" width="36" height="24" rx="2" strokeDasharray="3 2" />
            <line x1="6" y1="6" x2="6" y2="18" strokeWidth="2" />
            <line x1="11" y1="6" x2="11" y2="18" strokeWidth="1" />
            <line x1="15" y1="6" x2="15" y2="18" strokeWidth="3" />
            <line x1="21" y1="6" x2="21" y2="18" strokeWidth="1.5" />
            <line x1="26" y1="6" x2="26" y2="18" strokeWidth="2" />
            <line x1="30" y1="6" x2="30" y2="18" strokeWidth="1" />
          </g>

          {/* 12. Verified Shield / Guarantee Ribbon (Far Left) */}
          <g transform="translate(260, 35) rotate(-5)">
            <path d="M14 2 L26 7 V16 C26 23 14 28 14 28 C14 28 2 23 2 16 V7 L14 2 Z" />
            <path d="M8 14 L12 18 L20 10" strokeWidth="1.5" />
          </g>

          {/* 13. Headphones Doodle (Bottom Mid) */}
          <g transform="translate(400, 160) rotate(-10)">
            <path d="M4 18 C4 9 11 2 20 2 C29 2 36 9 36 18" />
            <rect x="2" y="16" width="6" height="12" rx="3" fill={color} fillOpacity="0.2" />
            <rect x="32" y="16" width="6" height="12" rx="3" fill={color} fillOpacity="0.2" />
          </g>

          {/* 14. Clothes Hanger Doodle (Bottom Right) */}
          <g transform="translate(840, 165) rotate(4)">
            <path d="M17 8 C17 5 19 3 21 4 C23 5 23 7 21 8 L17 12 L2 24 H40 L25 12" />
            <line x1="2" y1="24" x2="40" y2="24" strokeWidth="1.8" />
          </g>
        </g>
      </svg>
    </div>
  );
};
