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
import AdminPanel from './AdminPanel';
import { useData } from './DataContext';

function MainSite() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleOpenModal = () => setIsModalOpen(true);

  return (
    <>
      <Navbar onOpenModal={handleOpenModal} />
      <main className="relative z-10">
        <Hero />
        <About onOpenModal={handleOpenModal} />
        <Destinations onOpenModal={handleOpenModal} />
        <CostCalculator />
        <Testimonials />
        <FAQ />
        <ContactForm />
      </main>
      <Footer />
      <WhatsAppBtn />
      <ContactModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

function App() {
  const { data } = useData();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const [showLoader, setShowLoader] = useState(!isAdminRoute);

  useEffect(() => {
    if (isAdminRoute) setShowLoader(false);
  }, [isAdminRoute]);

  const tagline =
    data.siteConfig?.loaderTagline?.trim() || 'Образование за рубежом';

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-brand-500 selection:text-white">
      {/* Global noise texture for paper-like feel */}
      <div className="fixed inset-0 opacity-[0.4] pointer-events-none z-0 mix-blend-multiply" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
      }}></div>

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
      </Routes>
    </div>
  );
}

export default App;
