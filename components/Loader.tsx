import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoaderProps {
  tagline: string;
  onDone: () => void;
}

export const Loader: React.FC<LoaderProps> = ({ tagline, onDone }) => {
  useEffect(() => {
    const t = window.setTimeout(onDone, 3000);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <div className="flex items-center gap-4">
        {/* Logo: scales up + rotates, then settles */}
        <motion.img
          src="/ppp.png"
          alt="Go Global"
          className="h-20 md:h-28 w-auto select-none"
          draggable={false}
          initial={{ scale: 0, rotate: -180, opacity: 0, x: 0 }}
          animate={{
            scale: [0, 1.4, 1.1, 1],
            rotate: [-180, 180, 360, 360],
            opacity: [0, 1, 1, 1],
          }}
          transition={{
            duration: 1.7,
            times: [0, 0.55, 0.8, 1],
            ease: 'easeOut',
          }}
        />
      </div>

      {/* Tagline appears under the logo */}
      <motion.div
        className="mt-6 text-center px-4"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.9, duration: 0.55, ease: 'easeOut' }}
      >
        <span className="text-lg md:text-2xl text-slate-700 font-medium tracking-wide">
          {tagline}
        </span>
      </motion.div>

      {/* Subtle progress bar at the bottom */}
      <motion.div
        className="absolute bottom-12 w-40 h-[3px] bg-slate-200 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <motion.div
          className="h-full bg-brand-600 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2.5, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  );
};
