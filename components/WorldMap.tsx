import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useData } from '../DataContext';

export const WorldMap: React.FC = () => {
  const { data } = useData();
  const COUNTRIES = data.countries;
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const handleCountryClick = (id: string) => {
    const element = document.getElementById(id); // We'll set IDs on Destination cards
    const destinationsSection = document.getElementById('destinations');
    
    // First scroll to section, then finding the card logic could be handled by Destinations component state
    // For now, we will scroll to destinations section and trigger an event or state if needed
    if (destinationsSection) {
        destinationsSection.scrollIntoView({ behavior: 'smooth' });
        // Emit a custom event to open the card (optional refinement)
        window.dispatchEvent(new CustomEvent('openCountry', { detail: id }));
    }
  };

  return (
    <section className="py-20 bg-slate-900 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
        <h2 className="text-3xl font-extrabold text-white mb-4">Наша география</h2>
        <p className="text-slate-400">Наведите на страну, чтобы узнать больше, и кликните для перехода.</p>
      </div>

      <div className="relative w-full max-w-5xl mx-auto aspect-[1.8/1] bg-slate-800/50 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden group">
        {/* Abstract World Map Background (SVG) */}
        <svg
          viewBox="0 0 1000 500"
          className="w-full h-full opacity-40 absolute inset-0 pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
           <path fill="currentColor" className="text-slate-500" d="M165,116 C169,125 170,135 160,140 C140,150 120,130 110,120 C100,110 90,130 80,140 C60,160 80,180 100,190 C120,200 130,220 120,240 C110,260 90,280 110,300 C130,320 150,310 160,290 C170,270 180,250 200,260 C220,270 230,290 220,310 L220,350 C220,370 240,380 260,370 C280,360 270,340 260,320 C250,300 240,280 260,260 C280,240 300,250 320,260 C340,270 360,280 380,270 C400,260 420,250 440,260 C460,270 470,290 460,310 C450,330 460,350 480,360 C500,370 520,360 540,350 C560,340 580,330 600,340 C620,350 640,360 660,350 C680,340 700,330 720,320 C740,310 760,300 780,290 C800,280 820,270 840,260 C860,250 880,240 900,230 C920,220 940,210 960,200 C980,190 990,170 980,150 C970,130 950,120 930,130 C910,140 890,150 870,140 C850,130 830,120 810,130 C790,140 770,150 750,140 C730,130 710,120 690,130 C670,140 650,150 630,140 C610,130 590,120 570,130 C550,140 530,150 510,140 C490,130 470,120 450,130 C430,140 410,150 390,140 C370,130 350,120 330,130 C310,140 290,150 270,140 C250,130 230,120 210,130 C190,140 170,150 165,116 Z" />
           {/* Simple approximate shapes for aesthetics - keeping it abstract */}
        </svg>

        {/* Pins */}
        {COUNTRIES.map((country) => (
          <div
            key={country.id}
            className="absolute"
            style={{ top: country.coordinates.top, left: country.coordinates.left }}
            onMouseEnter={() => setHoveredCountry(country.id)}
            onMouseLeave={() => setHoveredCountry(null)}
            onClick={() => handleCountryClick(country.id)}
          >
            <div className="relative flex items-center justify-center w-8 h-8 cursor-pointer group-hover:scale-105 transition-transform">
              <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-500 border-2 border-white shadow-lg"></span>
            </div>

            <AnimatePresence>
              {hoveredCountry === country.id && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  className="absolute bottom-10 left-1/2 -translate-x-1/2 w-64 bg-white rounded-xl shadow-2xl p-4 z-20 pointer-events-none"
                >
                  <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45"></div>
                  <div className="flex items-center gap-2 mb-2">
                     <img src={country.image} alt={country.name} className="w-8 h-8 rounded-full object-cover" />
                     <h3 className="font-bold text-slate-900">{country.name}</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-2 line-clamp-2">{country.description}</p>
                  <div className="flex flex-wrap gap-1">
                      {country.universities.slice(0, 2).map((u, i) => (
                          <span key={i} className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{u.name}</span>
                      ))}
                  </div>
                  <div className="mt-2 text-center text-xs font-bold text-brand-600">Кликните, чтобы узнать больше</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
};