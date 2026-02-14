import React from 'react';

export const PriceTrendIcon = ({ 
  className, 
  color, 
  currentPrice, 
  nextPrice 
}: { 
  className?: string, 
  color?: string,
  currentPrice: number,
  nextPrice: number
}) => {
  const diff = nextPrice - currentPrice;
  const threshold = 0.005;
  
  let rotation = "0deg"; 
  if (diff > threshold) {
    rotation = "-45deg"; 
  } else if (diff < -threshold) {
    rotation = "45deg"; 
  }

  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color || "currentColor"} 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      style={{ 
        transform: `rotate(${rotation})`, 
        transformOrigin: 'center',
        transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' 
      }}
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="13 6 19 12 13 18"></polyline>
    </svg>
  );
};

export const PlugIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
    <line x1="12" y1="2" x2="12" y2="12"></line>
  </svg>
);