import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onOpenModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenModal }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Robust smooth scrolling handler
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
      e.preventDefault();
      setIsOpen(false); // Close mobile menu if open
      
      const element = document.querySelector(id);
      if (element) {
          const headerOffset = 100;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      
          window.scrollTo({
              top: offsetPosition,
              behavior: "smooth"
          });
      }
  };

  const navLinks = [
    { name: 'О нас', href: '#about' },
    { name: 'Направления', href: '#destinations' },
    { name: 'Отзывы', href: '#testimonials' },
    { name: 'Контакты', href: '#contact' },
  ];

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-20">
            
            {/* Mobile/Tablet: Hamburger (Left) */}
            <div className="flex md:hidden z-20">
                <button
                onClick={() => setIsOpen(!isOpen)}
                className={`${scrolled || isOpen ? 'text-slate-800' : 'text-white'} hover:text-accent-500 transition-colors`}
                >
                {isOpen ? <X className="h-8 w-8" /> : <Menu className="h-8 w-8" />}
                </button>
            </div>

            {/* Desktop: Left Links */}
            <div className="hidden md:flex space-x-8 w-1/3 justify-start z-20">
                {navLinks.slice(0, 2).map((link) => (
                <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleScrollTo(e, link.href)}
                    className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-accent-500 cursor-pointer ${scrolled ? 'text-slate-600' : 'text-slate-200'}`}
                >
                    {link.name}
                </a>
                ))}
            </div>

            {/* Logo Center (Absolute) */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center flex flex-col items-center group cursor-pointer">
                <a 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex items-center gap-2"
                >
                    <img 
                      src="/ppp.png" 
                      alt="Go Global Logo" 
                      className="h-6 w-6 md:h-8 md:w-8 object-contain hover:scale-105 transition-transform duration-300 relative top-[-2px] md:top-[-4px]" 
                    />
                    <span 
                        className={`text-3xl md:text-5xl font-light tracking-tighter transition-colors duration-300 ${scrolled ? 'text-slate-900' : 'text-white'}`}
                        style={{ fontFamily: '"Century Gothic", sans-serif' }}
                    >
                    Go Global
                    </span>
                </a>
            </div>

            {/* Desktop: Right Links */}
            <div className="hidden md:flex space-x-8 w-1/3 justify-end items-center z-20">
                 {navLinks.slice(2, 4).map((link) => (
                <a
                    key={link.name}
                    href={link.href}
                    onClick={(e) => handleScrollTo(e, link.href)}
                    className={`text-sm font-bold uppercase tracking-wider transition-colors hover:text-accent-500 cursor-pointer ${scrolled ? 'text-slate-600' : 'text-slate-200'}`}
                >
                    {link.name}
                </a>
                ))}
                <button
                onClick={onOpenModal}
                className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg hover:shadow-brand-500/50 hover:-translate-y-0.5"
                >
                Заявка
                </button>
            </div>
             
             {/* Mobile: Spacer to balance layout */}
             <div className="flex md:hidden w-8"></div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100vh' }}
            exit={{ opacity: 0, height: 0 }}
            className="fixed inset-0 top-0 left-0 bg-white z-0 flex flex-col justify-center items-center pt-24"
          >
            <div className="flex flex-col space-y-6 text-center">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={(e) => handleScrollTo(e, link.href)}
                  className="text-2xl font-bold text-slate-800 hover:text-brand-600"
                >
                  {link.name}
                </a>
              ))}
              <button
                  onClick={() => {
                      setIsOpen(false);
                      onOpenModal();
                  }}
                  className="bg-brand-600 text-white px-8 py-4 rounded-full text-xl font-bold shadow-xl mx-auto mt-8"
              >
                Оставить заявку
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};