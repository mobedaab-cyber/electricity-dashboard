/**
 * Maps price to HSL based on position between daily extremes.
 * 140 = green (cheap), 0 = red (expensive).
 */
export const getPriceColor = (price: number, min: number, max: number): string => {
  if (max <= min) return 'hsl(140, 80%, 50%)';
  
  let normalized = (price - min) / (max - min);
  normalized = Math.max(0, Math.min(1, normalized));

  const biased = normalized < 0.5 
    ? 0.5 * Math.pow(2 * normalized, 1.5) 
    : 1 - 0.5 * Math.pow(2 * (1 - normalized), 1.5);

  const hue = 140 * (1 - biased);
  const saturation = 75 + (Math.abs(normalized - 0.5) * 25);
  const lightness = 50; 
  
  return `hsl(${hue}, ${Math.min(100, saturation)}%, ${lightness}%)`;
};