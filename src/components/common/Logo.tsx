import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  variant = 'light',
  className = ''
}) => {
  const sizeMap = {
    sm: { icon: 28, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 38, text: 'text-xl', sub: 'text-[10px]' },
    lg: { icon: 60, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 84, text: 'text-3xl', sub: 'text-sm' }
  };

  const { icon, text, sub } = sizeMap[size];

  return (
    <div className={`flex items-center space-x-2.5 ${className}`}>
      {/* Icône SVG vectorielle */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-md transition-transform hover:scale-105"
      >
        <defs>
          <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#022c22" />
          </linearGradient>
          <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        <rect width="64" height="64" rx="16" fill="url(#logoBg)" />

        {/* Reliure */}
        <rect x="8" y="10" width="8" height="44" rx="3" fill="#047857" />
        <circle cx="12" cy="18" r="2" fill="url(#logoGold)" />
        <circle cx="12" cy="32" r="2" fill="url(#logoGold)" />
        <circle cx="12" cy="46" r="2" fill="url(#logoGold)" />

        {/* Page */}
        <rect x="18" y="10" width="38" height="44" rx="4" fill="#ffffff" />
        <line x1="24" y1="20" x2="50" y2="20" stroke="#e5e7eb" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="28" x2="42" y2="28" stroke="#e5e7eb" strokeWidth="2.5" strokeLinecap="round" />

        {/* Coche dorée */}
        <circle cx="38" cy="38" r="12" fill="url(#logoGold)" />
        <path d="M33 38l3.5 3.5 7-7" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Étoile rouge Faso */}
        <path d="M48 12l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z" fill="#ef4444" />
      </svg>

      {/* Typographie de marque */}
      {showText && (
        <div className="flex flex-col text-left">
          <div className={`font-black tracking-tight leading-none ${text}`}>
            <span className={variant === 'light' ? 'text-white' : 'text-emerald-950'}>Faso</span>
            <span className="text-amber-400">Carnet</span>
          </div>
          <span className={`font-medium tracking-wide uppercase mt-0.5 ${sub} ${
            variant === 'light' ? 'text-emerald-200/90' : 'text-emerald-700'
          }`}>
            Caisse & Dettes
          </span>
        </div>
      )}
    </div>
  );
};
