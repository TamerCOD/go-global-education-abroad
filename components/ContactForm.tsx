import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send, Loader2, CheckCircle } from 'lucide-react';
import { useData } from '../DataContext';
import { ContactFormState } from '../types';

export const ContactForm: React.FC = () => {
  const { data } = useData();
  const CONTACT_INFO = data.contactInfo;
  const COUNTRIES = data.countries;
  const [formData, setFormData] = useState<ContactFormState>({
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
      const payload = { ...formData, timestamp: new Date().toISOString(), source: 'website-form' };

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
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
      setIsSuccess(true);
      // Reset after success
      setTimeout(() => {
          setIsSuccess(false);
          setFormData({ name: '', phone: '', email: '', country: '', comment: '' });
      }, 5000);
    }
  };

  return (
    <section id="contact" className="py-24 bg-slate-900 text-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-brand-500 rounded-full blur-3xl opacity-10"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-accent-500 rounded-full blur-3xl opacity-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16">
          
          {/* Info Side */}
          <div className="mb-12 lg:mb-0">
            <h2 className="text-3xl font-extrabold mb-6">Начните свой путь сегодня</h2>
            <p className="text-slate-300 text-lg mb-10 max-w-md leading-relaxed">
              Заполните форму, и наш менеджер свяжется с вами в течение 15 минут для бесплатной консультации по подбору программы.
            </p>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-brand-400">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Телефон</div>
                  <div className="text-lg font-semibold">{CONTACT_INFO.phone}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-brand-400">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Email</div>
                  <div className="text-lg font-semibold">{CONTACT_INFO.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-brand-400">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-sm text-slate-400">Офис</div>
                  <a 
                    href={CONTACT_INFO.addressLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-lg font-semibold hover:text-brand-400 transition-colors underline decoration-dotted underline-offset-4"
                  >
                    {CONTACT_INFO.address}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Form Side */}
          <div className="bg-white rounded-2xl p-8 text-slate-900 shadow-2xl">
            {isSuccess ? (
                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
                    <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-2xl font-bold mb-2">Заявка отправлена!</h3>
                    <p className="text-slate-600">Мы свяжемся с вами в ближайшее время.</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Ваше имя</label>
                    <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="Иван Иванов"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">Телефон</label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                        placeholder="+996 (999)..."
                    />
                    </div>
                    <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                        placeholder="example@mail.com"
                    />
                    </div>
                </div>

                <div>
                    <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1">Куда хотите поступить?</label>
                    <div className="relative">
                        <select
                            id="country"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors appearance-none bg-white"
                        >
                            <option value="">Выберите страну</option>
                            {COUNTRIES.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            <option value="other">Другое / Пока не решил</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-1">Комментарий (необязательно)</label>
                    <textarea
                    id="comment"
                    name="comment"
                    rows={4}
                    value={formData.comment}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    placeholder="Например: интересует магистратура по дизайну"
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                    {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                </button>
                </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};