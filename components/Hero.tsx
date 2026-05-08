import React from 'react';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, Plane, BookOpen, Globe2, GraduationCap } from 'lucide-react';
import { useData } from '../DataContext';

export const Hero: React.FC = () => {
  const { data } = useData();
  const heroImage = data?.siteConfig?.heroImage || "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=1920&auto=format&fit=crop";

  // Floating animation variant
  const floatingVariant = (delay: number): Variants => ({
    animate: {
      y: [0, -20, 0],
      rotate: [0, 5, -5, 0],
      transition: {
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
        delay: delay,
      },
    },
  });

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
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

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-900 pt-32 pb-12">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Happy students group"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/95 via-brand-900/60 to-brand-800/30 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900/80 via-transparent to-accent-600/30"></div>
      </div>

      {/* Animated Floating Background Elements (Stickers) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
         <motion.div 
            variants={floatingVariant(0)} 
            animate="animate"
            className="absolute top-1/4 left-10 md:left-20 text-white/20"
         >
             <Globe2 className="w-24 h-24 md:w-32 md:h-32 transform -rotate-12" />
         </motion.div>
         
         <motion.div 
            variants={floatingVariant(2)} 
            animate="animate"
            className="absolute bottom-1/4 right-5 md:right-20 text-accent-400/30"
         >
             <Plane className="w-20 h-20 md:w-40 md:h-40 transform rotate-45" />
         </motion.div>

         <motion.div 
            variants={floatingVariant(1)} 
            animate="animate"
            className="absolute top-1/3 right-1/4 text-brand-300/20"
         >
             <BookOpen className="w-16 h-16 transform -rotate-6" />
         </motion.div>
      </div>

      {/* Content */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-block mb-4 px-4 py-1.5 rounded-full bg-accent-500/90 backdrop-blur-md text-white font-bold uppercase tracking-wider text-xs md:text-sm shadow-lg transform -rotate-2"
        >
            🚀 Твой билет в будущее
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl sm:text-7xl md:text-8xl font-extrabold text-white tracking-tight mb-6 leading-tight drop-shadow-xl"
        >
          Учись. Путешествуй. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-400 to-yellow-300 relative">
            Живи ярко!
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-accent-500" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" className="opacity-80" />
            </svg>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 max-w-2xl mx-auto text-xl md:text-2xl text-brand-100 font-medium leading-relaxed"
        >
          Помогаем поступить в топовые вузы мира. <br className="hidden md:block" />
          США, Европа, Азия — выбирай свой кампус мечты.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row justify-center gap-4 items-center"
        >
          <a
            href="#destinations"
            onClick={(e) => handleScrollTo(e, '#destinations')}
            className="w-full sm:w-auto px-8 py-5 bg-brand-600 hover:bg-brand-500 text-white text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3 group border-b-4 border-brand-800 active:border-b-0 active:translate-y-1 cursor-pointer"
          >
            <GraduationCap className="w-6 h-6" />
            Выбрать ВУЗ
          </a>
          <a
            href="#about"
            onClick={(e) => handleScrollTo(e, '#about')}
            className="w-full sm:w-auto px-8 py-5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white text-lg font-bold rounded-2xl transition-all flex items-center justify-center hover:-translate-y-1 cursor-pointer"
          >
            Как это работает?
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white/50"
      >
        <div className="w-8 h-12 rounded-full border-2 border-white/30 flex justify-center pt-2">
            <div className="w-1 h-2 bg-white rounded-full"></div>
        </div>
      </motion.div>
    </div>
  );
};