import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GMark: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 130 150"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    {/* Top horizontal bar */}
    <rect x="6" y="8" width="100" height="14" fill="currentColor" rx="1" />
    {/* Top-right dot */}
    <circle cx="120" cy="15" r="7" fill="currentColor" />
    {/* Bowl (open ring) */}
    <circle
      cx="55"
      cy="65"
      r="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="14"
    />
    {/* Right descender + bottom hook */}
    <path
      d="M 85 65 V 108 Q 85 128 65 128 H 25"
      fill="none"
      stroke="currentColor"
      strokeWidth="14"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface LoaderProps {
  tagline: string;
  onDone: () => void;
}

export const Loader: React.FC<LoaderProps> = ({ tagline, onDone }) => {
  const [showText, setShowText] = useState(false);
  const [showTagline, setShowTagline] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setShowText(true), 1700);
    const t2 = window.setTimeout(() => setShowTagline(true), 2300);
    const t3 = window.setTimeout(onDone, 3500);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {/* Row: G mark + Go Global text */}
      <motion.div
        layout
        className="flex items-center gap-3 md:gap-5"
        transition={{ layout: { duration: 0.6, ease: 'easeInOut' } }}
      >
        <motion.div
          layout
          className="text-brand-600 select-none"
          initial={{ scale: 0, rotate: -180, opacity: 0 }}
          animate={{
            scale: [0, 1.4, 1.05, 1],
            rotate: [-180, 180, 360, 360],
            opacity: [0, 1, 1, 1],
          }}
          transition={{
            duration: 1.6,
            times: [0, 0.55, 0.8, 1],
            ease: 'easeOut',
          }}
        >
          <GMark className="w-20 h-24 md:w-28 md:h-32" />
        </motion.div>

        <AnimatePresence>
          {showText && (
            <motion.div
              key="brand-text"
              className="text-brand-600 font-extrabold tracking-tight leading-[0.92] select-none"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="text-4xl md:text-6xl">go</div>
              <div className="text-4xl md:text-6xl">global</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tagline below */}
      <AnimatePresence>
        {showTagline && (
          <motion.div
            key="tagline"
            className="mt-6 md:mt-8 text-center px-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <span className="text-base md:text-xl text-slate-700 tracking-wide">
              {tagline}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle progress bar at the bottom */}
      <motion.div
        className="absolute bottom-12 w-40 h-[3px] bg-slate-200 rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <motion.div
          className="h-full bg-brand-600 rounded-full"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  );
};
