import React, { useState, useMemo } from 'react';
import { useData } from '../DataContext';
import { Calculator, CheckCircle2, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CostCalculator: React.FC = () => {
  const { data } = useData();
  const COUNTRIES = data.countries;
  const cfg = (data.siteConfig as any)?.calculatorConfig || {};
  const title = cfg.title || 'Планируйте бюджет';
  const subtitle = cfg.subtitle || 'Узнайте примерную минимальную стоимость года обучения и проживания.';
  const checklist: string[] = (Array.isArray(cfg.checklistItems) && cfg.checklistItems.length > 0)
    ? cfg.checklistItems
    : ['Включает проживание и питание', 'Включает минимальную стоимость контракта', 'Страховка и учебные материалы'];
  const disclaimer = cfg.disclaimer || '*Не является публичной офертой. Точный расчёт возможен только после консультации.';
  const services = Number(cfg.companyServicesCost ?? 0) || 0;
  const grantLabel = cfg.grantToggleLabel || 'Рассматриваю гранты / Бюджет';
  const grantHint = cfg.grantToggleHint || 'Учитывать возможность бесплатного обучения (только проживание)';

  // Read shareable query params: ?country=japan&scholarship=1 (works under hash router too)
  const readShareParams = () => {
    if (typeof window === 'undefined') return { country: '', isScholarship: false };
    const hash = window.location.hash || '';
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(hashQuery || window.location.search);
    return {
      country: params.get('country') || '',
      isScholarship: params.get('scholarship') === '1' || params.get('scholarship') === 'true',
    };
  };
  const _initShare = readShareParams();
  const [selectedCountry, setSelectedCountry] = useState(() => {
    if (_initShare.country && COUNTRIES.some(c => c.id === _initShare.country)) return _initShare.country;
    return COUNTRIES[0]?.id || '';
  });
  const [isScholarship, setIsScholarship] = useState(_initShare.isScholarship);

  // Listen to hashchange for late-arriving share links
  React.useEffect(() => {
    const onHash = () => {
      const s = readShareParams();
      if (s.country && COUNTRIES.some(c => c.id === s.country)) setSelectedCountry(s.country);
      setIsScholarship(s.isScholarship);
    };
    if (typeof window !== 'undefined') window.addEventListener('hashchange', onHash);
    return () => { if (typeof window !== 'undefined') window.removeEventListener('hashchange', onHash); };
  }, [COUNTRIES]);

  const countryData = COUNTRIES.find(c => c.id === selectedCountry);

  // Pick the cheapest-tuition university; we'll use its servicesCost too (with fallbacks).
  const { minUniTuition, chosenUniName, uniServices } = useMemo(() => {
    if (!countryData) return { minUniTuition: 0, chosenUniName: '', uniServices: null as number | null };
    const unis = (countryData.universities || []) as any[];
    const priced = unis
      .map(u => ({ name: u.name, tuition: typeof u.tuition === 'number' ? u.tuition : null, servicesCost: typeof u.servicesCost === 'number' ? u.servicesCost : null }))
      .filter(u => u.tuition !== null && u.tuition >= 0);
    if (priced.length > 0) {
      const cheapest = priced.reduce((a, b) => (a.tuition! <= b.tuition! ? a : b));
      return { minUniTuition: cheapest.tuition || 0, chosenUniName: cheapest.name, uniServices: cheapest.servicesCost };
    }
    return { minUniTuition: countryData.costs?.tuition?.min ?? 0, chosenUniName: '', uniServices: null };
  }, [countryData]);

  const minLiving = countryData?.costs?.living?.min ?? 0;

  // Services cost cascade: university → country → global
  const servicesCost = useMemo(() => {
    if (typeof uniServices === 'number' && uniServices >= 0) return uniServices;
    if (countryData && typeof (countryData as any).servicesCost === 'number') return (countryData as any).servicesCost;
    return services;
  }, [uniServices, countryData, services]);

  const estimatedCost = useMemo(() => {
    if (!countryData) return 0;
    const tuition = isScholarship ? 0 : minUniTuition;
    return Math.round(tuition + minLiving + servicesCost);
  }, [isScholarship, minUniTuition, minLiving, servicesCost, countryData]);

  // Breakdown line items
  const breakdown = useMemo(() => {
    const rows: { label: string; value: number; note?: string }[] = [];
    rows.push({
      label: isScholarship ? 'Обучение (грант)' : 'Минимальное обучение',
      value: isScholarship ? 0 : minUniTuition,
      note: chosenUniName || undefined,
    });
    rows.push({ label: 'Проживание (мин.)', value: minLiving });
    if (servicesCost > 0) rows.push({ label: 'Услуги GoGlobal', value: servicesCost });
    return rows;
  }, [isScholarship, minUniTuition, minLiving, servicesCost, chosenUniName]);

  return (
    <section id="calculator" className="py-24 bg-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-block p-3 rounded-full bg-accent-100 mb-4">
            <Calculator className="w-8 h-8 text-accent-600" />
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">{title}</h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">{subtitle}</p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-2xl max-w-5xl mx-auto lg:grid lg:grid-cols-5 gap-0 overflow-hidden">
          {/* Left: Controls */}
          <div className="lg:col-span-3 lg:pr-8 space-y-8 pb-8 lg:pb-0">
            <div>
              <label className="block text-sm font-bold text-slate-400 uppercase tracking-wide mb-4">Страна обучения</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {COUNTRIES.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCountry(c.id)}
                    className={`px-4 py-3 rounded-xl text-left transition-all border-2 text-sm font-semibold flex flex-col justify-between h-20 ${selectedCountry === c.id
                      ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-brand-200 text-slate-600'}`}
                  >
                    <span>{c.name}</span>
                    {selectedCountry === c.id && <CheckCircle2 className="w-5 h-5 ml-auto text-brand-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className="flex items-center gap-4 cursor-pointer group">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${isScholarship ? 'bg-brand-600 border-brand-600' : 'bg-white border-slate-300'}`}>
                  {isScholarship && <CheckCircle2 className="w-4 h-4 text-white" />}
                </div>
                <input type="checkbox" className="hidden" checked={isScholarship} onChange={() => setIsScholarship(!isScholarship)} />
                <div>
                  <span className="block font-bold text-slate-900 group-hover:text-brand-600 transition-colors">{grantLabel}</span>
                  <span className="text-xs text-slate-500 block">{grantHint}</span>
                </div>
              </label>
            </div>

            {/* Breakdown */}
            {countryData && (
              <div className="text-sm space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-bold mb-2">Из чего складывается</div>
                {breakdown.map(row => (
                  <div key={row.label} className="flex justify-between items-baseline py-1 border-b border-slate-100">
                    <span className="text-slate-600">
                      {row.label}
                      {row.note && <span className="block text-xs text-slate-400 italic">{row.note}</span>}
                    </span>
                    <span className="font-mono font-semibold text-slate-900">${row.value.toLocaleString()}</span>
                  </div>
                ))}
                {countryData.universities && countryData.universities.length > 0 && (
                  <div className="text-xs text-slate-400 mt-2">
                    Расчёт от самого доступного университета. В стране {countryData.universities.length} вуз(ов).
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Result */}
          <div className="lg:col-span-2 bg-brand-900 text-white rounded-2xl p-8 flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Coins className="w-32 h-32 rotate-12" />
            </div>

            <div className="relative z-10">
              <div className="text-brand-200 font-medium mb-2 uppercase tracking-wide text-sm">Ориентировочно от</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={estimatedCost}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  className="text-6xl font-extrabold mb-2"
                >
                  ${estimatedCost.toLocaleString()}
                </motion.div>
              </AnimatePresence>
              <div className="text-white/60 text-lg mb-8">/ год</div>

              <div className="space-y-3 text-sm text-brand-100 border-t border-white/10 pt-6">
                {checklist.map((item, i) => (
                  <p key={i}>✓ {item}</p>
                ))}
              </div>

              <div className="mt-8 bg-white/10 backdrop-blur rounded-lg p-3 text-xs text-center text-brand-200">
                {disclaimer}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
