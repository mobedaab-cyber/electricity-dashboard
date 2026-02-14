import { RawPriceEntry, HourlyPrice, DailyStats, ChargingWindow } from '../types';

/**
 * Normalizes input data. The API returns 24 hourly entries or 96 quarterly entries.
 * Aggregates into 24 clean hourly objects.
 */
export const normalizeToHourly = (data: RawPriceEntry[]): HourlyPrice[] => {
  if (!data || data.length === 0) return [];
  
  if (data.length === 24) {
    return data.map((entry, i) => ({
      hour: i,
      avgPrice: entry.SEK_per_kWh,
      label: `${i.toString().padStart(2, '0')}:00–${(i + 1).toString().padStart(2, '0')}:00`,
      date: entry.time_start.split('T')[0]
    }));
  }

  const hourly: HourlyPrice[] = [];
  const entriesPerHour = data.length / 24;
  for (let i = 0; i < 24; i++) {
    const startIdx = i * entriesPerHour;
    const slice = data.slice(startIdx, startIdx + entriesPerHour);
    if (slice.length === 0) continue;
    const avgPrice = slice.reduce((acc, e) => acc + e.SEK_per_kWh, 0) / slice.length;
    hourly.push({
      hour: i,
      avgPrice,
      label: `${i.toString().padStart(2, '0')}:00–${(i + 1).toString().padStart(2, '0')}:00`,
      date: slice[0].time_start.split('T')[0]
    });
  }
  return hourly;
};

export const getDailyStats = (hourly: HourlyPrice[]): DailyStats => {
  if (hourly.length === 0) return { min: {} as HourlyPrice, max: {} as HourlyPrice, avg: 0 };
  const min = [...hourly].sort((a, b) => a.avgPrice - b.avgPrice)[0];
  const max = [...hourly].sort((a, b) => b.avgPrice - a.avgPrice)[0];
  const avg = hourly.reduce((acc, h) => acc + h.avgPrice, 0) / hourly.length;
  return { min, max, avg };
};

/**
 * Finds the cheapest consecutive 3-hour window in the future.
 */
export const findSmartChargingWindow = (
  todayHourly: HourlyPrice[], 
  tomorrowHourly: HourlyPrice[], 
  currentHour: number,
  windowSize: number = 3
): (ChargingWindow & { isTomorrow: boolean }) | null => {
  
  const futurePrices = [
    ...todayHourly.slice(currentHour).map(h => ({ ...h, isTomorrow: false })),
    ...tomorrowHourly.map(h => ({ ...h, isTomorrow: true }))
  ];

  if (futurePrices.length < windowSize) {
    if (todayHourly.length < windowSize) return null;
    let minT = Infinity;
    let bestIdx = 0;
    for (let i = 0; i <= todayHourly.length - windowSize; i++) {
        const total = todayHourly.slice(i, i + windowSize).reduce((a, b) => a + b.avgPrice, 0);
        if (total < minT) { minT = total; bestIdx = i; }
    }
    return {
        startHour: todayHourly[bestIdx].hour,
        endHour: (todayHourly[bestIdx].hour + windowSize) % 24 || 24,
        avgPrice: minT / windowSize,
        isTomorrow: false
    };
  }

  let minTotal = Infinity;
  let bestWindowStartIdx = 0;

  for (let i = 0; i <= futurePrices.length - windowSize; i++) {
    const currentWindow = futurePrices.slice(i, i + windowSize);
    const total = currentWindow.reduce((acc, h) => acc + h.avgPrice, 0);
    
    if (total < minTotal) {
      minTotal = total;
      bestWindowStartIdx = i;
    }
  }

  const bestWindow = futurePrices.slice(bestWindowStartIdx, bestWindowStartIdx + windowSize);
  
  return {
    startHour: bestWindow[0].hour,
    endHour: (bestWindow[0].hour + windowSize) % 24 || 24,
    avgPrice: minTotal / windowSize,
    isTomorrow: bestWindow[0].isTomorrow
  };
};

export const formatPrice = (price: number): string => {
  return price.toFixed(2);
};