import React from 'react';

interface BurkinaFlagProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BurkinaFlag: React.FC<BurkinaFlagProps> = ({
  className = '',
  size = 'sm'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-3 rounded-[2px]',
    md: 'w-5 h-3.5 rounded-[3px]',
    lg: 'w-7 h-5 rounded-[4px]'
  };

  return (
    <svg
      viewBox="0 0 45 30"
      className={`inline-block shrink-0 overflow-hidden shadow-xs border border-black/10 align-middle ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Drapeau du Burkina Faso"
    >
      {/* Moitié supérieure Rouge */}
      <rect width="45" height="15" fill="#DC2626" />
      {/* Moitié inférieure Verte */}
      <rect y="15" width="45" height="15" fill="#16A34A" />
      {/* Étoile dorée 5 branches parfaitement centrée */}
      <polygon
        points="22.5,9.2 24.3,14.5 29.8,14.5 25.4,17.7 27.1,23.0 22.5,19.8 17.9,23.0 19.6,17.7 15.2,14.5 20.7,14.5"
        fill="#FACC15"
      />
    </svg>
  );
};
