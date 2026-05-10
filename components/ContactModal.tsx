import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Loader2, CheckCircle, Globe2 } from 'lucide-react';
import { useData } from '../DataContext';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const { data } = useData();
  const COUNTRIES = data.countries;
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    country: '',
    comment: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = { ...formData, timestamp: new Date().toISOString(), source: 'Сайт' };

      // 1) Save to our CRM (assigns to manager + Telegram notification)
      try {
        await fetch('/api/leads/website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch (e) { console.error('CRM intake failed', e); }

      // 2) Also push to existing Google Sheets webhook (legacy/backup)
      try {
        const webhookUrl = 'https://script.google.com/macros/s/AKfycbyE6z9ZrOa2YUL8zUNGrEFcEYRTXLFGcPZewFjQP_wP9a6WlEP1RBtRDqjRz6JYtEhr/exec';
        const formBody = new FormData();
        formBody.append('name', formData.name);
        formBody.append('phone', formData.phone);
        formBody.append('email', formData.email);
        formBody.append('country', formData.country);
        formBody.append('comment', formData.comment);
        formBody.append('timestamp', payload.timestamp);
        await fetch(webhookUrl, { method: 'POST', body: formBody, mode: 'no-cors' });
      } catch (e) { console.error('Sheets webhook failed', e); }
    } catch(e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Reset after success
      setTimeout(() => {
          setIsSuccess(false);
          setFormData({ name: '', phone: '', email: '', country: '', comment: '' });
          onClose();
      }, 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
          >
             {/* Header */}
             <div className="bg-brand-600 px-8 py-6 text-white relative overflow-hidden">
                 <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                 <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                 >
                     <X className="w-5 h-5" />
                 </button>
                 <div className="flex items-center gap-3 mb-2">
                     <div className="p-2 bg-white/20 rounded-lg">
                        <Globe2 className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-bold">Оставить заявку</h3>
                 </div>
                 <p className="text-brand-100 text-sm">Заполните форму, и мы подберем идеальный университет.</p>
             </div>

             {/* Form Body */}
             <div className="p-8">
                {isSuccess ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6"
                        >
                            <CheckCircle className="w-10 h-10" />
                        </motion.div>
                        <h4 className="text-2xl font-bold text-slate-900 mb-2">Заявка принята!</h4>
                        <p className="text-slate-500">Менеджер свяжется с вами в ближайшее время.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ваше имя</label>
                            <input
                                type="text"
                                name="name"
                                required
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                                placeholder="Иван Иванов"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Телефон</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                                    placeholder="+7 (999)..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none"
                                    placeholder="example@..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Желаемая страна</label>
                            <div className="relative">
                                <select
                                    name="country"
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none appearance-none"
                                >
                                    <option value="">Не выбрано</option>
                                    {COUNTRIES.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                    <option value="other">Другое</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Комментарий</label>
                            <textarea
                                name="comment"
                                rows={3}
                                value={formData.comment}
                                onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all outline-none resize-none"
                                placeholder="Например: хочу на магистратуру..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 mt-2"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                            {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                        </button>
                        
                        <p className="text-center text-xs text-slate-400 mt-4">
                            Нажимая кнопку, вы соглашаетесь с политикой обработки данных.
                        </p>
                    </form>
                )}
             </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};