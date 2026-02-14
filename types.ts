export interface RawPriceEntry {
  SEK_per_kWh: number;
  time_start: string;
  time_end: string;
}

export interface HourlyPrice {
  hour: number;
  avgPrice: number;
  label: string;
  date: string; // YYYY-MM-DD
}

export interface DailyStats {
  min: HourlyPrice;
  max: HourlyPrice;
  avg: number;
}

export interface ChargingWindow {
  startHour: number;
  endHour: number;
  avgPrice: number;
}