import React, { useEffect, useRef, useState } from 'react';
import { useData } from './DataContext';
import { DEFAULT_VISIBILITY, DEFAULT_REGIONS } from './types';

// =====================================================================
// Reusable bits
// =====================================================================

const Section: React.FC<{
    title: string;
    subtitle?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: string;
}> = ({ title, subtitle, defaultOpen = false, children, badge }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-4 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
                        {badge && <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">{badge}</span>}
                    </div>
                    {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
                </div>
                <span className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && <div className="px-5 pb-5 pt-1 border-t border-slate-100">{children}</div>}
        </div>
    );
};

const ImageInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    password: string;
    placeholder?: string;
}> = ({ value, onChange, password, placeholder }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'X-Admin-Password': password },
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            const { url } = await res.json();
            onChange(url);
        } catch (err: any) {
            alert('Ошибка загрузки: ' + (err?.message || err));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="flex gap-2 items-center">
            {value ? (
                <img src={value} alt="" className="w-12 h-12 object-cover rounded border bg-slate-100 shrink-0" />
            ) : (
                <div className="w-12 h-12 rounded border bg-slate-100 shrink-0" />
            )}
            <input
                type="text"
                className="border border-slate-300 p-2 flex-grow rounded text-sm"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? 'URL или загрузите файл'}
            />
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <button
                type="button"
                className="text-sm bg-brand-100 text-brand-700 px-3 py-2 rounded whitespace-nowrap disabled:opacity-50 hover:bg-brand-200"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
            >
                {uploading ? '⏳ ...' : '📁 Файл'}
            </button>
        </div>
    );
};

