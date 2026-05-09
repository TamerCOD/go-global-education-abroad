import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useData } from '../DataContext';

export const WhatsAppBtn: React.FC = () => {
  const { data } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const phone = (data.contactInfo?.whatsappNumber || '996999530092').replace(/\D/g, '');
  const defaultMsg =
    data.contactInfo?.whatsappMessage ||
    'Добрый день! Пишу с сайта GoGlobal!';

  // Pre-fill the textarea with the configured default each time it opens
  useEffect(() => {
    if (isOpen) setMessage(defaultMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim() || defaultMsg;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    setMessage('');
    setIsOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 bg-white rounded-2xl shadow-2xl p-4 w-72 md:w-80 border border-slate-100"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Напишите нам в WhatsApp</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSend}>
              <textarea
                autoFocus
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={defaultMsg}
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm mb-3 focus:ring-2 focus:ring-[#25D366] focus:border-[#25D366] outline-none resize-none h-24"
              />
              <button
                type="submit"
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Отправить в WhatsApp
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 flex items-center justify-center group ${isOpen ? 'bg-slate-800' : 'bg-[#25D366]'}`}
        aria-label="Contact via WhatsApp"
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8 fill-current" />}

        {!isOpen && (
          <span className="absolute right-full mr-3 bg-white text-slate-800 px-3 py-1 rounded-lg text-sm font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Напишите нам!
          </span>
        )}
      </button>
    </>
  );
};
