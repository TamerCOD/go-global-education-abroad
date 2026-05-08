import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../DataContext';
import { MapPin, X, ChevronRight, GraduationCap, ChevronLeft } from 'lucide-react';

interface DestinationsProps {
    onOpenModal: () => void;
}

// Sub-component for University Card with Carousel
const UniversityCard: React.FC<{ uni: any, delay: number }> = ({ uni, delay }) => {
    // ... rest is same
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % uni.images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + uni.images.length) % uni.images.length);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className="bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-xl transition-all group flex flex-col h-full"
        >
            <div className="h-48 relative bg-slate-100 overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.img 
                        key={currentImageIndex}
                        src={uni.images[currentImageIndex]} 
                        alt={uni.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full object-cover absolute inset-0" 
                    />
                </AnimatePresence>
                
                {/* Carousel Controls */}
                <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={prevImage} className="bg-black/50 text-white p-1 rounded-full hover:bg-black/70 backdrop-blur-sm">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextImage} className="bg-black/50 text-white p-1 rounded-full hover:bg-black/70 backdrop-blur-sm">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Dots */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                    {uni.images.map((_: any, idx: number) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full shadow-sm ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                    ))}
                </div>
            </div>
            
            <div className="p-5 flex-1 flex flex-col">
                <h4 className="font-bold text-lg text-slate-900 mb-2">{uni.name}</h4>
                <p className="text-slate-600 text-sm flex-1">{uni.description}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wide">
                     <GraduationCap className="w-4 h-4" /> {uni.images.length} фото
                </div>
            </div>
        </motion.div>
    );
};

export const Destinations: React.FC<DestinationsProps> = ({ onOpenModal }) => {
  const { data } = useData();
  const COUNTRIES = data.countries;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<'All' | 'Asia' | 'Europe' | 'USA'>('All');

  const filteredCountries = activeRegion === 'All'
    ? COUNTRIES
    : COUNTRIES.filter(c => c.region === activeRegion);

  const selectedCountry = COUNTRIES.find(c => c.id === selectedId);

  const tabs = [
    { id: 'All', label: 'Все направления' },
    { id: 'Asia', label: 'Азия' },
    { id: 'Europe', label: 'Европа' },
    { id: 'USA', label: 'США' },
  ];

  return (
    <section id="destinations" className="py-24 bg-slate-50 relative overflow-hidden">
        {/* Abstract doodle background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-100/50 rounded-full blur-3xl -mr-20 -mt-20"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6">Куда поедем учиться?</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Кликай на страну, чтобы увидеть университеты.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
            {tabs.map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveRegion(tab.id as any)}
                className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-wide transition-all duration-300 border-2 ${
                activeRegion === tab.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xl'
                    : 'bg-white text-slate-500 hover:border-slate-300 border-slate-200'
                }`}
            >
                {tab.label}
            </button>
            ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCountries.map((country) => (
            <motion.div
              layoutId={`card-${country.id}`}
              key={country.id}
              onClick={() => setSelectedId(country.id)}
              className="bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer group relative border border-slate-100"
            >
              <div className="relative h-72 overflow-hidden">
                <motion.img
                  layoutId={`image-${country.id}`}
                  src={country.image}
                  alt={country.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full border border-white/30">
                    <ChevronRight className="text-white w-6 h-6" />
                </div>
                <div className="absolute bottom-6 left-6 text-white">
                    <div className="flex items-center gap-1 text-accent-400 mb-1 text-sm font-bold uppercase tracking-wider">
                        <MapPin className="w-4 h-4" /> {country.region}
                    </div>
                    <motion.h3 layoutId={`title-${country.id}`} className="text-3xl font-extrabold">{country.name}</motion.h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm line-clamp-2 mb-4 font-medium">{country.description}</p>
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                        {country.universities.slice(0,3).map((u, i) => (
                            <img key={i} src={u.images[0]} className="w-8 h-8 rounded-full border-2 border-white object-cover" />
                        ))}
                    </div>
                    <span className="text-xs font-bold text-slate-400 ml-2">Топ вузы внутри</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Expanded View Modal */}
      <AnimatePresence>
        {selectedId && selectedCountry && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            
            <motion.div
              layoutId={`card-${selectedId}`}
              className="w-full max-w-5xl bg-slate-50 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col no-scrollbar"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                className="absolute top-4 right-4 z-20 bg-black/30 hover:bg-black/50 backdrop-blur-md p-2 rounded-full text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative h-64 sm:h-80 flex-shrink-0">
                <motion.img
                  layoutId={`image-${selectedId}`}
                  src={selectedCountry.image}
                  alt={selectedCountry.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                <div className="absolute bottom-8 left-8 text-white">
                  <motion.h2 layoutId={`title-${selectedId}`} className="text-4xl md:text-6xl font-extrabold mb-2">{selectedCountry.name}</motion.h2>
                  <div className="inline-block px-4 py-1.5 bg-accent-500 rounded-full text-sm font-bold text-white shadow-lg uppercase tracking-wide">
                      {selectedCountry.region === 'USA' ? 'Америка' : selectedCountry.region === 'Asia' ? 'Азия' : 'Европа'}
                  </div>
                </div>
              </div>

              <div className="overflow-y-auto p-6 sm:p-10 bg-slate-50 flex-1">
                <div className="prose prose-lg prose-slate max-w-none mb-12">
                    <p className="text-slate-600 leading-relaxed font-medium">{selectedCountry.fullDescription || selectedCountry.description}</p>
                </div>

                <div className="flex items-center gap-3 mb-8">
                    <div className="bg-brand-600 p-2 rounded-lg">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900">
                        Университеты и кампусы
                    </h3>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    {selectedCountry.universities.map((uni, idx) => (
                        <UniversityCard key={idx} uni={uni} delay={0.2 + (idx * 0.1)} />
                    ))}
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="text-slate-500 text-sm">
                        * Доступны программы бакалавриата и магистратуры
                    </div>
                    <button 
                        onClick={() => {
                            setSelectedId(null);
                            onOpenModal();
                        }}
                        className="bg-brand-600 text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-brand-500/30 hover:bg-brand-700 transition-colors w-full sm:w-auto text-center hover:scale-105 transform duration-200"
                    >
                        Подать документы в {selectedCountry.name}
                    </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};