const ImageListInput: React.FC<{
    values: string[];
    onChange: (v: string[]) => void;
    password: string;
}> = ({ values, onChange, password }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingUrl, setPendingUrl] = useState('');

    const uploadFile = async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'X-Admin-Password': password },
            body: fd,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        return json.url as string;
    };

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const next = [...values];
            for (const file of files) {
                const url = await uploadFile(file);
                next.push(url);
            }
            onChange(next);
        } catch (err: any) {
            alert('Ошибка загрузки: ' + (err?.message || err));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const removeAt = (i: number) => {
        const next = [...values];
        next.splice(i, 1);
        onChange(next);
    };

    const updateAt = (i: number, v: string) => {
        const next = [...values];
        next[i] = v;
        onChange(next);
    };

    const addUrl = () => {
        const v = pendingUrl.trim();
        if (!v) return;
        onChange([...values, v]);
        setPendingUrl('');
    };

    return (
        <div className="space-y-2">
            {values.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                    <img src={url} alt="" className="w-10 h-10 object-cover rounded border bg-slate-100 shrink-0" />
                    <input
                        className="border border-slate-300 p-1 flex-grow rounded text-xs"
                        value={url}
                        onChange={e => updateAt(i, e.target.value)}
                    />
                    <button type="button" className="text-red-500 text-sm px-2" onClick={() => removeAt(i)} title="Удалить">✕</button>
                </div>
            ))}
            <div className="flex gap-2 items-center pt-1">
                <input
                    type="text"
                    placeholder="Вставить URL изображения..."
                    className="border border-slate-300 p-1 flex-grow rounded text-xs"
                    value={pendingUrl}
                    onChange={e => setPendingUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                />
                <button type="button" className="text-xs bg-slate-200 px-3 py-1 rounded hover:bg-slate-300" onClick={addUrl}>+ URL</button>
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                <button
                    type="button"
                    className="text-xs bg-brand-100 text-brand-700 px-3 py-1 rounded whitespace-nowrap disabled:opacity-50 hover:bg-brand-200"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? '⏳ Загрузка...' : '📁 Файлы'}
                </button>
            </div>
        </div>
    );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> =
    ({ checked, onChange, label, hint }) => (
        <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer accent-brand-600"
            />
            <span className="flex-1">
                <span className={`block font-medium ${checked ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
            </span>
        </label>
    );

// =====================================================================
// Analytics widget
// =====================================================================

interface AnalyticsData {
    today: number;
    last7Days: number;
    last30Days: number;
    uniqueToday: number;
    uniqueLast7: number;
    daily: { date: string; visits: number; unique: number }[];
    topPaths: { path: string; visits: number }[];
}

const AnalyticsWidget: React.FC<{ password: string }> = ({ password }) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analytics', {
                headers: { 'X-Admin-Password': password },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return <p className="text-slate-500 text-sm">Загрузка статистики...</p>;
    if (error) return <p className="text-red-500 text-sm">Ошибка: {error}</p>;
    if (!data) return null;

    const maxDaily = Math.max(1, ...data.daily.map(d => d.visits));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wide">Сегодня</div>
                    <div className="text-2xl font-bold text-brand-700">{data.today}</div>
                    <div className="text-xs text-slate-500 mt-1">{data.uniqueToday} уник.</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wide">7 дней</div>
                    <div className="text-2xl font-bold text-emerald-700">{data.last7Days}</div>
                    <div className="text-xs text-slate-500 mt-1">{data.uniqueLast7} уник.</div>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wide">30 дней</div>
                    <div className="text-2xl font-bold text-violet-700">{data.last30Days}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-center">
                    <button onClick={load} className="text-sm text-brand-600 font-medium hover:underline">↻ Обновить</button>
                </div>
            </div>

            {data.daily.length > 0 && (
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Посещения по дням (30д)</div>
                    <div className="flex items-end gap-1 h-32 bg-slate-50 rounded-lg p-2 border border-slate-200">
                        {data.daily.map(d => (
                            <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
                                <div
                                    className="w-full bg-brand-500 hover:bg-brand-600 rounded-t transition-colors"
                                    style={{ height: `${(d.visits / maxDaily) * 100}%`, minHeight: '2px' }}
                                />
                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    {d.date}: {d.visits} (уник: {d.unique})
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.topPaths.length > 0 && (
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Популярные страницы (30д)</div>
                    <div className="space-y-1">
                        {data.topPaths.map(p => (
                            <div key={p.path} className="flex justify-between text-sm py-1 border-b border-slate-100">
                                <span className="text-slate-700 font-mono text-xs">{p.path}</span>
                                <span className="text-slate-500 font-medium">{p.visits}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// =====================================================================
// Main panel
// =====================================================================

const AdminPanel: React.FC = () => {
    const { data, refresh } = useData();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [localData, setLocalData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<number | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password })
            });
            if (res.ok) {
                setIsAuthenticated(true);
                // Initialize localData with merged defaults
                setLocalData({
                    ...data,
                    siteConfig: {
                        ...data.siteConfig,
                        visibility: { ...DEFAULT_VISIBILITY, ...(data.siteConfig?.visibility || {}) },
                        regions: data.siteConfig?.regions?.length ? data.siteConfig.regions : DEFAULT_REGIONS,
                    },
                });
            } else {
                alert('Неверный пароль');
            }
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, data: localData })
            });
            if (res.ok) {
                setSavedAt(Date.now());
                refresh();
                setTimeout(() => setSavedAt(null), 3000);
            } else {
                alert('Не удалось сохранить');
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const testTelegram = async () => {
        const res = await fetch('/api/telegram/test', {
            method: 'POST',
            headers: { 'X-Admin-Password': password },
        });
        const j = await res.json().catch(() => ({}));
        alert(j.ok ? '✅ Сообщение отправлено в Telegram' : '❌ Не удалось отправить. Проверьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в Railway.');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-96">
                    <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
                    <input
                        type="password"
                        placeholder="Пароль"
                        className="w-full p-3 border border-slate-300 rounded mb-4"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium p-3 rounded">Войти</button>
                </form>
            </div>
        );
    }

    if (!localData) return null;

    const sc = localData.siteConfig || {};
    const v = sc.visibility || DEFAULT_VISIBILITY;
    const regions = sc.regions || DEFAULT_REGIONS;
    const ci = localData.contactInfo || {};

    const setSC = (patch: any) => setLocalData({ ...localData, siteConfig: { ...sc, ...patch } });
    const setCI = (patch: any) => setLocalData({ ...localData, contactInfo: { ...ci, ...patch } });
    const setVisibility = (patch: any) => setSC({ visibility: { ...v, ...patch } });

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Sticky save bar */}
            <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-slate-900">⚙️ Панель администратора</h1>
                    <div className="flex items-center gap-3">
                        {savedAt && <span className="text-sm text-emerald-600 font-medium">✓ Сохранено</span>}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-5 py-2 rounded-lg shadow-sm transition-colors"
                        >
                            {saving ? '💾 Сохранение...' : '💾 Сохранить всё'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-6">

                <Section title="📊 Статистика посещений" subtitle="Только публичный сайт (без админки)" defaultOpen>
                    <AnalyticsWidget password={password} />
                </Section>

                <Section
                    title="👁 Видимость блоков сайта"
                    subtitle="Скрытые блоки автоматически исчезают и из шапки сайта"
                    defaultOpen
                >
                    <div className="grid md:grid-cols-2 gap-1">
                        <Toggle checked={v.hero} onChange={c => setVisibility({ hero: c })} label="Hero (главный экран)" hint="Большой блок наверху страницы" />
                        <Toggle checked={v.about} onChange={c => setVisibility({ about: c })} label="О нас" hint="Раздел About с описанием компании" />
                        <Toggle checked={v.destinations} onChange={c => setVisibility({ destinations: c })} label="Направления" hint="Карта мира + список стран" />
                        <Toggle checked={v.calculator} onChange={c => setVisibility({ calculator: c })} label="Калькулятор стоимости" hint="Интерактивный CostCalculator" />
                        <Toggle checked={v.testimonials} onChange={c => setVisibility({ testimonials: c })} label="Отзывы" hint="Истории студентов" />
                        <Toggle checked={v.faq} onChange={c => setVisibility({ faq: c })} label="FAQ" hint="Частые вопросы" />
                        <Toggle checked={v.contact} onChange={c => setVisibility({ contact: c })} label="Контактная форма" hint="Форма заявки внизу страницы" />
                    </div>
                </Section>

                <Section title="📞 Контакты и WhatsApp" subtitle="Телефон, email, кнопка WhatsApp" defaultOpen={false}>
                    <div className="space-y-3">
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Телефон (отображается на сайте)</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.phone || ''}
                                onChange={e => setCI({ phone: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Email</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.email || ''}
                                onChange={e => setCI({ email: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Адрес офиса</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.address || ''}
                                onChange={e => setCI({ address: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Ссылка на 2GIS / карты</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.addressLink || ''}
                                onChange={e => setCI({ addressLink: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Instagram</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.instagram || ''}
                                onChange={e => setCI({ instagram: e.target.value })} />
                        </label>
                        <hr className="my-3" />
                        <h3 className="font-semibold text-slate-800">WhatsApp-кнопка (плавающая зелёная справа)</h3>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Номер телефона (только цифры с кодом страны)</span>
                            <input
                                className="border border-slate-300 p-2 w-full rounded font-mono"
                                placeholder="996999530092"
                                value={ci.whatsappNumber || ''}
                                onChange={e => setCI({ whatsappNumber: e.target.value.replace(/\D/g, '') })}
                            />
                            <span className="text-xs text-slate-500 block mt-1">Например: 996999530092 (без + и пробелов)</span>
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Автотекст в окно WhatsApp</span>
                            <textarea
                                className="border border-slate-300 p-2 w-full rounded"
                                rows={2}
                                placeholder="Добрый день! Пишу с сайта GoGlobal!"
                                value={ci.whatsappMessage || ''}
                                onChange={e => setCI({ whatsappMessage: e.target.value })}
                            />
                            <span className="text-xs text-slate-500 block mt-1">Подставляется в текстовое поле когда посетитель открывает виджет</span>
                        </label>
                    </div>
                </Section>

                <Section title="🎬 Loader (анимация при загрузке)" subtitle="Текст под логотипом во время заставки">
                    <label className="block text-sm">
                        <span className="block font-medium text-slate-700 mb-1">Тагалайн</span>
                        <input
                            className="border border-slate-300 p-2 w-full rounded"
                            placeholder="Образование за рубежом"
                            value={sc.loaderTagline ?? ''}
                            onChange={e => setSC({ loaderTagline: e.target.value })}
                        />
                    </label>
                </Section>

                <Section title="🖼 Изображения сайта" subtitle="Hero и About">
                    <div className="space-y-4">
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Hero — фоновая картинка</span>
                            <ImageInput value={sc.heroImage || ''} password={password}
                                onChange={v => setSC({ heroImage: v })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">About — картинка 1</span>
                            <ImageInput value={sc.aboutImage1 || ''} password={password}
                                onChange={v => setSC({ aboutImage1: v })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">About — картинка 2</span>
                            <ImageInput value={sc.aboutImage2 || ''} password={password}
                                onChange={v => setSC({ aboutImage2: v })} />
                        </label>
                    </div>
                </Section>

                <Section title="🎓 Партнёры (плашки в About)" subtitle="Список ВУЗов-партнёров">
                    {(sc.partnerUniversities || []).map((uni: any, index: number) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                            <input
                                className="border border-slate-300 p-2 flex-grow rounded"
                                placeholder="Название университета"
                                value={uni.name}
                                onChange={e => {
                                    const list = [...(sc.partnerUniversities || [])];
                                    list[index].name = e.target.value;
                                    setSC({ partnerUniversities: list });
                                }}
                            />
                            <label className="flex items-center gap-1 text-sm">
                                <input type="checkbox" checked={uni.highlighted || false}
                                    onChange={e => {
                                        const list = [...(sc.partnerUniversities || [])];
                                        list[index].highlighted = e.target.checked;
                                        setSC({ partnerUniversities: list });
                                    }} /> Highlight
                            </label>
                            <button
                                className="text-red-500 font-bold px-2"
                                onClick={() => {
                                    const list = [...(sc.partnerUniversities || [])];
                                    list.splice(index, 1);
                                    setSC({ partnerUniversities: list });
                                }}
                            >✕</button>
                        </div>
                    ))}
                    <button
                        className="text-brand-600 font-medium hover:underline mt-2"
                        onClick={() => setSC({ partnerUniversities: [...(sc.partnerUniversities || []), { name: 'Новый партнёр', highlighted: false }] })}
                    >+ Добавить партнёра</button>
                </Section>

                <Section title="🌍 Континенты / Регионы" subtitle="Группировка стран в Destinations">
                    <p className="text-xs text-slate-500 mb-3">ID региона должен совпадать с тем, что выбран у каждой страны. Совет: оставить латиницей (Asia, Europe, USA) и менять только Название.</p>
                    {regions.map((r: any, i: number) => (
                        <div key={i} className="flex gap-2 mb-2 items-center">
                            <input
                                className="border border-slate-300 p-2 rounded font-mono text-xs w-24"
                                placeholder="ID"
                                value={r.id}
                                onChange={e => {
                                    const list = [...regions];
                                    list[i] = { ...list[i], id: e.target.value };
                                    setSC({ regions: list });
                                }}
                            />
                            <input
                                className="border border-slate-300 p-2 rounded flex-grow"
                                placeholder="Отображаемое имя (например, Азия)"
                                value={r.name}
                                onChange={e => {
                                    const list = [...regions];
                                    list[i] = { ...list[i], name: e.target.value };
                                    setSC({ regions: list });
                                }}
                            />
                            <button
                                className="text-red-500 font-bold px-2"
                                onClick={() => {
                                    const list = [...regions];
                                    list.splice(i, 1);
                                    setSC({ regions: list });
                                }}
                            >✕</button>
                        </div>
                    ))}
                    <button
                        className="text-brand-600 font-medium hover:underline mt-2"
                        onClick={() => setSC({ regions: [...regions, { id: `region-${Date.now()}`, name: 'Новый регион' }] })}
                    >+ Добавить регион</button>
                </Section>

                <Section title="🌐 Страны и Университеты">
                    <button
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded mb-4 font-medium"
                        onClick={() => {
                            setLocalData({
                                ...localData,
                                countries: [...(localData.countries || []), {
                                    id: `new-${Date.now()}`,
                                    name: 'Новая страна',
                                    region: regions[0]?.id || 'Asia',
                                    description: '',
                                    image: '',
                                    costs: { tuition: { min: 0, max: 0 }, living: { min: 0, max: 0 } },
                                    coordinates: { top: '50%', left: '50%' },
                                    universities: [],
                                }],
                            });
                        }}
                    >+ Добавить страну</button>

                    {(localData.countries || []).map((country: any, cIndex: number) => (
                        <div key={country.id} className="mb-6 border border-slate-200 p-4 rounded-lg bg-slate-50">
                            <div className="flex items-start justify-between mb-3">
                                <input
                                    className="font-bold text-lg border border-slate-300 p-2 rounded flex-grow mr-3"
                                    value={country.name}
                                    onChange={e => {
                                        const list = [...localData.countries];
                                        list[cIndex].name = e.target.value;
                                        setLocalData({ ...localData, countries: list });
                                    }}
                                />
                                <button
                                    className="text-red-500 text-sm hover:underline"
                                    onClick={() => {
                                        if (confirm(`Удалить страну "${country.name}"?`)) {
                                            const list = [...localData.countries];
                                            list.splice(cIndex, 1);
                                            setLocalData({ ...localData, countries: list });
                                        }
                                    }}
                                >Удалить страну</button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3 mb-4">
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Континент / Регион</span>
                                    <select
                                        className="border border-slate-300 p-2 w-full rounded bg-white"
                                        value={country.region || ''}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].region = e.target.value;
                                            setLocalData({ ...localData, countries: list });
                                        }}
                                    >
                                        {regions.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Краткое описание</span>
                                    <input className="border border-slate-300 p-2 w-full rounded" value={country.description}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].description = e.target.value;
                                            setLocalData({ ...localData, countries: list });
                                        }}
                                    />
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Стоимость обучения min ($)</span>
                                    <input type="number" className="border border-slate-300 p-2 w-full rounded" value={country.costs.tuition.min}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].costs.tuition.min = parseInt(e.target.value) || 0;
                                            setLocalData({ ...localData, countries: list });
                                        }} />
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Стоимость жизни min ($)</span>
                                    <input type="number" className="border border-slate-300 p-2 w-full rounded" value={country.costs.living.min}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].costs.living.min = parseInt(e.target.value) || 0;
                                            setLocalData({ ...localData, countries: list });
                                        }} />
                                </label>
                                <div className="md:col-span-2 text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Картинка страны</span>
                                    <ImageInput
                                        value={country.image}
                                        password={password}
                                        onChange={v => {
                                            const list = [...localData.countries];
                                            list[cIndex].image = v;
                                            setLocalData({ ...localData, countries: list });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <h4 className="font-semibold text-sm mb-2">Университеты</h4>
                                {country.universities.map((uni: any, uIndex: number) => (
                                    <div key={uIndex} className="ml-2 mb-3 p-3 border border-slate-200 bg-white rounded">
                                        <input
                                            className="border border-slate-300 p-1 w-full font-bold mb-2 rounded"
                                            placeholder="Название университета"
                                            value={uni.name}
                                            onChange={e => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].name = e.target.value;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <textarea
                                            className="border border-slate-300 p-1 w-full text-sm mb-2 rounded"
                                            placeholder="Описание"
                                            value={uni.description}
                                            onChange={e => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].description = e.target.value;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <div className="text-xs font-medium text-slate-700 mb-1">Картинки</div>
                                        <ImageListInput
                                            values={uni.images || []}
                                            password={password}
                                            onChange={v => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].images = v;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <button
                                            className="text-red-500 text-xs mt-2 hover:underline"
                                            onClick={() => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities.splice(uIndex, 1);
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        >Удалить университет</button>
                                    </div>
                                ))}
                                <button
                                    className="text-brand-600 text-sm ml-2 hover:underline font-medium"
                                    onClick={() => {
                                        const list = [...localData.countries];
                                        list[cIndex].universities.push({ name: 'Новый университет', description: '', images: [] });
                                        setLocalData({ ...localData, countries: list });
                                    }}
                                >+ Добавить университет</button>
                            </div>
                        </div>
                    ))}
                </Section>

                <Section title="💬 Отзывы студентов">
                    <button
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded mb-4 font-medium"
                        onClick={() => {
                            setLocalData({
                                ...localData,
                                testimonials: [...(localData.testimonials || []), {
                                    id: `t-${Date.now()}`,
                                    name: 'Имя студента',
                                    countryId: localData.countries?.[0]?.id || '',
                                    university: '',
                                    quote: 'Короткая цитата',
                                    story: 'Полная история...',
                                }],
                            });
                        }}
                    >+ Добавить отзыв</button>

                    {(localData.testimonials || []).map((t: any, i: number) => (
                        <div key={t.id} className="mb-4 p-3 border border-slate-200 rounded-lg bg-slate-50 grid md:grid-cols-2 gap-2">
                            <label className="text-sm">
                                <span className="block font-medium text-slate-700 mb-1">Имя</span>
                                <input className="border border-slate-300 p-2 w-full rounded"
                                    value={t.name}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].name = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm">
                                <span className="block font-medium text-slate-700 mb-1">Страна (ID)</span>
                                <select className="border border-slate-300 p-2 w-full rounded bg-white"
                                    value={t.countryId || ''}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].countryId = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }}>
                                    <option value="">— не указано —</option>
                                    {(localData.countries || []).map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-700 mb-1">Университет</span>
                                <input className="border border-slate-300 p-2 w-full rounded"
                                    value={t.university}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].university = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-700 mb-1">Цитата (короткая)</span>
                                <input className="border border-slate-300 p-2 w-full rounded"
                                    value={t.quote}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].quote = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-700 mb-1">История (полный текст)</span>
                                <textarea className="border border-slate-300 p-2 w-full rounded" rows={3}
                                    value={t.story}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].story = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <div className="md:col-span-2 flex justify-end">
                                <button className="text-red-500 text-sm hover:underline"
                                    onClick={() => {
                                        if (!confirm(`Удалить отзыв ${t.name}?`)) return;
                                        const list = [...localData.testimonials]; list.splice(i, 1);
                                        setLocalData({ ...localData, testimonials: list });
                                    }}>Удалить отзыв</button>
                            </div>
                        </div>
                    ))}
                </Section>

                <Section title="❓ FAQ — Частые вопросы">
                    <button
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded mb-4 font-medium"
                        onClick={() => {
                            setLocalData({
                                ...localData,
                                faqs: [...(localData.faqs || []), { question: 'Новый вопрос', answer: 'Ответ' }],
                            });
                        }}
                    >+ Добавить вопрос</button>

                    {(localData.faqs || []).map((q: any, i: number) => (
                        <div key={i} className="mb-3 p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                            <input className="border border-slate-300 p-2 w-full rounded font-medium"
                                placeholder="Вопрос"
                                value={q.question}
                                onChange={e => {
                                    const list = [...localData.faqs]; list[i].question = e.target.value;
                                    setLocalData({ ...localData, faqs: list });
                                }} />
                            <textarea className="border border-slate-300 p-2 w-full rounded" rows={2}
                                placeholder="Ответ"
                                value={q.answer}
                                onChange={e => {
                                    const list = [...localData.faqs]; list[i].answer = e.target.value;
                                    setLocalData({ ...localData, faqs: list });
                                }} />
                            <button className="text-red-500 text-sm hover:underline"
                                onClick={() => {
                                    const list = [...localData.faqs]; list.splice(i, 1);
                                    setLocalData({ ...localData, faqs: list });
                                }}>Удалить</button>
                        </div>
                    ))}
                </Section>

                <Section title="🔔 Telegram-уведомления" subtitle="Бот для нотификаций о лидах (используется в CRM)">
                    <p className="text-sm text-slate-600 mb-3">
                        Чат и токен бота настраиваются через переменные окружения Railway:
                        <code className="bg-slate-100 px-1 mx-1 rounded text-xs">TELEGRAM_BOT_TOKEN</code>,
                        <code className="bg-slate-100 px-1 mx-1 rounded text-xs">TELEGRAM_CHAT_ID</code>.
                        Их можно поменять только из Railway — не из админки.
                    </p>
                    <button
                        onClick={testTelegram}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded font-medium"
                    >📤 Отправить тестовое сообщение</button>
                </Section>

                <div className="text-center text-xs text-slate-400 mt-8">
                    Не забудьте нажать «Сохранить всё» наверху после изменений.
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
