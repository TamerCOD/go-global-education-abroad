import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../DataContext';
import { Send, Loader2, CheckCircle, Calendar } from 'lucide-react';

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

const STUDY_LEVELS = ['Бакалавриат', 'Магистратура', 'PhD / докторантура', 'Foundation / подготовка', 'Языковые курсы', 'Среднее образование'];
const INTAKE_TERMS = ['Осень 2026', 'Весна 2027', 'Осень 2027', 'Не определился'];
const ENGLISH_LEVELS = ['A1 / Beginner', 'A2 / Elementary', 'B1 / Intermediate', 'B2 / Upper-Intermediate', 'C1 / Advanced', 'C2 / Proficient', 'IELTS', 'TOEFL'];
const BUDGETS = ['до $5k / год', '$5k–$15k / год', '$15k–$30k / год', '$30k+ / год', 'Бесплатно (грант/стипендия)', 'Без ограничений'];

interface EventInfo {
    id: number;
    slug: string;
    name: string;
    description?: string;
}

const UniversitySearch: React.FC<{
    value: string;
    onChange: (v: string) => void;
}> = ({ value, onChange }) => {
    const { data } = useData();
    const regions = data.siteConfig?.regions || [{ id: 'Asia', name: 'Азия' }, { id: 'Europe', name: 'Европа' }, { id: 'USA', name: 'США' }];
    const regionMap = Object.fromEntries(regions.map(r => [r.id, r.name]));
    const [filterRegion, setFilterRegion] = useState<string>('');
    const [filterCountry, setFilterCountry] = useState<string>('');
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);

    const allUnis = useMemo(() => {
        const list: { name: string; country: string; region: string }[] = [];
        for (const c of data.countries || []) {
            for (const u of (c.universities || [])) {
                list.push({ name: u.name, country: c.name, region: c.region });
            }
        }
        return list;
    }, [data.countries]);

    const countries = useMemo(() => {
        const set = new Set<string>();
        for (const c of data.countries || []) {
            if (!filterRegion || c.region === filterRegion) set.add(c.name);
        }
        return Array.from(set).sort();
    }, [data.countries, filterRegion]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return allUnis.filter(u => {
            if (filterRegion && u.region !== filterRegion) return false;
            if (filterCountry && u.country !== filterCountry) return false;
            if (q && !u.name.toLowerCase().includes(q) && !u.country.toLowerCase().includes(q)) return false;
            return true;
        }).slice(0, 50);
    }, [allUnis, filterRegion, filterCountry, search]);

    return (
        <div>
            <input type="text"
                value={value} onChange={e => { onChange(e.target.value); setSearch(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors"
                placeholder="Начните вводить или выберите ниже"
            />
            {open && (
                <div className="border border-slate-200 rounded-xl bg-white shadow-md mt-1 max-h-80 overflow-hidden flex flex-col">
                    <div className="flex gap-1 p-2 border-b border-slate-200 bg-slate-50">
                        <select className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                            value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setFilterCountry(''); }}>
                            <option value="">Все континенты</option>
                            {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <select className="text-xs border border-slate-300 rounded px-2 py-1 bg-white flex-grow"
                            value={filterCountry} onChange={e => setFilterCountry(e.target.value)}>
                            <option value="">Все страны</option>
                            {countries.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="overflow-y-auto flex-grow">
                        {filtered.length === 0 ? (
                            <div className="p-3 text-sm text-slate-400">Ничего не найдено · можно ввести вручную</div>
                        ) : (
                            filtered.map((u, i) => (
                                <button key={i} type="button"
                                    onMouseDown={e => { e.preventDefault(); onChange(u.name); setOpen(false); }}
                                    className="w-full text-left px-3 py-2 hover:bg-slate-100 border-b border-slate-100 last:border-0">
                                    <div className="text-sm font-medium">{u.name}</div>
                                    <div className="text-xs text-slate-500">{u.country} · {regionMap[u.region] || u.region}</div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const ApplyForm: React.FC = () => {
    const { data } = useData();
    const COUNTRIES = data.countries;
    const sources: string[] = (data.siteConfig as any)?.attributionOptions || DEFAULT_SOURCES;
    const [searchParams] = useSearchParams();
    const eventSlug = searchParams.get('event') || '';

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', country: '', comment: '', source: '',
        desired_university: '', study_level: '', intake_term: '', budget: '',
        english_level: '', birth_year: '', current_education: '',
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [event, setEvent] = useState<EventInfo | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!eventSlug) return;
        fetch(`/api/events/${encodeURIComponent(eventSlug)}`)
            .then(r => r.ok ? r.json() : null)
            .then(j => { if (j?.event) setEvent(j.event); })
            .catch(() => {});
    }, [eventSlug]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const setField = (k: string, v: string) => setFormData(prev => ({ ...prev, [k]: v }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.source) {
            setError('Выберите, откуда вы о нас узнали');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const payload: any = {
                ...formData,
                event_slug: eventSlug || undefined,
                birth_year: formData.birth_year ? Number(formData.birth_year) : undefined,
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-10 max-w-md w-full text-center">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Заявка отправлена!</h2>
                    {event && <p className="text-sm text-brand-600 font-medium mb-2">🎟 {event.name}</p>}
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
                    <div className="flex-grow">
                        <div className="text-xl font-bold text-slate-900">GoGlobal</div>
                        <div className="text-xs text-slate-500">образование за рубежом</div>
                    </div>
                </div>

                {event && (
                    <div className="bg-gradient-to-r from-violet-100 via-fuchsia-100 to-pink-100 border-l border-r border-slate-200 p-4 flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-violet-700 mt-0.5" />
                        <div className="flex-grow">
                            <div className="text-xs uppercase tracking-wider font-bold text-violet-700">Регистрация на событие</div>
                            <div className="text-lg font-bold text-slate-900">{event.name}</div>
                            {event.description && <p className="text-sm text-slate-600 mt-1">{event.description}</p>}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white rounded-b-3xl border border-slate-200 p-6 shadow-md space-y-4">
                    <div className="pb-2">
                        <h1 className="text-2xl font-bold text-slate-900">{event ? 'Заполните анкету' : 'Оставить заявку'}</h1>
                        <p className="text-sm text-slate-600 mt-1">Менеджер свяжется в течение 15 минут (в рабочее время).</p>
                    </div>

                    {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ваше имя <span className="text-red-500">*</span></label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors"
                            placeholder="Иван Иванов" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Телефон <span className="text-red-500">*</span></label>
                            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors"
                                placeholder="+996 (999) ..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange}
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors"
                                placeholder="example@mail.com" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Страна для обучения</label>
                        <select name="country" value={formData.country} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors">
                            <option value="">Не определился</option>
                            {COUNTRIES.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            <option value="Другое">Другое</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Желаемый университет</label>
                        <UniversitySearch
                            value={formData.desired_university}
                            onChange={v => setField('desired_university', v)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Откуда вы о нас узнали? <span className="text-red-500">*</span></label>
                        <select name="source" required value={formData.source} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors">
                            <option value="">— выберите —</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-sm text-brand-600 hover:underline font-medium">
                        {showAdvanced ? '▴ Скрыть' : '▾ Дополнительные поля (необязательно)'}
                    </button>

                    {showAdvanced && (
                        <div className="space-y-4 border-t border-slate-200 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Уровень программы</label>
                                    <select name="study_level" value={formData.study_level} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors">
                                        <option value="">— не указано —</option>
                                        {STUDY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Когда планируете поступить?</label>
                                    <select name="intake_term" value={formData.intake_term} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors">
                                        <option value="">— не указано —</option>
                                        {INTAKE_TERMS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Бюджет</label>
                                    <select name="budget" value={formData.budget} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors">
                                        <option value="">— не указано —</option>
                                        {BUDGETS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Уровень английского</label>
                                    <select name="english_level" value={formData.english_level} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors">
                                        <option value="">— не указано —</option>
                                        {ENGLISH_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Год рождения</label>
                                    <input type="number" name="birth_year" min={1980} max={2020} value={formData.birth_year} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors"
                                        placeholder="2005" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Текущее образование</label>
                                    <input type="text" name="current_education" value={formData.current_education} onChange={handleChange}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors"
                                        placeholder="11 класс / 1 курс / окончил вуз" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Комментарий</label>
                        <textarea name="comment" rows={3} value={formData.comment} onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-brand-500 transition-colors"
                            placeholder="Например: интересует магистратура по дизайну" />
                    </div>

                    <button type="submit" disabled={isSubmitting}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
                        {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                    </button>

                    <p className="text-xs text-center text-slate-400 pt-2">Нажимая «Отправить», вы соглашаетесь с обработкой персональных данных</p>
                </form>
            </div>
        </div>
    );
};

export default ApplyForm;
