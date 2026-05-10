import React, { useState } from 'react';
import { useData } from '../DataContext';
import { Send, Loader2, CheckCircle } from 'lucide-react';

const DEFAULT_SOURCES = [
    'Сайт',
    'Instagram',
    'WhatsApp',
    'Email',
    'Друзья / знакомые',
    'Реклама',
    'Поиск Google',
    'Другое',
];

export const ApplyForm: React.FC = () => {
    const { data } = useData();
    const COUNTRIES = data.countries;
    const sources: string[] = (data.siteConfig as any)?.attributionOptions || DEFAULT_SOURCES;

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', country: '', comment: '', source: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.source) {
            setError('Выберите, откуда вы о нас узнали');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/leads/website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, timestamp: new Date().toISOString() }),
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
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
                <div className="bg-white rounded-t-3xl border border-slate-200 border-b-0 p-6 flex items-center gap-3 shadow-sm">
                    <img src="/ppp.png" alt="GoGlobal" className="h-10 w-auto" />
                    <div>
                        <div className="text-xl font-bold text-slate-900">GoGlobal</div>
                        <div className="text-xs text-slate-500">образование за рубежом</div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white rounded-b-3xl border border-slate-200 p-6 shadow-md space-y-4">
                    <div className="pb-2">
                        <h1 className="text-2xl font-bold text-slate-900">Оставить заявку</h1>
                        <p className="text-sm text-slate-600 mt-1">Заполните форму — менеджер свяжется в течение 15 минут (в рабочее время).</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Ваше имя <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text" name="name" required
                            value={formData.name} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                            placeholder="Иван Иванов"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Телефон <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel" name="phone" required
                                value={formData.phone} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                                placeholder="+996 (999) ..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email" name="email"
                                value={formData.email} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
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

                    {/* The new attribution dropdown — required */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Откуда вы о нас узнали? <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="source" required
                            value={formData.source} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                        >
                            <option value="">— выберите —</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
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
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
