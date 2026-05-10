import React from 'react';
import { Instagram, Phone, Mail, MapPin, Clock } from 'lucide-react';
import { useData } from '../DataContext';

const DEFAULT_SCHEDULE = [
  { day: 'Пн–Пт', hours: '09:00 – 18:00' },
  { day: 'Сб', hours: '10:00 – 15:00' },
  { day: 'Вс', hours: 'Выходной' },
];

export const Footer: React.FC = () => {
  const { data } = useData();
  const CONTACT_INFO = data.contactInfo;
  const schedule = (data.siteConfig as any)?.workSchedule || DEFAULT_SCHEDULE;

  return (
    <footer className="bg-slate-900 text-slate-400 pt-16 pb-8 border-t border-slate-800 relative z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10 pb-10 border-b border-slate-800">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/ppp.png" alt="Go Global" className="h-8 w-auto object-contain" />
              <span
                className="text-white text-2xl"
                style={{ fontFamily: "'Montserrat', system-ui, sans-serif", fontWeight: 700, letterSpacing: '-0.02em' }}
              >
                Go Global
              </span>
            </div>
            <p className="text-sm leading-relaxed">
              Помогаем поступить в лучшие университеты мира. Образование, которое меняет жизни.
            </p>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-4">Контакты</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-0.5 text-brand-400 flex-shrink-0" />
                <a href={`tel:${(CONTACT_INFO.phone || '').replace(/[^\d+]/g, '')}`} className="hover:text-white transition-colors">
                  {CONTACT_INFO.phone}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-0.5 text-brand-400 flex-shrink-0" />
                <a href={`mailto:${CONTACT_INFO.email}`} className="hover:text-white transition-colors break-all">
                  {CONTACT_INFO.email}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-brand-400 flex-shrink-0" />
                <a
                  href={CONTACT_INFO.addressLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  {CONTACT_INFO.address}
                </a>
              </li>
            </ul>
          </div>

          {/* Schedule */}
          <div>
            <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> График работы
            </h3>
            <ul className="space-y-2 text-sm">
              {schedule.map((s: any, i: number) => (
                <li key={i} className="flex justify-between gap-3 py-1 border-b border-slate-800/60 last:border-0">
                  <span className="font-medium text-slate-300">{s.day}</span>
                  <span className={s.hours.toLowerCase().includes('выход') ? 'text-slate-500 italic' : 'text-white'}>
                    {s.hours}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="text-white font-bold uppercase tracking-wider text-xs mb-4">Соцсети</h3>
            <div className="flex flex-col gap-3 text-sm">
              {CONTACT_INFO.instagram && (
                <a
                  href={CONTACT_INFO.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <Instagram className="w-5 h-5" />
                  <span className="font-medium">Instagram</span>
                </a>
              )}
              {(CONTACT_INFO as any).whatsappNumber && (
                <a
                  href={`https://wa.me/${(CONTACT_INFO as any).whatsappNumber.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-2"
                >
                  <span className="w-5 h-5 inline-flex items-center justify-center text-[#25D366]">💬</span>
                  <span className="font-medium">WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} Go Global Education. Все права защищены.</div>
          <div className="font-mono">goglobal.su</div>
        </div>
      </div>
    </footer>
  );
};
