import React from 'react';

interface HappyShopperCartProps {
  className?: string;
}

/**
 * A cheerful shopper dancing along while pushing a shopping cart.
 * Pure SVG + the CSS keyframes in index.css (`.shopper-*`), so it stays crisp at
 * any size, costs no JS runtime, and honours prefers-reduced-motion.
 */
export const HappyShopperCart: React.FC<HappyShopperCartProps> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 156 114"
      role="img"
      aria-label="Happy shopper dancing and pushing a shopping cart"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Ground shadow */}
      <ellipse cx="94" cy="106" rx="60" ry="4" fill="#0F1D26" opacity="0.12" />

      {/* ---------- Shopping cart ---------- */}
      <g className="shopper-cart-roll">
        {/* Groceries poking out of the basket */}
        <rect x="116" y="55" width="16" height="13" rx="2.5" fill="#F5A623" stroke="#122033" strokeWidth="2" />
        <rect x="132" y="59" width="11" height="9" rx="2.5" fill="#8DF7C1" stroke="#122033" strokeWidth="2" />

        {/* Basket */}
        <path
          d="M100 66 H146 L138 90 H108 Z"
          fill="#F3FBF7"
          stroke="#122033"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <path d="M114.5 69 L116 87" stroke="#00875A" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
        <path d="M127.5 69 L127.5 87" stroke="#00875A" strokeWidth="2" strokeLinecap="round" opacity="0.55" />

        {/* Handle */}
        <path d="M100 66 C96 58 92 54 88 50" stroke="#122033" strokeWidth="3" strokeLinecap="round" />
        <path d="M83 48 H91" stroke="#00875A" strokeWidth="5" strokeLinecap="round" />

        {/* Frame down to the wheels */}
        <path d="M110 90 L113 99" stroke="#122033" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M137 90 L140 99" stroke="#122033" strokeWidth="2.5" strokeLinecap="round" />

        {/* Wheels */}
        <circle cx="112.5" cy="101" r="7.5" fill="#FFFFFF" stroke="#122033" strokeWidth="2.5" />
        <g className="shopper-wheel-spin">
          <path d="M112.5 95 V107" stroke="#122033" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M106.5 101 H118.5" stroke="#122033" strokeWidth="1.8" strokeLinecap="round" />
        </g>
        <circle cx="139.5" cy="101" r="7.5" fill="#FFFFFF" stroke="#122033" strokeWidth="2.5" />
        <g className="shopper-wheel-spin">
          <path d="M139.5 95 V107" stroke="#122033" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M133.5 101 H145.5" stroke="#122033" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      </g>

      {/* ---------- Happy shopper ---------- */}
      <g className="shopper-bob">
        {/* Legs (dancing step) */}
        <g className="shopper-leg shopper-leg-back">
          <path d="M47 80 L43 96" stroke="#1F3A5F" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="41" cy="98" rx="6" ry="3" fill="#122033" />
        </g>
        <g className="shopper-leg shopper-leg-front">
          <path d="M57 80 L61 96" stroke="#1F3A5F" strokeWidth="6" strokeLinecap="round" />
          <ellipse cx="63" cy="98" rx="6" ry="3" fill="#122033" />
        </g>

        {/* Torso */}
        <rect x="39" y="50" width="26" height="32" rx="9" fill="#00A86B" stroke="#122033" strokeWidth="2.5" />
        <path d="M52 60 V80" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" opacity="0.45" />

        {/* Head */}
        <circle cx="52" cy="36" r="12.5" fill="#F6C89F" stroke="#122033" strokeWidth="2.5" />
        <path d="M39.5 35 C40 24 64 24 64.5 35 C57.5 29 46.5 29 39.5 35 Z" fill="#122033" />
        <circle cx="57" cy="35" r="1.7" fill="#122033" />
        <path d="M52 41 q4.5 3.5 9 0.4" stroke="#122033" strokeWidth="2" strokeLinecap="round" />

        {/* Arm reaching for the cart handle */}
        <g className="shopper-arm">
          <path d="M64 57 L71 55.5" stroke="#00A86B" strokeWidth="7" strokeLinecap="round" />
          <path d="M68 56 C76 52.5 81 50.5 86 49.2" stroke="#F6C89F" strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>

      {/* Celebration sparkles */}
      <g fill="#F5A623">
        <path className="shopper-twinkle" d="M78 22 l2.2 5 5 2.2 -5 2.2 -2.2 5 -2.2 -5 -5 -2.2 5 -2.2 Z" />
        <path
          className="shopper-twinkle"
          style={{ animationDelay: '0.7s' }}
          d="M28 46 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 Z"
        />
      </g>
    </svg>
  );
};

export default HappyShopperCart;
