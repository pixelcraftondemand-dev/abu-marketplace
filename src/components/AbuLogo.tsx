import React, { useId } from 'react';

interface AbuLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export const AbuLogo: React.FC<AbuLogoProps> = ({
  className = '',
  size = 44,
  showText = false,
  textColor = 'text-white',
}) => {
  const uniqueId = useId().replace(/:/g, '');

  const glowFilterId = `outerGlow_${uniqueId}`;
  const discGradientId = `discGrad_${uniqueId}`;
  const greenLeftGradId = `greenLeftGrad_${uniqueId}`;
  const greenRightGradId = `greenRightGrad_${uniqueId}`;
  const amberLeafGradId = `amberLeafGrad_${uniqueId}`;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Official Abu Logo - Exact Match to User Provided Brand Mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        shapeRendering="geometricPrecision"
        className="shrink-0 transition-transform duration-300 hover:scale-105 select-none"
        aria-label="Abu Official Brand Logo"
      >
        <defs>
          {/* Subtle Outer Green Neon Glow Filter */}
          <filter id={glowFilterId} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="6.5" floodColor="#00E676" floodOpacity="0.45" />
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#10B981" floodOpacity="0.6" />
          </filter>

          {/* Dark Charcoal Disc Gradient */}
          <radialGradient id={discGradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#121815" />
            <stop offset="65%" stopColor="#0B100E" />
            <stop offset="100%" stopColor="#070B09" />
          </radialGradient>

          {/* Left Green Ribbon Gradient */}
          <linearGradient id={greenLeftGradId} x1="30%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#00D26A" />
            <stop offset="60%" stopColor="#00B050" />
            <stop offset="100%" stopColor="#00883E" />
          </linearGradient>

          {/* Right Green Lobe Gradient */}
          <linearGradient id={greenRightGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00E676" />
            <stop offset="60%" stopColor="#00C853" />
            <stop offset="100%" stopColor="#00A844" />
          </linearGradient>

          {/* Center Amber / Golden Leaf Gradient */}
          <linearGradient id={amberLeafGradId} x1="15%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#FFC820" />
            <stop offset="35%" stopColor="#F5A623" />
            <stop offset="75%" stopColor="#EA820B" />
            <stop offset="100%" stopColor="#D96800" />
          </linearGradient>
        </defs>

        {/* 1. Main Dark Circular Disc with Soft Emerald Halo */}
        <circle
          cx="100"
          cy="100"
          r="84"
          fill={`url(#${discGradientId})`}
          filter={`url(#${glowFilterId})`}
        />

        {/* 2. Emblem Assembly (Centered at 100, 100) */}
        <g id="abu-emblem-core">
          {/* A. Right Green Wing / Lobe (Upper-Right behind Amber Leaf) */}
          <path
            d="M 103 76
               C 107 72 115 71.5 120 76.5
               C 125 82 125 91 122 97
               C 119 103 114 107 109 106
               C 105 105 103 98 103 90
               Z"
            fill={`url(#${greenRightGradId})`}
          />

          {/* B. Left Green Stem & Under-Arch (Forms Left Leg & Arch of the "A") */}
          <path
            d="M 101 76.5
               C 93 77.5 86 86 85 98
               C 84 108 85.5 116 88 122
               C 88.5 121 91 114 94 109.5
               C 98 104 103 103 107 104
               C 103 94 101 84 101 76.5
               Z"
            fill={`url(#${greenLeftGradId})`}
          />

          {/* C. Central Amber / Mango Leaf (Forms Top Apex & Sweeps Down-Right to Pointed Tail) */}
          <path
            d="M 101.5 76
               C 93 83.5 91 94.5 96.5 102
               C 101 108 107 113.5 113.5 118
               C 117.5 120.8 120 122 120 122
               C 121 118 121.5 111 120 102
               C 118 92 113 83 107 78
               C 104.5 76 102.5 75.8 101.5 76
               Z"
            fill={`url(#${amberLeafGradId})`}
          />

          {/* D. Translucent Turquoise Crossbar Lens (The Horizontal Overlap Ellipse) */}
          <ellipse
            cx="104.5"
            cy="104.5"
            rx="9.5"
            ry="4.2"
            transform="rotate(-6 104.5 104.5)"
            fill="#00E599"
            fillOpacity="0.82"
          />

          {/* E. Top Golden Yellow Circle Dot */}
          <circle
            cx="103"
            cy="72.8"
            r="3.2"
            fill="#FFBE0B"
          />
        </g>
      </svg>

      {showText && (
        <div className="flex flex-col text-left leading-none">
          <span className={`font-extrabold tracking-tight text-lg sm:text-xl ${textColor}`}>
            Abu
          </span>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#00E676] mt-0.5">
            Sierra Leone
          </span>
        </div>
      )}
    </div>
  );
};
