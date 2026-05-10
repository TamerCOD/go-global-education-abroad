import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../DataContext';
import { Send, Loader2, CheckCircle } from 'lucide-react';

type Source = 'whatsapp' | 'instagram' | 'email' | 'generic';

const META: Record<Source, { color: string; bg: string; emoji: string; title: string; subtitle: string }> = {
    whatsapp: {
        color: 'text-[#25D366]', bg: 'bg-[#25D366]', emoji: '💬',
        title: 'Заявка из WhatsApp',
        subtitle: 'Спасибо что нажали на ссылку из WhatsApp! Заполните анкету — менеджер свяжется в ближайшее время.',
    },
    instagram: {
        color: 'text-pink-500', bg: 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600', emoji: '📷',
        title: 'Заявка из Instagram',
        subtitle: 'Здравствуйте! Оставьте контакты и свой Instagram — поможем подобрать программу.',
    },
    email: {
        color: 'text-brand-600', bg: 'bg-brand-600', emoji: '✉',
        title: 'Заявка по почте',
        subtitle: 'Заполните форму, и мы вышлем вам подробное предложение на email.',
    },
    generic: {
        color: 'text-slate-700', bg: 'bg-slate-700', emoji: '🌐',
        title: 'Оставить заявку',
        subtitle: 'Запишитесь на бесплатную консультацию по поступлению за рубеж.',
    },
};

export const ApplyForm: React.FC = () => {
    const { data } = useData();
    const COUNTRIES = data.countries;
    const [searchParams] = useSearchParams();
    const sourceParam = (searchParams.get('source') || 'generic').toLowerCase();
    const source: Source = ['whatsapp', 'instagram', 'email'].includes(sourceParam) ? sourceParam as Source : 'generic';
    const meta = META[source];

    const initial = useMemo(() => ({
        name: searchParams.get('name') || (source === 'instagram' ? (searchParams.get('instagram') || searchParams.get('insta') || '') : ''),
        phone: source === 'whatsapp'
            ? (searchParams.get('phone') || searchParams.get('whatsapp') || '')
            : (searchParams.get('phone') || ''),
        email: source === 'email' ? (searchParams.get('email') || '') : (searchParams.get('email') || ''),
        instagram: source === 'instagram' ? (searchParams.get('instagram') || searchParams.get('insta') || '') : '',
        country: searchParams.get('country') || '',
        comment: '',
    }), [searchParams, source]);

    const [formData, setFormData] = useState(initial);
    useEffect(() => { setFormData(initial); }, [initial]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const sourceTag = `apply-${source}`;
            const namePart = source === 'instagram' && formData.instagram
                ? `${formData.name}${formData.instagram ? ` (Instagram: ${formData.instagram})` : ''}`
                : formData.name;
            const payload: any = {
                name: namePart,
                phone: formData.phone,
                email: formData.email,
                country: formData.country,
                comment: formData.comment,
                source: sourceTag,
                instagram: formData.instagram || undefined,
                timestamp: new Date().toISOString(),
            };
            const res = await fetch('/api/leads/website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.error || `HTTP ${res.status}`);
            }
            setIsSuccess(true);
        } catch (e: any) {
            setError(e?.message || 'Не удалось отправить. Попробуйте ещё раз.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10 max-w-md w-full text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Заявка отправлена!</h2>
                    <p className="text-slate-600">Менеджер GoGlobal свяжется с вами в ближайшее время.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4 flex items-start justify-center">
            <div className="w-full max-w-lg">
                {/* Branded header */}
                <div className="bg-white rounded-t-3xl border border-slate-200 border-b-0 p-6 flex items-center gap-3 shadow-sm">
                    <img src="/ppp.png" alt="GoGlobal" className="h-10 w-auto" />
                    <div>
                        <div className="text-xl font-bold text-slate-900">GoGlobal</div>
                        <div className="text-xs text-slate-500">образование за рубежом</div>
                    </div>
                    <div className="ml-auto flex items-center gap-1 text-2xl">{meta.emoji}</div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-b-3xl border border-slate-200 p-6 shadow-md space-y-4">
                    <div className="pb-2">
                        <h1 className={`text-xl font-bold ${meta.color}`}>{meta.title}</h1>
                        <p className="text-sm text-slate-600 mt-1">{meta.subtitle}</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>
                    )}

                    {/* Name (or Instagram for IG source) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            {source === 'instagram' ? 'Ваше имя' : 'Ваше имя'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text" name="name" required
                            value={formData.name} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                            placeholder="Иван Иванов"
                        />
                    </div>

                    {source === 'instagram' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ваш Instagram</label>
                            <input
                                type="text" name="instagram"
                                value={formData.instagram} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                                placeholder="@username или ссылка на профиль"
                            />
                            <p className="text-xs text-slate-500 mt-1">Чтобы менеджер мог ответить вам в Instagram</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Телефон{source === 'whatsapp' && ' (WhatsApp)'} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel" name="phone" required={source !== 'instagram' && source !== 'email'}
                                value={formData.phone} onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:ring-2 transition-colors ${source === 'whatsapp' ? 'border-[#25D366] focus:ring-[#25D366] focus:border-[#25D366]' : 'border-slate-300 focus:ring-brand-500 focus:border-brand-500'}`}
                                placeholder="+996 (999)..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email{source === 'email' && ' *'}
                            </label>
                            <input
                                type="email" name="email" required={source === 'email'}
                                value={formData.email} onChange={handleChange}
                                className={`w-full px-4 py-3 rounded-xl border bg-slate-50 focus:bg-white focus:ring-2 transition-colors ${source === 'email' ? 'border-brand-500 focus:ring-brand-500 focus:border-brand-500' : 'border-slate-300 focus:ring-brand-500 focus:border-brand-500'}`}
                                placeholder="example@mail.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Куда хотите поступить?</label>
                        <select
                            name="country" value={formData.country} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                        >
                            <option value="">Не определился</option>
                            {COUNTRIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            <option value="Другое">Другое</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Комментарий</label>
                        <textarea
                            name="comment" rows={3}
                            value={formData.comment} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                            placeholder="Например: интересует магистратура по дизайну"
                        />
                    </div>

                    <button
                        type="submit" disabled={isSubmitting}
                        className={`w-full text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${meta.bg}`}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                        {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                    </button>

                    <p className="text-xs text-center text-slate-400 pt-2">
                        Нажимая «Отправить», вы соглашаетесь с обработкой персональных данных
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ApplyForm;
