import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Destinations } from './components/Destinations';
import { CostCalculator } from './components/CostCalculator';
import { Testimonials } from './components/Testimonials';
import { FAQ } from './components/FAQ';
import { ContactForm } from './components/ContactForm';
import { Footer } from './components/Footer';
import { WhatsAppBtn } from './components/WhatsAppBtn';
import { ContactModal } from './components/ContactModal';
import { Loader } from './components/Loader';
import { ApplyForm } from './components/ApplyForm';
import AdminPanel from './AdminPanel';
import LidyApp from './lidy/LidyApp';
import { useData } from './DataContext';

function MainSite() {
  const { data } = useData();
  const v = data.siteConfig?.visibility ?? {
    hero: true, about: true, destinations: true,
    calculator: true, testimonials: true, faq: true, contact: true,
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleOpenModal = () => setIsModalOpen(true);
  const [showApplyFab, setShowApplyFab] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowApplyFab(window.scrollY > 500);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {/* Paper-noise texture is only on the public marketing site, not in admin/lidy */}
      <div className="fixed inset-0 opacity-[0.4] pointer-events-none z-0 mix-blend-multiply" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }}></div>
      <Navbar onOpenModal={handleOpenModal} />
      <main className="relative z-10">
        {v.hero && <Hero />}
        {v.about && <About onOpenModal={handleOpenModal} />}
        {v.destinations && <Destinations onOpenModal={handleOpenModal} />}
        {v.calculator && <CostCalculator />}
        {v.testimonials && <Testimonials />}
        {v.faq && <FAQ />}
        {v.contact && <ContactForm />}
      </main>
      <Footer />
      <WhatsAppBtn />
      <button
        onClick={handleOpenModal}
        className={`fixed bottom-5 left-5 z-[90] flex items-center gap-2 px-5 py-3 rounded-full bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-xl transition-all duration-300 ${showApplyFab ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
      >
        ✍️ Оставить заявку
      </button>
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

function App() {
  const { data } = useData();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isLidyRoute = location.pathname.startsWith('/lidy');
  const isApplyRoute = location.pathname.startsWith('/apply');
  const isUtilityRoute = isAdminRoute || isLidyRoute || isApplyRoute;
  const [showLoader, setShowLoader] = useState(!isUtilityRoute);

  useEffect(() => {
    if (isUtilityRoute) setShowLoader(false);
  }, [isUtilityRoute]);

  // Visit tracking — fire-and-forget on initial load and on every route change
  useEffect(() => {
    if (isUtilityRoute) return;
    const path = location.pathname + (location.hash || '');
    fetch('/api/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, ref: document.referrer || '' }),
      keepalive: true,
    }).catch(() => {});
  }, [location.pathname, location.hash, isUtilityRoute]);

  const tagline =
    data.siteConfig?.loaderTagline?.trim() || 'Образование за рубежом';

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-500 selection:text-white">
      <AnimatePresence>
        {showLoader && (
          <Loader
            key="loader"
            tagline={tagline}
            onDone={() => setShowLoader(false)}
          />
        )}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<MainSite />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/lidy" element={<LidyApp />} />
        <Route path="/lidy/*" element={<LidyApp />} />
        <Route path="/apply" element={<ApplyForm />} />
      </Routes>
    </div>
  );
}

export default App;
