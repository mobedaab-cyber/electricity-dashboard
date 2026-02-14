import React, { useState, useEffect, useMemo } from 'react';
import { RawPriceEntry, HourlyPrice, DailyStats, ChargingWindow } from './types';
import { normalizeToHourly, getDailyStats, findSmartChargingWindow, formatPrice } from './utils/priceUtils';
import { getPriceColor } from './utils/colorUtils';
import { PriceTrendIcon, PlugIcon } from './components/Icons';

const API_BASE = "https://www.elprisetjustnu.se/api/v1/prices";
const AREA = "SE3"; 

const fetchPricesForDate = async (date: Date): Promise<RawPriceEntry[]> => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  try {
    const response = await fetch(`${API_BASE}/${y}/${m}-${d}_${AREA}.json`);
    if (!response.ok) throw new Error("Fetch failed");
    return await response.json();
  } catch (err) {
    console.error(`Fetch failed for ${y}-${m}-${d}`);
    return [];
  }
};

const App: React.FC = () => {
  const [dataToday, setDataToday] = useState<RawPriceEntry[]>([]);
  const [dataTomorrow, setDataTomorrow] = useState<RawPriceEntry[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const pricesToday = await fetchPricesForDate(today);
    setDataToday(pricesToday);

    if (today.getHours() >= 13) {
      const pricesTomorrow = await fetchPricesForDate(tomorrow);
      setDataTomorrow(pricesTomorrow);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    const dataRefresher = setInterval(fetchData, 30 * 60000); 
    return () => {
      clearInterval(clock);
      clearInterval(dataRefresher);
    };
  }, []);

  const hourlyToday = useMemo(() => normalizeToHourly(dataToday), [dataToday]);
  const hourlyTomorrow = useMemo(() => normalizeToHourly(dataTomorrow), [dataTomorrow]);
  
  const statsToday = useMemo(() => 
    hourlyToday.length > 0 ? getDailyStats(hourlyToday) : null, 
    [hourlyToday]
  );

  const statsTomorrow = useMemo(() => 
    hourlyTomorrow.length > 0 ? getDailyStats(hourlyTomorrow) : null,
    [hourlyTomorrow]
  );

  const currentHour = currentTime.getHours();
  const currentPriceObj = hourlyToday[currentHour] || { avgPrice: 0, label: '--:--' };
  
  const nextPriceObj = useMemo(() => {
    const nextHour = currentHour + 1;
    if (nextHour < 24) {
      return hourlyToday[nextHour] || currentPriceObj;
    } else if (hourlyTomorrow.length > 0) {
      return hourlyTomorrow[0];
    }
    return currentPriceObj;
  }, [currentHour, hourlyToday, hourlyTomorrow, currentPriceObj]);

  const smartCharge = useMemo(() => {
    if (hourlyToday.length === 0) return null;
    return findSmartChargingWindow(hourlyToday, hourlyTomorrow, currentHour);
  }, [hourlyToday, hourlyTomorrow, currentHour]);

  if (loading && hourlyToday.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050505] text-zinc-500">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-zinc-900 border-t-zinc-400 animate-spin mb-6 rounded-full" />
          <p className="text-sm font-black uppercase tracking-[0.4em]">Hämtar Prisdata...</p>
        </div>
      </div>
    );
  }

  const activePriceColor = statsToday ? getPriceColor(currentPriceObj.avgPrice, statsToday.min.avgPrice, statsToday.max.avgPrice) : '#fff';
  const nextPriceColor = statsToday ? getPriceColor(nextPriceObj.avgPrice, statsToday.min.avgPrice, statsToday.max.avgPrice) : '#fff';

  const pricePosition = statsToday 
    ? ((currentPriceObj.avgPrice - statsToday.min.avgPrice) / (statsToday.max.avgPrice - statsToday.min.avgPrice)) * 100 
    : 0;

  const showTomorrowComparison = dataTomorrow.length > 0 && currentHour >= 14;
  const tomorrowAvgColor = (statsTomorrow && statsToday) 
    ? getPriceColor(statsTomorrow.avg, statsToday.min.avgPrice, statsToday.max.avgPrice) 
    : '#fff';
  
  const avgDiffPercent = (statsToday && statsTomorrow) 
    ? ((statsTomorrow.avg - statsToday.avg) / statsToday.avg) * 100 
    : 0;

  return (
    <div className="h-screen w-screen bg-[#050505] text-white p-6 md:p-8 lg:p-10 flex flex-col justify-between overflow-hidden relative">
      <div 
        className="absolute -top-[10%] -left-[5%] w-[60%] h-[60%] pointer-events-none opacity-[0.12] blur-[120px] rounded-full transition-colors duration-[3000ms]"
        style={{ backgroundColor: activePriceColor }}
      />

      <div className="flex justify-between items-start z-10">
        <div className="flex flex-col">
          <h2 className="text-zinc-500 text-xs font-black uppercase tracking-[0.3em] mb-1">Elområde {AREA}</h2>
          <span className="text-zinc-300 text-2xl font-semibold capitalize tracking-tight">
            {currentTime.toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="text-right">
            <div className="text-5xl font-black tracking-tighter text-zinc-100">
                {currentTime.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            {dataTomorrow.length > 0 ? (
                <div className="text-xs font-black text-emerald-500 uppercase tracking-widest mt-1 px-3 py-1 bg-emerald-500/10 rounded-full inline-block border border-emerald-500/20">Morgondagen redo</div>
            ) : (
                currentTime.getHours() >= 13 && <div className="text-xs font-black text-amber-500/50 uppercase tracking-widest mt-1">Väntar på morgondagen...</div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-center z-10 flex-grow">
        <div className="lg:col-span-3 flex flex-col justify-center relative">
          <div className="flex items-center space-x-4 mb-2">
            <span className="bg-white text-black text-xs font-black px-4 py-1.5 rounded-lg uppercase tracking-widest">Just Nu</span>
            <span className="text-zinc-400 text-2xl font-bold tracking-tight">{currentPriceObj.label}</span>
          </div>
          
          <div className="flex items-baseline -ml-4 relative">
            <h1 
              className="text-[14rem] md:text-[18rem] font-[1000] leading-[0.8] tracking-[-0.08em] transition-all duration-1000 animate-price-glow"
              style={{ 
                color: activePriceColor,
                // @ts-ignore
                '--glow-color': activePriceColor
              }}
            >
              {formatPrice(currentPriceObj.avgPrice)}
            </h1>
            <div className="flex flex-col ml-4">
                <span className="text-6xl font-black text-zinc-600 tracking-tighter">kr</span>
                <span className="text-2xl font-bold text-zinc-800 mt-[-4px]">per kWh</span>
            </div>
          </div>

          <div className="mt-6 w-full max-w-2xl pr-12">
            <div className="flex justify-between items-end mb-2 px-1">
              <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Billigast</span>
              <span className="text-xs font-black text-rose-500 uppercase tracking-widest">Dyrast</span>
            </div>
            <div className="h-2 w-full bg-zinc-900 rounded-full relative overflow-visible border border-white/5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-rose-600 opacity-20" />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-[2px] border-[#050505] shadow-[0_0_15px_rgba(0,0,0,0.8)] transition-all duration-1000 ease-in-out z-20 flex items-center justify-center"
                style={{ 
                  left: `${pricePosition}%`, 
                  transform: `translate(-50%, -50%)`,
                  backgroundColor: activePriceColor,
                  boxShadow: `0 0 20px ${activePriceColor}44`
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-12 mt-8">
             <div className="flex flex-col">
                <span className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Nästa timme</span>
                <div className="flex items-center space-x-6 px-8 py-4 bg-zinc-900/40 rounded-[2rem] border border-zinc-800/40">
                  <PriceTrendIcon 
                    className="w-10 h-10 opacity-90" 
                    color={nextPriceColor} 
                    currentPrice={currentPriceObj.avgPrice}
                    nextPrice={nextPriceObj.avgPrice}
                  />
                  <span 
                    className="text-7xl font-black tracking-tighter transition-colors duration-1000"
                    style={{ color: nextPriceColor }}
                  >
                    {formatPrice(nextPriceObj.avgPrice)}
                  </span>
                </div>
             </div>

             {showTomorrowComparison && statsTomorrow && (
                <div className="flex flex-col">
                  <span className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-2">Snitt imorgon</span>
                  <div className="flex items-center space-x-6 px-8 py-4 bg-zinc-900/40 rounded-[2rem] border border-zinc-800/40">
                    <div className="flex flex-col">
                      <span 
                        className="text-7xl font-black tracking-tighter transition-colors duration-1000"
                        style={{ color: tomorrowAvgColor }}
                      >
                        {formatPrice(statsTomorrow.avg)}
                      </span>
                      <span className={`text-xs font-black uppercase tracking-widest mt-[-4px] ${avgDiffPercent > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {avgDiffPercent > 0 ? '↑' : '↓'} {Math.abs(avgDiffPercent).toFixed(0)}% mot idag
                      </span>
                    </div>
                  </div>
                </div>
             )}
          </div>
        </div>

        {statsToday && (
          <div className="lg:col-span-2 flex flex-col space-y-12 lg:pl-8">
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm font-black uppercase tracking-[0.2em]">Lägsta pris idag</span>
              </div>
              <div className="flex items-baseline space-x-4">
                <div 
                  className="text-[7rem] font-[1000] tracking-tighter leading-none"
                  style={{ color: getPriceColor(statsToday.min.avgPrice, statsToday.min.avgPrice, statsToday.max.avgPrice) }}
                >
                  {formatPrice(statsToday.min.avgPrice)}
                </div>
                <span className="text-zinc-500 font-black text-3xl">{statsToday.min.label.split('–')[0]}</span>
              </div>
            </div>

            <div className="h-px bg-zinc-900/60 w-full" />

            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm font-black uppercase tracking-[0.2em]">Högsta pris idag</span>
              </div>
              <div className="flex items-baseline space-x-4">
                <div 
                  className="text-[7rem] font-[1000] tracking-tighter leading-none"
                  style={{ color: getPriceColor(statsToday.max.avgPrice, statsToday.min.avgPrice, statsToday.max.avgPrice) }}
                >
                  {formatPrice(statsToday.max.avgPrice)}
                </div>
                <span className="text-zinc-500 font-black text-3xl">{statsToday.max.label.split('–')[0]}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {smartCharge && (
        <div className="mt-4 bg-[#0a0a0a] border border-zinc-800 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between z-10 shadow-2xl overflow-hidden">
          <div className="flex items-center space-x-10">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
              <div className="relative bg-green-500/5 p-6 rounded-[1.5rem] border border-green-500/20">
                <PlugIcon className="w-12 h-12 text-green-500" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-4 mb-1">
                <span className="text-zinc-400 text-xs font-black uppercase tracking-[0.2em]">Smart Laddning</span>
                <div className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center border ${
                  smartCharge.isTomorrow 
                  ? "bg-blue-600/10 text-blue-400 border-blue-500/20" 
                  : "bg-green-600/10 text-green-400 border-green-500/20"
                }`}>
                  {smartCharge.isTomorrow ? "Imorgon" : "Idag"}
                </div>
              </div>
              <div className="text-6xl font-[1000] text-white tracking-tighter leading-none">
                {smartCharge.startHour.toString().padStart(2, '0')}:00 – {smartCharge.endHour.toString().padStart(2, '0')}:00
              </div>
            </div>
          </div>
          
          <div className="mt-6 md:mt-0 text-right px-10 py-5 bg-zinc-900/30 rounded-[2.5rem] border border-zinc-800/40 flex flex-col items-end">
            <span className="text-zinc-500 text-xs font-black uppercase tracking-widest block mb-1">Genomsnitt</span>
            <div className="text-5xl font-black text-green-400 tracking-tighter flex items-baseline">
              {formatPrice(smartCharge.avgPrice)} <span className="text-2xl font-bold text-zinc-700 ml-2">kr/kWh</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;