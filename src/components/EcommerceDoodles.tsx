import React from 'react';

interface EcommerceDoodlesProps {
  className?: string;
  color?: string;
  opacity?: number;
  weight?: 'normal' | 'bold';
  mask?: boolean;
}

/**
 * Authentic WhatsApp & Telegram chat doodle wallpaper.
 * Specially calibrated with high contrast and zero visual interference:
 * - Doodles stay distinct and weighted without clashing with form text or buttons
 * - Radial vignette mask keeps the center form content ultra-clean
 * - In light mode: soft contrast-adjusted ink outlines
 * - In dark mode: crisp luminous slate-teal outlines
 */
export const EcommerceDoodles: React.FC<EcommerceDoodlesProps> = ({
  className = '',
  opacity,
  weight = 'bold',
  mask = true,
}) => {
  return (
    <div 
      className={`pointer-events-none select-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Light Mode Layer: Clean soft ink outlines with contrast isolation */}
      <div 
        className="absolute inset-0 bg-repeat bg-center dark:hidden transition-opacity duration-300"
        style={{
          backgroundImage: "url('/images/whatsapp_doodle.jpg')",
          backgroundSize: '320px auto',
          filter: 'invert(1) hue-rotate(185deg) contrast(1.15) brightness(0.95)',
          opacity: opacity ?? (weight === 'bold' ? 0.08 : 0.06),
          mixBlendMode: 'multiply',
          maskImage: mask 
            ? 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.65) 100%)' 
            : undefined,
          WebkitMaskImage: mask 
            ? 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.65) 100%)' 
            : undefined,
        }}
      />

      {/* Dark Mode Layer: Luminous teal/slate doodle outlines with contrast isolation */}
      <div 
        className="absolute inset-0 bg-repeat bg-center hidden dark:block transition-opacity duration-300"
        style={{
          backgroundImage: "url('/images/whatsapp_doodle.jpg')",
          backgroundSize: '320px auto',
          filter: 'contrast(1.2) brightness(1.1)',
          opacity: opacity ?? (weight === 'bold' ? 0.20 : 0.15),
          mixBlendMode: 'screen',
          maskImage: mask 
            ? 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.8) 100%)' 
            : undefined,
          WebkitMaskImage: mask 
            ? 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.8) 100%)' 
            : undefined,
        }}
      />
    </div>
  );
};

export default EcommerceDoodles;
