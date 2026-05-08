import React from 'react';
import { Instagram } from 'lucide-react';
import { useData } from '../DataContext';

export const Footer: React.FC = () => {
  const { data } = useData();
  const CONTACT_INFO = data.contactInfo;
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <img src="/ppp.png" alt="Go Global" className="h-6 w-auto object-contain relative top-[-2px]" />
          <span 
            className="text-white font-light text-2xl"
            style={{ fontFamily: '"Century Gothic", sans-serif' }}
          >
            Go Global
          </span>
        </div>
        
        <div className="text-sm">
          © {new Date().getFullYear()} Go Global Education. Все права защищены.
        </div>

        <div className="flex gap-6">
          <a href={CONTACT_INFO.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-2">
              <Instagram className="w-5 h-5" />
              <span className="text-sm font-medium">Instagram</span>
          </a>
        </div>
      </div>
    </footer>
  );
};