import React from 'react';

interface AbuLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textColor?: string;
}

export const AbuLogo: React.FC<AbuLogoProps> = ({
  className = '',
  size = 52,
  showText = false,
  textColor = 'text-white',
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <img
        src="/screen.png"
        alt="Abu Marketplace"
        width={size}
        height={size}
        className="shrink-0 object-contain transition-transform duration-300 hover:scale-105 select-none"
      />

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
